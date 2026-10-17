import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateBindingDto,
  CreateExchangeDto,
  CreateQueueDto,
  ReprocesarMensajeMuertoDto,
} from './admin.dto';

async function errores<T extends object>(
  tipo: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const instancia = plainToInstance(tipo, payload);
  const resultado = await validate(instancia, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  return resultado.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
}

describe('DTOs de administración', () => {
  describe('CreateQueueDto', () => {
    it('acepta un nombre válido', async () => {
      await expect(
        errores(CreateQueueDto, { nombre: 'mi.cola-1' }),
      ).resolves.toHaveLength(0);
    });

    it('rechaza un nombre vacío', async () => {
      const fallos = await errores(CreateQueueDto, { nombre: '' });
      expect(fallos.length).toBeGreaterThan(0);
    });

    it('rechaza un nombre con caracteres inválidos', async () => {
      const fallos = await errores(CreateQueueDto, { nombre: 'cola con espacios' });
      expect(fallos.length).toBeGreaterThan(0);
    });

    it('rechaza un overflow desconocido', async () => {
      const fallos = await errores(CreateQueueDto, {
        nombre: 'cola',
        overflow: 'explotar',
      });
      expect(fallos.length).toBeGreaterThan(0);
    });
  });

  describe('CreateExchangeDto', () => {
    it('acepta un tipo válido', async () => {
      await expect(
        errores(CreateExchangeDto, { nombre: 'ex', tipo: 'topic' }),
      ).resolves.toHaveLength(0);
    });

    it('rechaza un tipo inválido', async () => {
      const fallos = await errores(CreateExchangeDto, {
        nombre: 'ex',
        tipo: 'cuadrático',
      });
      expect(fallos.length).toBeGreaterThan(0);
    });
  });

  describe('CreateBindingDto', () => {
    it('exige exchange, cola y routingKey', async () => {
      const fallos = await errores(CreateBindingDto, { exchange: 'ex' });
      expect(fallos.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ReprocesarMensajeMuertoDto', () => {
    it('acepta un cuerpo vacío', async () => {
      await expect(
        errores(ReprocesarMensajeMuertoDto, {}),
      ).resolves.toHaveLength(0);
    });

    it('acepta un payloadCorregido objeto', async () => {
      await expect(
        errores(ReprocesarMensajeMuertoDto, {
          payloadCorregido: { usuarioSub: 'u-1' },
        }),
      ).resolves.toHaveLength(0);
    });

    it('rechaza un payloadCorregido que no es objeto', async () => {
      const fallos = await errores(ReprocesarMensajeMuertoDto, {
        payloadCorregido: 'texto',
      });
      expect(fallos.length).toBeGreaterThan(0);
    });
  });
});
