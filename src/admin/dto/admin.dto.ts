import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
export const MAX_NAME_LENGTH = 255;

export class CreateQueueDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la cola es obligatorio' })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `El nombre no puede superar ${MAX_NAME_LENGTH} caracteres`,
  })
  @Matches(NAME_PATTERN, {
    message:
      'El nombre solo admite letras, números, punto, guión y guión bajo',
  })
  nombre: string;

  @IsOptional()
  @IsBoolean({ message: 'durable debe ser booleano' })
  durable?: boolean = true;

  @IsOptional()
  @IsIn(['classic', 'quorum'], {
    message: 'El tipo de cola debe ser classic o quorum',
  })
  tipo?: string;

  @IsOptional()
  @IsString()
  deadLetterExchange?: string;

  @IsOptional()
  @IsString()
  deadLetterRoutingKey?: string;

  @IsOptional()
  @IsInt({ message: 'maxLength debe ser un entero' })
  @Min(1, { message: 'maxLength debe ser mayor que 0' })
  maxLength?: number;

  @IsOptional()
  @IsInt({ message: 'messageTtl debe ser un entero' })
  @Min(1, { message: 'messageTtl debe ser mayor que 0' })
  messageTtl?: number;

  @IsOptional()
  @IsIn(['drop-head', 'reject-publish', 'reject-publish-dlx'], {
    message: 'overflow inválido',
  })
  overflow?: string;
}

export class CreateExchangeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del exchange es obligatorio' })
  @MaxLength(MAX_NAME_LENGTH)
  @Matches(NAME_PATTERN, {
    message:
      'El nombre solo admite letras, números, punto, guión y guión bajo',
  })
  nombre: string;

  @IsIn(['direct', 'topic', 'fanout', 'headers'], {
    message: 'El tipo debe ser direct, topic, fanout o headers',
  })
  tipo: string;

  @IsOptional()
  @IsBoolean({ message: 'durable debe ser booleano' })
  durable?: boolean = true;
}

export class CreateBindingDto {
  @IsString()
  @IsNotEmpty({ message: 'El exchange es obligatorio' })
  exchange: string;

  @IsString()
  @IsNotEmpty({ message: 'La cola es obligatoria' })
  cola: string;

  @IsString()
  @IsNotEmpty({ message: 'La routing key es obligatoria' })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `La routing key no puede superar ${MAX_NAME_LENGTH} caracteres`,
  })
  routingKey: string;
}

export class ReprocesarMensajeMuertoDto {
  @IsOptional()
  @IsObject({ message: 'payloadCorregido debe ser un objeto JSON' })
  payloadCorregido?: Record<string, unknown>;
}
