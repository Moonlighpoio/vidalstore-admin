import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import { randomUUID } from 'node:crypto';
import {
  EXCHANGES,
  EXCHANGE_TYPES,
  EVENTO_CONTENT_TYPE,
  HEADERS,
  ROUTING_KEYS,
} from '../mensajeria/topologia';
import {
  CreateBindingDto,
  CreateExchangeDto,
  CreateQueueDto,
} from './dto/admin.dto';

type AmqpConnection = Awaited<ReturnType<typeof connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

export interface ColaResumen {
  nombre: string;
  mensajes: number;
  mensajesListos: number;
  consumidores: number;
}

export interface ExchangeResumen {
  nombre: string;
  tipo: string;
  durable: boolean;
}

@Injectable()
export class RabbitAdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitAdminService.name);
  private connection?: AmqpConnection;
  private channel?: AmqpChannel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.getChannel();
    } catch (error) {
      this.logger.error(
        `No se pudo conectar a RabbitMQ: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore
    }
  }

  private get url(): string {
    return this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );
  }

  private get vhost(): string {
    return this.configService.get<string>('RABBITMQ_VHOST', '/');
  }

  private async getChannel(): Promise<AmqpChannel> {
    if (!this.channel) {
      this.connection = await connect(this.url);
      this.channel = await this.connection.createChannel();
    }

    return this.channel;
  }

  async listarColas(): Promise<ColaResumen[]> {
    const colas = await this.management<Array<Record<string, any>>>(
      `queues/${encodeURIComponent(this.vhost)}`,
    );

    return colas.map((cola) => ({
      nombre: cola.name,
      mensajes: cola.messages ?? 0,
      mensajesListos: cola.messages_ready ?? 0,
      consumidores: cola.consumers ?? 0,
    }));
  }

  async crearCola(dto: CreateQueueDto): Promise<{ nombre: string; creada: boolean }> {
    const channel = await this.getChannel();
    const argumentos = this.buildQueueArguments(dto);

    await channel.assertQueue(dto.nombre, {
      durable: dto.durable ?? true,
      arguments: Object.keys(argumentos).length > 0 ? argumentos : undefined,
    });

    return { nombre: dto.nombre, creada: true };
  }

  async eliminarCola(nombre: string): Promise<void> {
    const channel = await this.getChannel();
    await channel.deleteQueue(nombre);
  }

  async listarExchanges(): Promise<ExchangeResumen[]> {
    const exchanges = await this.management<Array<Record<string, any>>>(
      `exchanges/${encodeURIComponent(this.vhost)}`,
    );

    return exchanges.map((exchange) => ({
      nombre: exchange.name,
      tipo: exchange.type,
      durable: exchange.durable,
    }));
  }

  async crearExchange(dto: CreateExchangeDto): Promise<{ nombre: string; creado: boolean }> {
    const channel = await this.getChannel();
    await channel.assertExchange(dto.nombre, dto.tipo, {
      durable: dto.durable ?? true,
    });

    return { nombre: dto.nombre, creado: true };
  }

  async eliminarExchange(nombre: string): Promise<void> {
    const channel = await this.getChannel();
    await channel.deleteExchange(nombre);
  }

  async crearBinding(dto: CreateBindingDto): Promise<{ creado: boolean }> {
    const channel = await this.getChannel();
    await channel.bindQueue(dto.cola, dto.exchange, dto.routingKey);
    return { creado: true };
  }

  async eliminarBinding(dto: CreateBindingDto): Promise<void> {
    const channel = await this.getChannel();
    await channel.unbindQueue(dto.cola, dto.exchange, dto.routingKey);
  }

  async reprocesarMensajeMuerto(
    mensajeMuertoId: string,
    solicitadoPor: string,
    payloadCorregido?: Record<string, unknown>,
  ): Promise<{ mensajeMuertoId: string; solicitadoPor: string }> {
    const channel = await this.getChannel();

    await channel.assertExchange(EXCHANGES.comandos, EXCHANGE_TYPES.comandos, {
      durable: true,
    });

    const comando: Record<string, unknown> = {
      mensajeMuertoId,
      solicitadoPor,
    };

    if (payloadCorregido !== undefined) {
      comando.payloadCorregido = payloadCorregido;
    }

    channel.publish(
      EXCHANGES.comandos,
      ROUTING_KEYS.dlqReprocesar,
      Buffer.from(JSON.stringify(comando)),
      {
        persistent: true,
        contentType: EVENTO_CONTENT_TYPE,
        headers: {
          [HEADERS.eventoId]: randomUUID(),
          [HEADERS.emitidoEn]: new Date().toISOString(),
        },
      },
    );

    this.logger.log(
      `Comando dlq.reprocesar publicado para ${mensajeMuertoId} por ${solicitadoPor}`,
    );

    return { mensajeMuertoId, solicitadoPor };
  }

  private buildQueueArguments(dto: CreateQueueDto): Record<string, unknown> {
    const argumentos: Record<string, unknown> = {};

    if (dto.tipo) {
      argumentos['x-queue-type'] = dto.tipo;
    }

    if (dto.deadLetterExchange) {
      argumentos['x-dead-letter-exchange'] = dto.deadLetterExchange;
    }

    if (dto.deadLetterRoutingKey) {
      argumentos['x-dead-letter-routing-key'] = dto.deadLetterRoutingKey;
    }

    if (dto.maxLength !== undefined) {
      argumentos['x-max-length'] = dto.maxLength;
    }

    if (dto.messageTtl !== undefined) {
      argumentos['x-message-ttl'] = dto.messageTtl;
    }

    if (dto.overflow) {
      argumentos['x-overflow'] = dto.overflow;
    }

    return argumentos;
  }

  private async management<T>(path: string): Promise<T> {
    const base = this.configService.get<string>(
      'RABBITMQ_MANAGEMENT_URL',
      'http://localhost:15672',
    );
    const user = this.configService.get<string>(
      'RABBITMQ_MANAGEMENT_USER',
      'guest',
    );
    const password = this.configService.get<string>(
      'RABBITMQ_MANAGEMENT_PASSWORD',
      'guest',
    );

    const response = await fetch(`${base}/api/${path}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
      },
    });

    if (response.status === 404) {
      throw new NotFoundException('Recurso no encontrado en el broker');
    }

    if (!response.ok) {
      throw new BadRequestException(
        `La API de administración respondió ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }
}
