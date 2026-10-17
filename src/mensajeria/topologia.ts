export const EXCHANGES = {
  eventos: 'vidalstore.eventos',
  comandos: 'vidalstore.comandos',
  dlx: 'vidalstore.dlx',
} as const;

export const EXCHANGE_TYPES = {
  eventos: 'topic',
  comandos: 'direct',
  dlx: 'direct',
} as const;

export const ROUTING_KEYS = {
  compraRealizada: 'compra.realizada',
  licenciaRevocada: 'licencia.revocada',
  juegoPublicado: 'juego.publicado',
  correoEnviar: 'correo.enviar',
  dlqReprocesar: 'dlq.reprocesar',
} as const;

export const HEADERS = {
  eventoId: 'x-evento-id',
  emitidoEn: 'x-emitido-en',
} as const;

export const EVENTO_CONTENT_TYPE = 'application/json';
