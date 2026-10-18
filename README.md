# vidalstore-admin

API de administración del broker RabbitMQ para el caso EP2 **VidalStore**
(DSY1107). Proyecto NestJS aparte, en el puerto **3020**.

No va detrás del gateway: no tiene frontend, se llama directo desde la línea de
comandos o un cliente REST, y por eso **valida el token él mismo** (firma contra
el JWKS, emisor, vigencia, tipo de token y app client) antes de mirar el grupo.
Todas las rutas exigen el grupo `administradores`, incluidas las dos `GET`.

## Rutas

| Método y ruta                        | Qué hace                                            | Cuerpo |
| ------------------------------------ | --------------------------------------------------- | ------ |
| `GET /v1/admin/colas`                | Lista las colas con su cantidad de mensajes y consumidores | — |
| `POST /v1/admin/colas`               | Crea una cola                                       | `{ nombre, durable }` y opcionales: `tipo` (`classic`/`quorum`), `deadLetterExchange`, `deadLetterRoutingKey`, `maxLength`, `messageTtl`, `overflow` |
| `DELETE /v1/admin/colas/:nombre`     | Elimina una cola                                    | — |
| `GET /v1/admin/exchanges`            | Lista los exchanges con su tipo                     | — |
| `POST /v1/admin/exchanges`           | Crea un exchange                                    | `{ nombre, tipo, durable }` |
| `DELETE /v1/admin/exchanges/:nombre` | Elimina un exchange                                 | — |
| `POST /v1/admin/bindings`            | Crea un binding entre un exchange y una cola        | `{ exchange, cola, routingKey }` |
| `DELETE /v1/admin/bindings`          | Elimina un binding                                  | `{ exchange, cola, routingKey }` |
| `POST /v1/admin/dlq/:id/reproceso`   | Republica un mensaje muerto (punto 4.9, grupos de 3) | `{ payloadCorregido? }` |

Las ocho rutas del punto 4.5 administran tres recursos —colas, exchanges y
bindings—. La novena es el reproceso del punto 4.9: `:id` es la fila de
`mensajes_muertos`; el servicio publica `dlq.reprocesar` en
`vidalstore.comandos` con `{ mensajeMuertoId, payloadCorregido?, solicitadoPor }`,
donde `solicitadoPor` es el `sub` del token. El administrador **no** toca la
tabla, que es de `vidalstore-eventos`.

## El servicio

Toda la lógica vive en una sola clase, `RabbitAdminService`. Los controladores
reciben la petición, validan y delegan: no conocen `amqplib` ni la API HTTP del
broker.

- **Escrituras y publicación**: canal AMQP de `amqplib` (assert/delete de colas
  y exchanges, bind/unbind, publish del comando).
- **Listados**: API HTTP de administración del broker en el 15672, porque por
  AMQP no se listan colas.

## Validación

Cada ruta con cuerpo recibe un DTO con `class-validator` y el `ValidationPipe`
global va con `whitelist: true` y `forbidNonWhitelisted: true`: la primera
descarta lo que no está en el DTO y la segunda rechaza con `400` si venía. Los
errores responden `400` con un mensaje que dice qué campo está mal.

## Variables de entorno

Ver `.env.example`: `RABBITMQ_URL`, `RABBITMQ_MANAGEMENT_URL`,
`RABBITMQ_MANAGEMENT_USER`, `RABBITMQ_MANAGEMENT_PASSWORD`, `RABBITMQ_VHOST` y
la configuración de Cognito (`COGNITO_*`).
