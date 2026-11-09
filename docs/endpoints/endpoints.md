# API Restaurant: referencia para frontend y mobile

Todos los endpoints que pueden usar la web y la app móvil (**214**), con sus parámetros, bodies, respuestas, modelos y códigos de error.

> Generado desde el código (OpenAPI + errores del dominio) con `npm run docs:api`. No lo edites a mano: regenéralo cuando cambie la API. Swagger interactivo en `/docs`.

| Acceso | Endpoints |
| --- | --- |
| Públicos (o de comensal con login opcional) | 23 |
| Solo sesión | 16 |
| Miembro de la organización/sede (con o sin permiso) | 156 |
| Administración de la plataforma | 19 |

## Índice

- [1. Lo básico](#1-lo-básico)
- [2. App del comensal](#2-app-del-comensal)
  - [Autenticación del comensal](#autenticación-del-comensal) (6)
  - [Perfil del comensal](#perfil-del-comensal) (4)
  - [Sedes y carta](#sedes-y-carta) (5)
  - [QR de la mesa](#qr-de-la-mesa) (1)
  - [Carrito (pedidos para llevar o delivery)](#carrito-pedidos-para-llevar-o-delivery) (1)
  - [Pedidos en la mesa](#pedidos-en-la-mesa) (6)
- [3. Panel del restaurante (dueño y personal)](#3-panel-del-restaurante-dueño-y-personal)
  - [Autenticación del dueño y del personal](#autenticación-del-dueño-y-del-personal) (6)
  - [Mi cuenta y mis accesos](#mi-cuenta-y-mis-accesos) (4)
  - [Organizaciones](#organizaciones) (5)
  - [Sedes](#sedes) (5)
  - [Pisos](#pisos) (5)
  - [Mesas y QR](#mesas-y-qr) (7)
  - [Plano del salón](#plano-del-salón) (1)
  - [Empleados](#empleados) (5)
  - [Áreas de trabajo](#áreas-de-trabajo) (5)
  - [Puestos](#puestos) (5)
  - [Usuarios](#usuarios) (5)
  - [Usuarios de la organización (membresías)](#usuarios-de-la-organización-membresías) (5)
  - [Roles](#roles) (8)
  - [Permisos](#permisos) (5)
  - [Categorías de productos](#categorías-de-productos) (5)
  - [Productos](#productos) (12)
  - [Menús](#menús) (15)
  - [Estados y tipos de servicio](#estados-y-tipos-de-servicio) (9)
  - [Atenciones (mesas y pedidos)](#atenciones-mesas-y-pedidos) (12)
  - [Platos (cocina)](#platos-cocina) (5)
  - [Pagos](#pagos) (6)
  - [Unidades y tipos de movimiento](#unidades-y-tipos-de-movimiento) (2)
  - [Categorías de insumos](#categorías-de-insumos) (5)
  - [Insumos](#insumos) (5)
  - [Stock por sede](#stock-por-sede) (8)
  - [Movimientos de inventario](#movimientos-de-inventario) (3)
  - [Recetas](#recetas) (3)
  - [Categorías de gastos](#categorías-de-gastos) (5)
  - [Gastos](#gastos) (5)
  - [Cierres del día](#cierres-del-día) (5)
  - [Reportes](#reportes) (3)
  - [Imágenes](#imágenes) (1)
- [4. Administración de la plataforma](#4-administración-de-la-plataforma)
  - [Catálogos de pagos](#catálogos-de-pagos) (7)
  - [Catálogos de inventario](#catálogos-de-inventario) (2)
  - [Errores registrados](#errores-registrados) (2)
- [5. Códigos de error](#5-códigos-de-error)
- [6. Modelos](#6-modelos)

## 1. Lo básico

### URL base

| Ambiente | URL |
| --- | --- |
| Local (`npm run start:dev`) | `http://localhost:3000` |
| Local como Azure Functions | `http://localhost:7071` |
| Azure | `https://<nombre-de-la-function-app>.azurewebsites.net` |

No hay prefijo global: las rutas de autenticación y del comensal empiezan con `/api/v1/...`; las del panel van en la raíz (`/products`, `/attentions`...). Las rutas de esta guía se usan tal cual sobre la URL base.

### Formato de las respuestas

Toda respuesta JSON viene en el mismo sobre. El contenido útil está en `data`.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": { "id": "7c1e6f2a-…", "name": "Ceviche clásico" },
  "timestamp": "2026-11-08T20:15:00.000Z",
  "path": "/products/7c1e6f2a-…"
}
```

Los errores agregan `errorCode` (ver [códigos de error](#5-códigos-de-error)) y `requestId`:

```json
{
  "success": false,
  "statusCode": 404,
  "errorCode": "PRODUCT_NOT_FOUND",
  "message": "No existe el producto con id \"…\"",
  "data": null,
  "timestamp": "2026-11-08T20:15:00.000Z",
  "path": "/products/…",
  "requestId": "8f0c2a91"
}
```

- `message` está en español y se puede mostrar al usuario; en `VALIDATION_ERROR` es una **lista** de mensajes.
- Cada respuesta trae el header `X-Request-Id`. Inclúyelo al reportar un error: con él se encuentra en los logs.
- Las respuestas `204` no tienen body.

### Listados paginados

Los listados aceptan `?page=` (desde 1) y `?limit=` (20 por defecto, máximo 100) y devuelven:

```json
{ "items": [ … ], "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

En esta guía aparecen como `data` es `{ items: X[], meta: PageMetaDto }`.

### Sesión

1. **Login o registro** (`/api/v1/owner/auth/...` para el panel, `/api/v1/customer/auth/...` para el comensal) devuelve `accessToken` y `refreshToken`. Es la misma identidad: un usuario puede ser comensal y personal a la vez.
2. Envía `Authorization: Bearer <accessToken>` en cada request. El access token dura **15 minutos**.
3. Ante `401 INVALID_ACCESS_TOKEN`, llama a `/auth/refresh` con el `refreshToken`: devuelve un **par nuevo** y el refresh anterior deja de servir (rotación de un solo uso, dura **30 días**). Guarda siempre el último par. Si dos requests refrescan a la vez con el mismo token, solo una gana: centraliza el refresh en un solo lugar del cliente.
4. **Logout** invalida el refresh token.
5. Una cuenta inactiva o bloqueada recibe `403 ACCOUNT_DISABLED` en cualquier ruta.

En el panel, `GET /api/v1/owner/me/profile` (y el propio login) trae las organizaciones, sedes y permisos del usuario: úsalo para armar el menú y ocultar lo que no puede hacer.

### Comensal invitado (`X-Guest-Token`)

Las rutas `/api/v1/attentions/...` aceptan sesión **opcional**:

1. El comensal escanea el QR: `GET /api/v1/tables/qr/{token}` devuelve la sede, la mesa y la atención activa si la hay.
2. Si no tiene sesión, la primera orden (`POST /api/v1/attentions`) devuelve `guestToken` en `data`. Guárdalo en el dispositivo.
3. Envía `X-Guest-Token: <guestToken>` en las siguientes llamadas a esa atención (otra orden, ver estado, cuenta, pedir la cuenta).
4. Con sesión, basta `Authorization`. Solo los participantes de la atención pueden verla o modificarla (`403`).

### Reintentos seguros (`requestId`)

Las órdenes del comensal y los pagos piden un `requestId` (UUID generado por el cliente). Genera uno por acción del usuario y **reúsalo si reintentas** tras un timeout o error de red: el servidor responde con la orden o el pago original, sin duplicarlo.

### Acceso (columna **Acceso**)

| Valor | Qué significa |
| --- | --- |
| `público` | No requiere sesión. |
| `público (sesión opcional / X-Guest-Token)` | Comensal: con sesión o como invitado. |
| `sesión` | Requiere `Authorization`. |
| `miembro` | Sesión + membresía activa en la organización/sede del recurso. |
| `area.accion` (por ejemplo `catalog.manage`) | Sesión + membresía + ese permiso en su rol. Sin él: `403 ACCESS_DENIED`. |
| `plataforma` | Solo administradores de ACMR. |

Muchas rutas del panel necesitan saber sobre qué organización o sede actúan: `restaurantId` u `organizationId` en la query o el body. Sin él responden `400 TENANT_SCOPE_REQUIRED`.

### Convenciones de datos

- Los `id` son UUID.
- Fechas y horas: ISO 8601 en UTC (`2026-11-08T20:15:00.000Z`). Muéstralas en la zona de la sede (`timezone` de la sede, por defecto `America/Lima`).
- Fechas de negocio (`businessDate`, `expenseDate`, filtros `from`/`to`): `YYYY-MM-DD` en la zona de la sede.
- Montos: `number` en la moneda de la sede (`currencyCode`, por defecto `PEN`).
- `DELETE` hace baja lógica (el registro queda inactivo), salvo en asociaciones (permisos de un rol, productos de un menú...), que se quitan.
- Los enums se envían y reciben en mayúsculas (`DINE_IN`, `CASH`...).

## 2. App del comensal

Rutas del cliente final: explorar sedes y carta, escanear el QR de la mesa, pedir, ver la cuenta y su cuenta de usuario. El login es opcional en casi todas: sin sesión, el comensal es un invitado identificado por `X-Guest-Token`.

### Autenticación del comensal

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /api/v1/customer/auth/register](#post-apiv1customerauthregister) | Crea la cuenta del comensal y devuelve la sesión | público |
| [`POST` /api/v1/customer/auth/login](#post-apiv1customerauthlogin) | Inicia sesión con email y contraseña | público |
| [`POST` /api/v1/customer/auth/refresh](#post-apiv1customerauthrefresh) | Renueva el access token con el refresh token | público |
| [`POST` /api/v1/customer/auth/logout](#post-apiv1customerauthlogout) | Invalida el refresh token | sesión |
| [`POST` /api/v1/customer/auth/forgot-password](#post-apiv1customerauthforgot-password) | Envía un token para restablecer la contraseña | público |
| [`POST` /api/v1/customer/auth/reset-password](#post-apiv1customerauthreset-password) | Restablece la contraseña con el token recibido | público |

#### `POST` /api/v1/customer/auth/register

Crea la cuenta del comensal y devuelve la sesión.

**Acceso:** público

**Body (JSON)** ([RegisterCustomerDto](#registercustomerdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@mail.com"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Torres"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `dietaryPreferences` | string | no | Ej.: `"Vegetariana, sin maní"` |

**Respuesta `201`:** `data` es [AuthResponseDto](#authresponsedto)

#### `POST` /api/v1/customer/auth/login

Inicia sesión con email y contraseña.

**Acceso:** público

**Body (JSON)** ([LoginDto](#logindto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `password` | string | sí | Ej.: `"S3cret-password"` |

**Respuesta `200`:** `data` es [AuthResponseDto](#authresponsedto)

#### `POST` /api/v1/customer/auth/refresh

Renueva el access token con el refresh token.

**Acceso:** público

**Body (JSON)** ([RefreshDto](#refreshdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `refreshToken` | string | sí | Ej.: `"<refresh token>"` |

**Respuesta `200`:** `data` es [AuthTokensResponseDto](#authtokensresponsedto)

#### `POST` /api/v1/customer/auth/logout

Invalida el refresh token.

**Acceso:** sesión

**Body (JSON)** ([RefreshDto](#refreshdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `refreshToken` | string | sí | Ej.: `"<refresh token>"` |

**Respuesta:** `204` sin contenido.

#### `POST` /api/v1/customer/auth/forgot-password

Envía un token para restablecer la contraseña.

**Acceso:** público

**Body (JSON)** ([ForgotPasswordDto](#forgotpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |

**Respuesta:** `204` sin contenido.

#### `POST` /api/v1/customer/auth/reset-password

Restablece la contraseña con el token recibido.

**Acceso:** público

**Body (JSON)** ([ResetPasswordDto](#resetpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `token` | string | sí | Ej.: `"<token from the email>"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

**Respuesta:** `204` sin contenido.

### Perfil del comensal

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /api/v1/customer/me](#get-apiv1customerme) | Perfil del comensal | sesión |
| [`PATCH` /api/v1/customer/me](#patch-apiv1customerme) | Actualiza datos personales, preferencias alimentarias, alergias, cumpleaños y consentimiento de marketing | sesión |
| [`PATCH` /api/v1/customer/me/password](#patch-apiv1customermepassword) | Cambia la contraseña (pide la actual) | sesión |
| [`GET` /api/v1/customer/me/attentions](#get-apiv1customermeattentions) | Mis visitas | sesión |

#### `GET` /api/v1/customer/me

Perfil del comensal.

**Acceso:** sesión

**Respuesta `200`:** `data` es [CustomerMeResponseDto](#customermeresponsedto)

#### `PATCH` /api/v1/customer/me

Actualiza datos personales, preferencias alimentarias, alergias, cumpleaños y consentimiento de marketing.

**Acceso:** sesión

**Body (JSON)** ([UpdateCustomerMeDto](#updatecustomermedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `dietaryPreferences` | string | no | Ej.: `"Vegetariana, sin maní"` |
| `allergies` | string \| null | no | Alergias del comensal (texto libre). null las borra. Ej.: `"Maní, mariscos"` |
| `birthDate` | string (YYYY-MM-DD) \| null | no | Fecha de nacimiento (YYYY-MM-DD), no futura. Ej.: `"1994-05-21"` |
| `marketingOptIn` | boolean | no | Acepta recibir promociones. |

**Respuesta `200`:** `data` es [CustomerMeResponseDto](#customermeresponsedto)

#### `PATCH` /api/v1/customer/me/password

Cambia la contraseña (pide la actual).

**Acceso:** sesión

**Body (JSON)** ([ChangeOwnPasswordDto](#changeownpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `currentPassword` | string | sí | Ej.: `"current-password"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

**Respuesta:** `204` sin contenido.

#### `GET` /api/v1/customer/me/attentions

Mis visitas.

Atenciones en las que participó el comensal con sesión (las de invitado no se ligan a la cuenta), de la más reciente a la más antigua, con la sede, los productos cobrables, el total y el saldo.

**Acceso:** sesión

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [AttentionVisitResponseDto](#attentionvisitresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

### Sedes y carta

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /api/v1/restaurants](#get-apiv1restaurants) | Sedes activas visibles para el comensal | público |
| [`GET` /api/v1/restaurants/slug/{slug}](#get-apiv1restaurantsslugslug) | Sede por su slug (abrir la carta por URL) | público |
| [`GET` /api/v1/restaurants/{id}](#get-apiv1restaurantsid) | Datos públicos de una sede | público |
| [`GET` /api/v1/restaurants/{id}/menu](#get-apiv1restaurantsidmenu) | Carta vigente de la sede | público |
| [`GET` /api/v1/restaurants/{id}/menu/search](#get-apiv1restaurantsidmenusearch) | Sugerencias del buscador de la carta | público |

#### `GET` /api/v1/restaurants

Sedes activas visibles para el comensal.

Con ubicación y modalidades activas (mínimo y costo de envío).

**Acceso:** público

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [StorefrontRestaurantResponseDto](#storefrontrestaurantresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `GET` /api/v1/restaurants/slug/{slug}

Sede por su slug (abrir la carta por URL).

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `slug` | string | sí |  |

**Respuesta `200`:** `data` es [StorefrontRestaurantResponseDto](#storefrontrestaurantresponsedto)

#### `GET` /api/v1/restaurants/{id}

Datos públicos de una sede.

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [StorefrontRestaurantResponseDto](#storefrontrestaurantresponsedto)

#### `GET` /api/v1/restaurants/{id}/menu

Carta vigente de la sede.

Menú ACTIVE dentro de su vigencia (si hay varios, el que empezó más tarde), sus secciones activas y sus productos visibles y activos. Los agotados vienen con isAvailable=false. Sin menú vigente: menu=null y listas vacías.

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [StorefrontMenuResponseDto](#storefrontmenuresponsedto)

#### `GET` /api/v1/restaurants/{id}/menu/search

Sugerencias del buscador de la carta.

Busca en nombre y descripción de los productos de la carta vigente, sin distinguir mayúsculas ni tildes. Primero coincidencias por inicio del nombre.

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `q` | string | sí |  |
| `limit` | number | no | Ej.: `6` |

**Respuesta `200`:** `data` es [StorefrontProductResponseDto](#storefrontproductresponsedto)[]

### QR de la mesa

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /api/v1/tables/qr/{token}](#get-apiv1tablesqrtoken) | Resuelve el QR: local, mesa y atención activa (si hay) | público |

#### `GET` /api/v1/tables/qr/{token}

Resuelve el QR: local, mesa y atención activa (si hay).

QR desconocido o revocado → 404 QR_INVALID. Sede inactiva → 404. Mesa inactiva o en mantenimiento → 422. La mesa se ocupa recién con el primer pedido para consumir en el local (POST /api/v1/attentions).

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `token` | string | sí |  |

**Respuesta `200`:** `data` es [TableQrResolveResponseDto](#tableqrresolveresponsedto)

### Carrito (pedidos para llevar o delivery)

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /api/v1/restaurants/{restaurant}/cart/validate](#post-apiv1restaurantsrestaurantcartvalidate) | Valida disponibilidad, modalidad y precios vigentes del servidor | público |

#### `POST` /api/v1/restaurants/{restaurant}/cart/validate

Valida disponibilidad, modalidad y precios vigentes del servidor.

La sede se indica por su id o por su slug. No guarda nada: devuelve los productos con el precio del servidor, totales y los problemas por producto (issues) y del pedido (serviceIssues).

**Acceso:** público

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurant` | string | sí |  |

**Body (JSON)** ([CartValidateDto](#cartvalidatedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `items` | [CartValidateItemDto](#cartvalidateitemdto)[] | sí |  |

**Respuesta `200`:** `data` es [CartValidateResponseDto](#cartvalidateresponsedto)

### Pedidos en la mesa

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /api/v1/attentions](#post-apiv1attentions) | Primera orden del comensal | público (sesión opcional / `X-Guest-Token`) |
| [`POST` /api/v1/attentions/{id}/orders](#post-apiv1attentionsidorders) | Enviar otra orden | público (sesión opcional / `X-Guest-Token`) |
| [`DELETE` /api/v1/attentions/{id}/items/{itemId}](#delete-apiv1attentionsiditemsitemid) | Cancelar un plato propio que aún no se prepara | público (sesión opcional / `X-Guest-Token`) |
| [`GET` /api/v1/attentions/{id}](#get-apiv1attentionsid) | Atención con sus órdenes y el estado de cada plato | público (sesión opcional / `X-Guest-Token`) |
| [`GET` /api/v1/attentions/{id}/bill](#get-apiv1attentionsidbill) | Cuenta: ítems cobrables, total, pagado y saldo | público (sesión opcional / `X-Guest-Token`) |
| [`POST` /api/v1/attentions/{id}/request-bill](#post-apiv1attentionsidrequest-bill) | Pedir la cuenta | público (sesión opcional / `X-Guest-Token`) |

#### `POST` /api/v1/attentions

Primera orden del comensal.

En mesa (DINE_IN) se une a la atención activa de la mesa o la abre. Un invitado nuevo recibe guestToken en la respuesta.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Body (JSON)** ([StartCustomerAttentionDto](#startcustomerattentiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |
| `serviceTypeId` | string | no | Tipo de servicio de la sede (GET /service-types). Alternativa a fulfillmentMode. |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | no | Usa el primer tipo de servicio activo de la sede con esta modalidad. |
| `qrToken` | string | no | Token del QR de la mesa. Requerido si el tipo de servicio exige mesa. |
| `restaurantId` | string | no | Requerido sin mesa ni serviceTypeId. |
| `displayName` | string | no | Cómo verán al comensal en la mesa. Ej.: `"Ana"` |
| `fulfillment` | [FulfillmentDto](#fulfillmentdto) | no | Requerido en PICKUP / DELIVERY. |

**Respuesta `201`:** `data` es [AttentionDetailResponseDto](#attentiondetailresponsedto)

#### `POST` /api/v1/attentions/{id}/orders

Enviar otra orden.

Idempotente por requestId; si la cuenta estaba pedida vuelve a OPEN.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Body (JSON)** ([SubmitOrderDto](#submitorderdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |

**Respuesta `201`:** `data` es [OrderResponseDto](#orderresponsedto)

#### `DELETE` /api/v1/attentions/{id}/items/{itemId}

Cancelar un plato propio que aún no se prepara.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `itemId` | string (uuid) | sí |  |

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Respuesta:** `204` sin contenido.

#### `GET` /api/v1/attentions/{id}

Atención con sus órdenes y el estado de cada plato.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Respuesta `200`:** `data` es [AttentionDetailResponseDto](#attentiondetailresponsedto)

#### `GET` /api/v1/attentions/{id}/bill

Cuenta: ítems cobrables, total, pagado y saldo.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Respuesta `200`:** `data` es [AttentionBillResponseDto](#attentionbillresponsedto)

#### `POST` /api/v1/attentions/{id}/request-bill

Pedir la cuenta.

**Acceso:** público (sesión opcional / `X-Guest-Token`)

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Headers:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `X-Guest-Token` | string | no | UUID del invitado. |

**Respuesta `200`:** `data` es [AttentionResponseDto](#attentionresponsedto)

## 3. Panel del restaurante (dueño y personal)

Rutas del dueño y del personal. Todas requieren sesión; además, las que operan sobre una organización o una sede exigen una membresía en ella y, según la ruta, un permiso de su rol (columna **Acceso**).

### Autenticación del dueño y del personal

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /api/v1/owner/auth/register](#post-apiv1ownerauthregister) | Alta del dueño: usuario + organización + rol OWNER + membresía (+ primera sede) | público |
| [`POST` /api/v1/owner/auth/login](#post-apiv1ownerauthlogin) | Login del dueño y del personal | público |
| [`POST` /api/v1/owner/auth/refresh](#post-apiv1ownerauthrefresh) | Rota el refresh token y emite un par nuevo | público |
| [`POST` /api/v1/owner/auth/logout](#post-apiv1ownerauthlogout) | Invalida el refresh token | sesión |
| [`POST` /api/v1/owner/auth/forgot-password](#post-apiv1ownerauthforgot-password) | Envía un token para restablecer la contraseña | público |
| [`POST` /api/v1/owner/auth/reset-password](#post-apiv1ownerauthreset-password) | Restablece la contraseña con el token recibido | público |

#### `POST` /api/v1/owner/auth/register

Alta del dueño: usuario + organización + rol OWNER + membresía (+ primera sede).

Todo en una sola transacción; si algo falla no queda nada creado.

**Acceso:** público

**Body (JSON)** ([RegisterOwnerDto](#registerownerdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"duena@sabores.pe"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Lucía"` |
| `lastName` | string | no | Ej.: `"Ramos"` |
| `phone` | string | no |  |
| `organization` | [OwnerOrganizationDto](#ownerorganizationdto) | sí |  |
| `restaurant` | [OwnerRestaurantDto](#ownerrestaurantdto) | no | Primera sede, si el onboarding ya la pide. |

**Respuesta `201`:** `data` es [OwnerRegistrationResponseDto](#ownerregistrationresponsedto)

#### `POST` /api/v1/owner/auth/login

Login del dueño y del personal.

Además de la sesión trae el acceso por organización (rol, sedes y permisos) y los empleados vinculados, igual que GET /api/v1/owner/me/profile. Cuenta inactiva o bloqueada → 403 ACCOUNT_DISABLED.

**Acceso:** público

**Body (JSON)** ([LoginDto](#logindto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `password` | string | sí | Ej.: `"S3cret-password"` |

**Respuesta `200`:** `data` es [StaffLoginResponseDto](#staffloginresponsedto)

#### `POST` /api/v1/owner/auth/refresh

Rota el refresh token y emite un par nuevo.

**Acceso:** público

**Body (JSON)** ([RefreshDto](#refreshdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `refreshToken` | string | sí | Ej.: `"<refresh token>"` |

**Respuesta `200`:** `data` es [AuthTokensResponseDto](#authtokensresponsedto)

#### `POST` /api/v1/owner/auth/logout

Invalida el refresh token.

**Acceso:** sesión

**Body (JSON)** ([RefreshDto](#refreshdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `refreshToken` | string | sí | Ej.: `"<refresh token>"` |

**Respuesta:** `204` sin contenido.

#### `POST` /api/v1/owner/auth/forgot-password

Envía un token para restablecer la contraseña.

**Acceso:** público

**Body (JSON)** ([ForgotPasswordDto](#forgotpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |

**Respuesta:** `204` sin contenido.

#### `POST` /api/v1/owner/auth/reset-password

Restablece la contraseña con el token recibido.

**Acceso:** público

**Body (JSON)** ([ResetPasswordDto](#resetpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `token` | string | sí | Ej.: `"<token from the email>"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

**Respuesta:** `204` sin contenido.

### Mi cuenta y mis accesos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /api/v1/owner/me](#get-apiv1ownerme) | Usuario autenticado | sesión |
| [`PATCH` /api/v1/owner/me](#patch-apiv1ownerme) | Actualiza nombre, apellido y teléfono | sesión |
| [`GET` /api/v1/owner/me/profile](#get-apiv1ownermeprofile) | Perfil del personal | sesión |
| [`PATCH` /api/v1/owner/me/password](#patch-apiv1ownermepassword) | Cambia la contraseña (pide la actual) | sesión |

#### `GET` /api/v1/owner/me

Usuario autenticado.

**Acceso:** sesión

**Respuesta `200`:** `data` es [UserResponseDto](#userresponsedto)

#### `PATCH` /api/v1/owner/me

Actualiza nombre, apellido y teléfono.

**Acceso:** sesión

**Body (JSON)** ([UpdateMeDto](#updatemedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |

**Respuesta `200`:** `data` es [UserResponseDto](#userresponsedto)

#### `GET` /api/v1/owner/me/profile

Perfil del personal.

Datos del usuario, su acceso por organización (rol, sedes y permisos efectivos) y los empleados vinculados con su puesto y área.

**Acceso:** sesión

**Respuesta `200`:** `data` es [StaffProfileResponseDto](#staffprofileresponsedto)

#### `PATCH` /api/v1/owner/me/password

Cambia la contraseña (pide la actual).

**Acceso:** sesión

**Body (JSON)** ([ChangeOwnPasswordDto](#changeownpassworddto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `currentPassword` | string | sí | Ej.: `"current-password"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

**Respuesta:** `204` sin contenido.

### Organizaciones

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /organizations](#get-organizations) | Listar organizaciones | sesión |
| [`POST` /organizations](#post-organizations) | Crear una organización | plataforma |
| [`GET` /organizations/{id}](#get-organizationsid) | Obtener una organización por id | miembro |
| [`PATCH` /organizations/{id}](#patch-organizationsid) | Actualizar una organización | `organizations.manage` |
| [`DELETE` /organizations/{id}](#delete-organizationsid) | Desactivar una organización (baja lógica) | `organizations.manage` |

#### `GET` /organizations

Listar organizaciones.

**Acceso:** sesión

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [OrganizationResponseDto](#organizationresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /organizations

Crear una organización.

**Acceso:** plataforma

**Body (JSON)** ([CreateOrganizationDto](#createorganizationdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | (mín. 2 caracteres) Ej.: `"Grupo Sabores"` |
| `legalName` | string | no | Ej.: `"Grupo Sabores S.A.C."` |
| `taxIdentifier` | string | no | RUC u otro identificador fiscal. Ej.: `"20601234567"` |
| `currencyCode` | string | no | Por defecto: `"PEN"`. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto: `"America/Lima"`. Ej.: `"America/Lima"` |

**Respuesta `201`:** `data` es [OrganizationResponseDto](#organizationresponsedto)

#### `GET` /organizations/{id}

Obtener una organización por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [OrganizationResponseDto](#organizationresponsedto)

#### `PATCH` /organizations/{id}

Actualizar una organización.

**Acceso:** `organizations.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateOrganizationDto](#updateorganizationdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | (mín. 2 caracteres) Ej.: `"Grupo Sabores"` |
| `legalName` | string | no | Ej.: `"Grupo Sabores S.A.C."` |
| `taxIdentifier` | string | no | RUC u otro identificador fiscal. Ej.: `"20601234567"` |
| `currencyCode` | string | no | Por defecto: `"PEN"`. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto: `"America/Lima"`. Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | no |  |

**Respuesta `200`:** `data` es [OrganizationResponseDto](#organizationresponsedto)

#### `DELETE` /organizations/{id}

Desactivar una organización (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `organizations.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Sedes

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /restaurants](#get-restaurants) | Listar las sedes de la organización a las que el usuario tiene acceso | miembro |
| [`POST` /restaurants](#post-restaurants) | Crear un restaurante (sede) | `restaurants.manage` |
| [`GET` /restaurants/{id}](#get-restaurantsid) | Obtener un restaurante por id | miembro |
| [`PATCH` /restaurants/{id}](#patch-restaurantsid) | Actualizar un restaurante | `restaurants.manage` |
| [`DELETE` /restaurants/{id}](#delete-restaurantsid) | Desactivar un restaurante (baja lógica) | `restaurants.manage` |

#### `GET` /restaurants

Listar las sedes de la organización a las que el usuario tiene acceso.

Con una membresía limitada a algunas sedes, solo esas. Sus cifras del día están en GET /reports/restaurants-overview.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [RestaurantResponseDto](#restaurantresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /restaurants

Crear un restaurante (sede).

En una sola transacción: la sede (slug y código generados si no vienen), sus pisos iniciales (floorsCount), sus estados y tipos de servicio por defecto, y el acceso a ella para quien la crea si su membresía está limitada a algunas sedes.

**Acceso:** `restaurants.manage`

**Body (JSON)** ([CreateRestaurantDto](#createrestaurantdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | (mín. 2 caracteres) Ej.: `"Sabores Miraflores"` |
| `code` | string | no | Único dentro de la organización. Se genera a partir del slug si no se envía. Ej.: `"MIRAFLORES"` |
| `slug` | string | no | Se genera a partir del nombre si no se envía. Ej.: `"sabores-miraflores"` |
| `description` | string | no |  |
| `address` | string | no | Ej.: `"Av. Larco 123, Miraflores"` |
| `phone` | string | no | Ej.: `"+51 1 234 5678"` |
| `email` | string | no | Ej.: `"miraflores@sabores.pe"` |
| `latitude` | number | no | Ej.: `-12.1211` |
| `longitude` | number | no | Ej.: `-77.0297` |
| `currencyCode` | string | no | Por defecto, la de la organización. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto, la de la organización. Ej.: `"America/Lima"` |
| `floorsCount` | number | no | Pisos vacíos con los que arranca el plano ("Piso 1", "Piso 2"...) Por defecto: `0`. (mín. 0, máx. 20) |

**Respuesta `201`:** `data` es [RestaurantResponseDto](#restaurantresponsedto)

#### `GET` /restaurants/{id}

Obtener un restaurante por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [RestaurantResponseDto](#restaurantresponsedto)

#### `PATCH` /restaurants/{id}

Actualizar un restaurante.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateRestaurantDto](#updaterestaurantdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | (mín. 2 caracteres) Ej.: `"Sabores Miraflores"` |
| `description` | string | no |  |
| `address` | string | no | Ej.: `"Av. Larco 123, Miraflores"` |
| `phone` | string | no | Ej.: `"+51 1 234 5678"` |
| `email` | string | no | Ej.: `"miraflores@sabores.pe"` |
| `latitude` | number | no | Ej.: `-12.1211` |
| `longitude` | number | no | Ej.: `-77.0297` |
| `currencyCode` | string | no | Por defecto, la de la organización. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto, la de la organización. Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | no |  |

**Respuesta `200`:** `data` es [RestaurantResponseDto](#restaurantresponsedto)

#### `DELETE` /restaurants/{id}

Desactivar un restaurante (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Pisos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /restaurant-floors](#get-restaurant-floors) | Listar pisos | miembro |
| [`POST` /restaurant-floors](#post-restaurant-floors) | Crear un piso de un restaurante | `restaurants.manage` |
| [`GET` /restaurant-floors/{id}](#get-restaurant-floorsid) | Obtener un piso por id | miembro |
| [`PATCH` /restaurant-floors/{id}](#patch-restaurant-floorsid) | Actualizar un piso | `restaurants.manage` |
| [`DELETE` /restaurant-floors/{id}](#delete-restaurant-floorsid) | Desactivar un piso (baja lógica), moviendo sus mesas si hace falta | `restaurants.manage` |

#### `GET` /restaurant-floors

Listar pisos.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [RestaurantFloorResponseDto](#restaurantfloorresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /restaurant-floors

Crear un piso de un restaurante.

**Acceso:** `restaurants.manage`

**Body (JSON)** ([CreateRestaurantFloorDto](#createrestaurantfloordto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Primer piso"` |
| `sortOrder` | number | no | Por defecto: `0`. Ej.: `0` |

**Respuesta `201`:** `data` es [RestaurantFloorResponseDto](#restaurantfloorresponsedto)

#### `GET` /restaurant-floors/{id}

Obtener un piso por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [RestaurantFloorResponseDto](#restaurantfloorresponsedto)

#### `PATCH` /restaurant-floors/{id}

Actualizar un piso.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateRestaurantFloorDto](#updaterestaurantfloordto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Primer piso"` |
| `sortOrder` | number | no | Por defecto: `0`. Ej.: `0` |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [RestaurantFloorResponseDto](#restaurantfloorresponsedto)

#### `DELETE` /restaurant-floors/{id}

Desactivar un piso (baja lógica), moviendo sus mesas si hace falta.

No se borra: queda inactivo para conservar el historial. Con mesas operativas exige moveTablesTo (otro piso activo de la misma sede): todas sus mesas pasan a ese piso en la misma transacción. Sin moveTablesTo y con mesas operativas → 422 FLOOR_HAS_TABLES.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `moveTablesTo` | string | no | Piso que recibe las mesas. |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Mesas y QR

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /dining-tables/{id}/qr-code](#post-dining-tablesidqr-code) | Generar o regenerar el QR de la mesa | `restaurants.manage` |
| [`DELETE` /dining-tables/{id}/qr-code](#delete-dining-tablesidqr-code) | Revocar el QR de la mesa (queda sin QR válido) | `restaurants.manage` |
| [`GET` /dining-tables](#get-dining-tables) | Listar mesas | miembro |
| [`POST` /dining-tables](#post-dining-tables) | Crear una mesa en un piso | `restaurants.manage` |
| [`GET` /dining-tables/{id}](#get-dining-tablesid) | Obtener una mesa por id | miembro |
| [`PATCH` /dining-tables/{id}](#patch-dining-tablesid) | Actualizar una mesa (incluye estados) | `restaurants.manage` |
| [`DELETE` /dining-tables/{id}](#delete-dining-tablesid) | Desactivar una mesa (baja lógica) | `restaurants.manage` |

#### `POST` /dining-tables/{id}/qr-code

Generar o regenerar el QR de la mesa.

Emite un token nuevo e incrementa la versión; el QR anterior deja de funcionar. El token solo se devuelve en esta respuesta.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([GenerateQrDto](#generateqrdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `assetUrl` | string | no | Ubicación de la imagen si se guarda en almacenamiento externo. Si se genera bajo demanda, omitir. Ej.: `"https://storage.example.com/qr/mesa-1.png"` |

**Respuesta `201`:** `data` es [GeneratedQrResponseDto](#generatedqrresponsedto)

#### `DELETE` /dining-tables/{id}/qr-code

Revocar el QR de la mesa (queda sin QR válido).

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [DiningTableResponseDto](#diningtableresponsedto)

#### `GET` /dining-tables

Listar mesas.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `floorId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [DiningTableResponseDto](#diningtableresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /dining-tables

Crear una mesa en un piso.

Nace con su QR (salvo generateQr=false): qrToken y qrUrl solo vienen en esta respuesta. El código es único en la sede.

**Acceso:** `restaurants.manage`

**Body (JSON)** ([CreateDiningTableDto](#creatediningtabledto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `floorId` | string | sí | Piso de la mesa; el restaurante se toma del piso. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | sí | Único dentro del restaurante. Ej.: `"M01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number | no | Ej.: `4` |
| `positionX` | number | no | Posición en el plano del piso. Ej.: `120.5` |
| `positionY` | number | no | Ej.: `80` |
| `generateQr` | boolean | no | Genera el QR de la mesa al crearla (el token solo viene en esta respuesta) Por defecto: `true`. |

**Respuesta `201`:** `data` es [CreatedDiningTableResponseDto](#createddiningtableresponsedto)

#### `GET` /dining-tables/{id}

Obtener una mesa por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [DiningTableResponseDto](#diningtableresponsedto)

#### `PATCH` /dining-tables/{id}

Actualizar una mesa (incluye estados).

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateDiningTableDto](#updatediningtabledto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `floorId` | string | no | Piso de la mesa; el restaurante se toma del piso. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | no | Único dentro del restaurante. Ej.: `"M01"` |
| `name` | string | no | Ej.: `"Mesa 1"` |
| `capacity` | number | no | Ej.: `4` |
| `positionX` | number | no | Posición en el plano del piso. Ej.: `120.5` |
| `positionY` | number | no | Ej.: `80` |
| `operationalStatus` | `ACTIVE` \| `INACTIVE` \| `MAINTENANCE` | no |  |
| `serviceStatus` | `AVAILABLE` \| `RESERVED` \| `CLEANING` | no |  |

**Respuesta `200`:** `data` es [DiningTableResponseDto](#diningtableresponsedto)

#### `DELETE` /dining-tables/{id}

Desactivar una mesa (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `restaurants.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Plano del salón

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /floor-plan](#get-floor-plan) | Plano de la sala: pisos, mesas con su ocupación y KPIs | miembro |

#### `GET` /floor-plan

Plano de la sala: pisos, mesas con su ocupación y KPIs.

Cada mesa trae su atención activa (total, pagado y saldo). Pensado para consultarse seguido: solo lee atenciones activas.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |

**Respuesta `200`:** `data` es [FloorPlanResponseDto](#floorplanresponsedto)

### Empleados

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /employees](#get-employees) | Listar empleados | `staff.read` |
| [`POST` /employees](#post-employees) | Registrar un empleado (con o sin acceso al sistema) | `staff.manage` |
| [`GET` /employees/{id}](#get-employeesid) | Obtener un empleado por id | `staff.read` |
| [`PATCH` /employees/{id}](#patch-employeesid) | Actualizar un empleado | `staff.manage` |
| [`DELETE` /employees/{id}](#delete-employeesid) | Desactivar un empleado (baja lógica) | `staff.manage` |

#### `GET` /employees

Listar empleados.

**Acceso:** `staff.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [EmployeeResponseDto](#employeeresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /employees

Registrar un empleado (con o sin acceso al sistema).

**Acceso:** `staff.manage`

**Body (JSON)** ([CreateEmployeeDto](#createemployeedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `userId` | string | no | Usuario con acceso al sistema. Omitir si el empleado no tiene acceso. |
| `employeeCode` | string | sí | Único dentro de la organización. Ej.: `"EMP-001"` |
| `documentNumber` | string | no | Ej.: `"70123456"` |
| `jobPositionId` | string | no | Puesto vigente (de la misma organización y activo). El área se obtiene del puesto. |
| `hiredAt` | string | no | Ej.: `"2026-01-15"` |
| `terminatedAt` | string | no | Ej.: `"2026-12-31"` |

**Respuesta `201`:** `data` es [EmployeeResponseDto](#employeeresponsedto)

#### `GET` /employees/{id}

Obtener un empleado por id.

**Acceso:** `staff.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [EmployeeResponseDto](#employeeresponsedto)

#### `PATCH` /employees/{id}

Actualizar un empleado.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateEmployeeDto](#updateemployeedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `userId` | string | no | Usuario con acceso al sistema. Omitir si el empleado no tiene acceso. |
| `employeeCode` | string | no | Único dentro de la organización. Ej.: `"EMP-001"` |
| `documentNumber` | string | no | Ej.: `"70123456"` |
| `jobPositionId` | string | no | Puesto vigente (de la misma organización y activo). El área se obtiene del puesto. |
| `hiredAt` | string | no | Ej.: `"2026-01-15"` |
| `terminatedAt` | string | no | Ej.: `"2026-12-31"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `TERMINATED` | no |  |

**Respuesta `200`:** `data` es [EmployeeResponseDto](#employeeresponsedto)

#### `DELETE` /employees/{id}

Desactivar un empleado (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Áreas de trabajo

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /work-areas](#get-work-areas) | Listar áreas laborales | miembro |
| [`POST` /work-areas](#post-work-areas) | Crear un área laboral | `staff.manage` |
| [`GET` /work-areas/{id}](#get-work-areasid) | Obtener un área laboral | miembro |
| [`PATCH` /work-areas/{id}](#patch-work-areasid) | Editar, activar o desactivar un área laboral | `staff.manage` |
| [`DELETE` /work-areas/{id}](#delete-work-areasid) | Desactivar un área laboral (baja lógica) | `staff.manage` |

#### `GET` /work-areas

Listar áreas laborales.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `isActive` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [WorkAreaResponseDto](#workarearesponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /work-areas

Crear un área laboral.

**Acceso:** `staff.manage`

**Body (JSON)** ([CreateWorkAreaDto](#createworkareadto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Único por organización (sin distinguir mayúsculas) Ej.: `"Cocina"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [WorkAreaResponseDto](#workarearesponsedto)

#### `GET` /work-areas/{id}

Obtener un área laboral.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [WorkAreaResponseDto](#workarearesponsedto)

#### `PATCH` /work-areas/{id}

Editar, activar o desactivar un área laboral.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateWorkAreaDto](#updateworkareadto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Único por organización (sin distinguir mayúsculas) Ej.: `"Cocina"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

**Respuesta `200`:** `data` es [WorkAreaResponseDto](#workarearesponsedto)

#### `DELETE` /work-areas/{id}

Desactivar un área laboral (baja lógica).

No se borra: puestos y empleados pueden seguir apuntando a ella.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Puestos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /job-positions](#get-job-positions) | Listar puestos | miembro |
| [`POST` /job-positions](#post-job-positions) | Crear un puesto dentro de un área | `staff.manage` |
| [`GET` /job-positions/{id}](#get-job-positionsid) | Obtener un puesto | miembro |
| [`PATCH` /job-positions/{id}](#patch-job-positionsid) | Editar, mover de área, activar o desactivar un puesto | `staff.manage` |
| [`DELETE` /job-positions/{id}](#delete-job-positionsid) | Desactivar un puesto (baja lógica) | `staff.manage` |

#### `GET` /job-positions

Listar puestos.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `workAreaId` | string | no |  |
| `isActive` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [JobPositionResponseDto](#jobpositionresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /job-positions

Crear un puesto dentro de un área.

**Acceso:** `staff.manage`

**Body (JSON)** ([CreateJobPositionDto](#createjobpositiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `workAreaId` | string | sí | Área del puesto; la organización se toma del área. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Único por área (sin distinguir mayúsculas) Ej.: `"Cocinero"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [JobPositionResponseDto](#jobpositionresponsedto)

#### `GET` /job-positions/{id}

Obtener un puesto.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [JobPositionResponseDto](#jobpositionresponsedto)

#### `PATCH` /job-positions/{id}

Editar, mover de área, activar o desactivar un puesto.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateJobPositionDto](#updatejobpositiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `workAreaId` | string | no | Área del puesto; la organización se toma del área. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | no | Único por área (sin distinguir mayúsculas) Ej.: `"Cocinero"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

**Respuesta `200`:** `data` es [JobPositionResponseDto](#jobpositionresponsedto)

#### `DELETE` /job-positions/{id}

Desactivar un puesto (baja lógica).

No se borra ni afecta a los empleados que ya lo tienen; solo deja de poder asignarse.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Usuarios

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /users](#get-users) | Listar usuarios | plataforma |
| [`POST` /users](#post-users) | Crear un usuario | sesión |
| [`GET` /users/{id}](#get-usersid) | Obtener un usuario por id | plataforma |
| [`PATCH` /users/{id}](#patch-usersid) | Actualizar un usuario (datos, email, contraseña, estado) | plataforma |
| [`DELETE` /users/{id}](#delete-usersid) | Desactivar un usuario (baja lógica) | plataforma |

#### `GET` /users

Listar usuarios.

**Acceso:** plataforma

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [UserResponseDto](#userresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /users

Crear un usuario.

**Acceso:** sesión

**Body (JSON)** ([CreateUserDto](#createuserdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `mustChangePassword` | boolean | no | Obliga a cambiar la contraseña en el primer ingreso. Por defecto: `false`. |

**Respuesta `201`:** `data` es [UserResponseDto](#userresponsedto)

#### `GET` /users/{id}

Obtener un usuario por id.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [UserResponseDto](#userresponsedto)

#### `PATCH` /users/{id}

Actualizar un usuario (datos, email, contraseña, estado).

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateUserDto](#updateuserdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | no | Ej.: `"ana@restaurant.com"` |
| `password` | string | no | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `BLOCKED` | no |  |

**Respuesta `200`:** `data` es [UserResponseDto](#userresponsedto)

#### `DELETE` /users/{id}

Desactivar un usuario (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Usuarios de la organización (membresías)

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /memberships](#get-memberships) | Usuarios de la organización (membresías) | `staff.read` |
| [`POST` /memberships](#post-memberships) | Vincular un usuario a una organización con un rol y sedes | `staff.manage` |
| [`GET` /memberships/{id}](#get-membershipsid) | Obtener una membresía por id | `staff.read` |
| [`PATCH` /memberships/{id}](#patch-membershipsid) | Cambiar el acceso de un usuario: rol, sedes, estado y empleado vinculado | `staff.manage` |
| [`DELETE` /memberships/{id}](#delete-membershipsid) | Desactivar una membresía (baja lógica) | `staff.manage` |

#### `GET` /memberships

Usuarios de la organización (membresías).

Cada membresía con su usuario (nombre, email, estado de la cuenta), su rol, sus sedes y el empleado vinculado.

**Acceso:** `staff.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `userId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [MembershipWithPeopleResponseDto](#membershipwithpeopleresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /memberships

Vincular un usuario a una organización con un rol y sedes.

**Acceso:** `staff.manage`

**Body (JSON)** ([CreateMembershipDto](#createmembershipdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `userId` | string | sí | Usuario que se vincula a la organización. |
| `roleId` | string | sí | Rol de la misma organización. |
| `allRestaurants` | boolean | no | true = acceso a todas las sedes (actuales y futuras) Por defecto: `false`. |
| `restaurantIds` | string[] | no | Sedes permitidas cuando allRestaurants es false. Lista vacía = sin acceso a sedes. |

**Respuesta `201`:** `data` es [MembershipResponseDto](#membershipresponsedto)

#### `GET` /memberships/{id}

Obtener una membresía por id.

**Acceso:** `staff.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [MembershipWithPeopleResponseDto](#membershipwithpeopleresponsedto)

#### `PATCH` /memberships/{id}

Cambiar el acceso de un usuario: rol, sedes, estado y empleado vinculado.

Todo en una transacción. status SUSPENDED / INACTIVE le quita el acceso a esta organización (la cuenta sigue existiendo); employeeId vincula o desvincula su empleado.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateMembershipDto](#updatemembershipdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `roleId` | string | no | Rol de la misma organización. |
| `allRestaurants` | boolean | no | true = acceso a todas las sedes (actuales y futuras) Por defecto: `false`. |
| `restaurantIds` | string[] | no | Sedes permitidas cuando allRestaurants es false. Lista vacía = sin acceso a sedes. |
| `status` | `ACTIVE` \| `INACTIVE` \| `INVITED` \| `SUSPENDED` | no |  |
| `employeeId` | string \| null | no | Empleado de la organización vinculado al usuario (null lo desvincula). Un empleado por usuario: si tenía otro, se desvincula. Se guarda junto con el acceso. |

**Respuesta `200`:** `data` es [MembershipWithPeopleResponseDto](#membershipwithpeopleresponsedto)

#### `DELETE` /memberships/{id}

Desactivar una membresía (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Roles

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /roles](#get-roles) | Listar roles | `staff.read` |
| [`POST` /roles](#post-roles) | Crear un rol de una organización | `staff.manage` |
| [`GET` /roles/{id}](#get-rolesid) | Obtener un rol por id | `staff.read` |
| [`PATCH` /roles/{id}](#patch-rolesid) | Actualizar un rol | `staff.manage` |
| [`DELETE` /roles/{id}](#delete-rolesid) | Desactivar un rol (baja lógica) | `staff.manage` |
| [`GET` /roles/{id}/permissions](#get-rolesidpermissions) | Permisos asignados al rol | `staff.read` |
| [`POST` /roles/{id}/permissions](#post-rolesidpermissions) | Asignar un permiso al rol | `staff.manage` |
| [`DELETE` /roles/{id}/permissions/{permissionId}](#delete-rolesidpermissionspermissionid) | Revocar un permiso del rol | `staff.manage` |

#### `GET` /roles

Listar roles.

Cada uno con sus permisos efectivos y memberCount (usuarios con ese rol).

**Acceso:** `staff.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [RoleWithAccessResponseDto](#rolewithaccessresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /roles

Crear un rol de una organización.

Con permissions (códigos) se crean también sus permisos, en la misma transacción.

**Acceso:** `staff.manage`

**Body (JSON)** ([CreateRoleDto](#createroledto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | sí | Único dentro de la organización. Ej.: `"WAITER"` |
| `name` | string | sí | Ej.: `"Mozo"` |
| `description` | string | no | Ej.: `"Toma pedidos en sala"` |
| `permissions` | string[] | no | Códigos de permisos activos; el rol queda exactamente con estos. Ej.: `["attentions.manage","kitchen.read"]` |

**Respuesta `201`:** `data` es [RoleWithAccessResponseDto](#rolewithaccessresponsedto)

#### `GET` /roles/{id}

Obtener un rol por id.

**Acceso:** `staff.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [RoleWithAccessResponseDto](#rolewithaccessresponsedto)

#### `PATCH` /roles/{id}

Actualizar un rol.

permissions, si viene, reemplaza los permisos del rol (OWNER no se edita: 422). Desactivarlo con usuarios asignados → 422 ROLE_IN_USE.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateRoleDto](#updateroledto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Mozo"` |
| `description` | string | no | Ej.: `"Toma pedidos en sala"` |
| `permissions` | string[] | no | Códigos de permisos activos; el rol queda exactamente con estos. Ej.: `["attentions.manage","kitchen.read"]` |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [RoleWithAccessResponseDto](#rolewithaccessresponsedto)

#### `DELETE` /roles/{id}

Desactivar un rol (baja lógica).

No se borra: queda inactivo para conservar el historial. Con usuarios asignados → 422 ROLE_IN_USE.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

#### `GET` /roles/{id}/permissions

Permisos asignados al rol.

**Acceso:** `staff.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [PermissionResponseDto](#permissionresponsedto)[]

#### `POST` /roles/{id}/permissions

Asignar un permiso al rol.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([AssignPermissionDto](#assignpermissiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `permissionId` | string | sí | Ej.: `"7c1e6f2a-2222-4b3a-9a1a-9f3b2c1d4e5f"` |

**Respuesta `201`:** `data` es { roleId: string (uuid), permissionId: string (uuid) }

#### `DELETE` /roles/{id}/permissions/{permissionId}

Revocar un permiso del rol.

**Acceso:** `staff.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `permissionId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es { roleId: string (uuid), permissionId: string (uuid) }

### Permisos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /permissions](#get-permissions) | Listar permisos | sesión |
| [`POST` /permissions](#post-permissions) | Crear un permiso | plataforma |
| [`GET` /permissions/{id}](#get-permissionsid) | Obtener un permiso por id | sesión |
| [`PATCH` /permissions/{id}](#patch-permissionsid) | Actualizar un permiso | plataforma |
| [`DELETE` /permissions/{id}](#delete-permissionsid) | Desactivar un permiso (baja lógica) | plataforma |

#### `GET` /permissions

Listar permisos.

**Acceso:** sesión

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [PermissionResponseDto](#permissionresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /permissions

Crear un permiso.

**Acceso:** plataforma

**Body (JSON)** ([CreatePermissionDto](#createpermissiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"orders.manage"` |
| `name` | string | sí | Ej.: `"Gestionar pedidos"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [PermissionResponseDto](#permissionresponsedto)

#### `GET` /permissions/{id}

Obtener un permiso por id.

**Acceso:** sesión

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [PermissionResponseDto](#permissionresponsedto)

#### `PATCH` /permissions/{id}

Actualizar un permiso.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdatePermissionDto](#updatepermissiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Gestionar pedidos"` |
| `description` | string | no |  |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [PermissionResponseDto](#permissionresponsedto)

#### `DELETE` /permissions/{id}

Desactivar un permiso (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Categorías de productos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /categories](#get-categories) | Listar categorías | miembro |
| [`POST` /categories](#post-categories) | Crear una categoría de productos | `catalog.manage` |
| [`GET` /categories/{id}](#get-categoriesid) | Obtener una categoría por id | miembro |
| [`PATCH` /categories/{id}](#patch-categoriesid) | Actualizar una categoría (nombre, padre, activar/desactivar) | `catalog.manage` |
| [`DELETE` /categories/{id}](#delete-categoriesid) | Desactivar una categoría (baja lógica) | `catalog.manage` |

#### `GET` /categories

Listar categorías.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `parentCategoryId` | string | no | Solo las hijas directas. |
| `rootOnly` | boolean | no | Solo las categorías raíz. |
| `isActive` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [CategoryResponseDto](#categoryresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /categories

Crear una categoría de productos.

**Acceso:** `catalog.manage`

**Body (JSON)** ([CreateCategoryDto](#createcategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `parentCategoryId` | string | no | Categoría padre de la misma organización (vacío = categoría raíz) |
| `name` | string | sí | Único dentro del mismo padre (sin distinguir mayúsculas) Ej.: `"Bebidas"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [CategoryResponseDto](#categoryresponsedto)

#### `GET` /categories/{id}

Obtener una categoría por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [CategoryResponseDto](#categoryresponsedto)

#### `PATCH` /categories/{id}

Actualizar una categoría (nombre, padre, activar/desactivar).

`parentCategoryId: null` la convierte en categoría raíz.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateCategoryDto](#updatecategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `parentCategoryId` | string | no | Categoría padre de la misma organización (vacío = categoría raíz) |
| `name` | string | no | Único dentro del mismo padre (sin distinguir mayúsculas) Ej.: `"Bebidas"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

**Respuesta `200`:** `data` es [CategoryResponseDto](#categoryresponsedto)

#### `DELETE` /categories/{id}

Desactivar una categoría (baja lógica).

No se borra: los productos y secciones que la usan la conservan.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Productos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /products](#get-products) | Listar productos | miembro |
| [`POST` /products](#post-products) | Crear un producto | `catalog.manage` |
| [`GET` /products/{id}](#get-productsid) | Obtener un producto por id | miembro |
| [`PATCH` /products/{id}](#patch-productsid) | Actualizar un producto (precio, disponibilidad, estado...) | `catalog.manage` |
| [`DELETE` /products/{id}](#delete-productsid) | Desactivar un producto (baja lógica) | `catalog.manage` |
| [`GET` /products/{id}/categories](#get-productsidcategories) | Categorías del producto | miembro |
| [`POST` /products/{id}/categories](#post-productsidcategories) | Agregar el producto a una categoría de su organización | `catalog.manage` |
| [`DELETE` /products/{id}/categories/{categoryId}](#delete-productsidcategoriescategoryid) | Quitar el producto de una categoría | `catalog.manage` |
| [`GET` /products/{productId}/ingredients](#get-productsproductidingredients) | Ingredientes del producto | miembro |
| [`POST` /products/{productId}/ingredients](#post-productsproductidingredients) | Agregar un ingrediente | `catalog.manage` |
| [`PATCH` /products/{productId}/ingredients/{ingredientId}](#patch-productsproductidingredientsingredientid) | Editar un ingrediente | `catalog.manage` |
| [`DELETE` /products/{productId}/ingredients/{ingredientId}](#delete-productsproductidingredientsingredientid) | Eliminar un ingrediente | `catalog.manage` |

#### `GET` /products

Listar productos.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `categoryId` | string | no | Productos de esa categoría. |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ProductResponseDto](#productresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /products

Crear un producto.

**Acceso:** `catalog.manage`

**Body (JSON)** ([CreateProductDto](#createproductdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryIds` | string[] | no | Categorías de la organización de la sede (puede tener varias o ninguna) |
| `code` | string | sí | Único dentro del restaurante. Ej.: `"CEV-01"` |
| `name` | string | sí | Ej.: `"Ceviche clásico"` |
| `description` | string | no | Ej.: `"Pescado fresco marinado en limón"` |
| `imageUrl` | string | no | Ej.: `"https://cdn.example.com/ceviche.jpg"` |
| `price` | number | sí | (mín. 0) Ej.: `32.5` |
| `preparationMinutes` | number | no | Ej.: `15` |
| `isAvailable` | boolean | no | false = agotado hoy (sigue en la carta, no se puede pedir) Por defecto: `true`. |
| `isTakeawayAllowed` | boolean | no | Se puede pedir para recojo. Por defecto: `true`. |
| `isDeliveryAllowed` | boolean | no | Se puede pedir por delivery. Por defecto: `true`. |
| `tags` | string[] | no | Etiquetas libres para buscar y filtrar (hasta 20; se ignoran repetidas) Ej.: `["picante","bandera"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no | Ej.: `"En plato hondo, con arroz aparte"` |
| `menu` | [ProductMenuPlacementDto](#productmenuplacementdto) | no | Lo agrega a un menú en la misma transacción (crear y publicar en una llamada) |

**Respuesta `201`:** `data` es [ProductResponseDto](#productresponsedto)

#### `GET` /products/{id}

Obtener un producto por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [ProductResponseDto](#productresponsedto)

#### `PATCH` /products/{id}

Actualizar un producto (precio, disponibilidad, estado...).

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateProductDto](#updateproductdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | no | Único dentro del restaurante. Ej.: `"CEV-01"` |
| `name` | string | no | Ej.: `"Ceviche clásico"` |
| `description` | string | no | Ej.: `"Pescado fresco marinado en limón"` |
| `imageUrl` | string | no | Ej.: `"https://cdn.example.com/ceviche.jpg"` |
| `price` | number | no | (mín. 0) Ej.: `32.5` |
| `preparationMinutes` | number | no | Ej.: `15` |
| `isAvailable` | boolean | no | false = agotado hoy (sigue en la carta, no se puede pedir) Por defecto: `true`. |
| `isTakeawayAllowed` | boolean | no | Se puede pedir para recojo. Por defecto: `true`. |
| `isDeliveryAllowed` | boolean | no | Se puede pedir por delivery. Por defecto: `true`. |
| `tags` | string[] | no | Etiquetas libres para buscar y filtrar (hasta 20; se ignoran repetidas) Ej.: `["picante","bandera"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no | Ej.: `"En plato hondo, con arroz aparte"` |
| `status` | `ACTIVE` \| `INACTIVE` | no |  |

**Respuesta `200`:** `data` es [ProductResponseDto](#productresponsedto)

#### `DELETE` /products/{id}

Desactivar un producto (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

#### `GET` /products/{id}/categories

Categorías del producto.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [CategoryResponseDto](#categoryresponsedto)[]

#### `POST` /products/{id}/categories

Agregar el producto a una categoría de su organización.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([AddProductCategoryDto](#addproductcategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | sí |  |

**Respuesta `201`:** `data` es [CategoryResponseDto](#categoryresponsedto)

#### `DELETE` /products/{id}/categories/{categoryId}

Quitar el producto de una categoría.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `categoryId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es { productId: string (uuid), categoryId: string (uuid) }

#### `GET` /products/{productId}/ingredients

Ingredientes del producto.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IngredientResponseDto](#ingredientresponsedto)[]

#### `POST` /products/{productId}/ingredients

Agregar un ingrediente.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |

**Body (JSON)** ([CreateIngredientDto](#createingredientdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Cebolla morada"` |
| `sortOrder` | number | no | Orden en que se muestra (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | Mostrarlo en la carta. Por defecto: `true`. |

**Respuesta `201`:** `data` es [IngredientResponseDto](#ingredientresponsedto)

#### `PATCH` /products/{productId}/ingredients/{ingredientId}

Editar un ingrediente.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |
| `ingredientId` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateIngredientDto](#updateingredientdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Cebolla morada"` |
| `sortOrder` | number | no | Orden en que se muestra (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | Mostrarlo en la carta. Por defecto: `true`. |

**Respuesta `200`:** `data` es [IngredientResponseDto](#ingredientresponsedto)

#### `DELETE` /products/{productId}/ingredients/{ingredientId}

Eliminar un ingrediente.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |
| `ingredientId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Menús

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /menus](#get-menus) | Listar menús | miembro |
| [`POST` /menus](#post-menus) | Crear un menú | `catalog.manage` |
| [`GET` /menus/{id}](#get-menusid) | Obtener un menú por id | miembro |
| [`PATCH` /menus/{id}](#patch-menusid) | Actualizar un menú (incluye estado y vigencia) | `catalog.manage` |
| [`DELETE` /menus/{id}](#delete-menusid) | Desactivar un menú (baja lógica) | `catalog.manage` |
| [`GET` /menus/{id}/products](#get-menusidproducts) | Productos del menú con sus datos | miembro |
| [`POST` /menus/{id}/products](#post-menusidproducts) | Agregar un producto del mismo restaurante al menú | `catalog.manage` |
| [`PUT` /menus/{id}/products/order](#put-menusidproductsorder) | Reordenar los productos de una sección del menú en una sola petición | `catalog.manage` |
| [`PATCH` /menus/{id}/products/{productId}](#patch-menusidproductsproductid) | Cambiar sección, precio mostrado, orden o visibilidad | `catalog.manage` |
| [`DELETE` /menus/{id}/products/{productId}](#delete-menusidproductsproductid) | Quitar un producto del menú | `catalog.manage` |
| [`GET` /menus/{menuId}/sections](#get-menusmenuidsections) | Secciones del menú, en orden | miembro |
| [`POST` /menus/{menuId}/sections](#post-menusmenuidsections) | Crear una sección del menú | `catalog.manage` |
| [`PUT` /menus/{menuId}/sections/order](#put-menusmenuidsectionsorder) | Reordenar todas las secciones del menú en una sola petición | `catalog.manage` |
| [`PATCH` /menus/{menuId}/sections/{sectionId}](#patch-menusmenuidsectionssectionid) | Editar, ordenar u ocultar una sección | `catalog.manage` |
| [`DELETE` /menus/{menuId}/sections/{sectionId}](#delete-menusmenuidsectionssectionid) | Desactivar una sección (baja lógica) | `catalog.manage` |

#### `GET` /menus

Listar menús.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [MenuResponseDto](#menuresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /menus

Crear un menú.

**Acceso:** `catalog.manage`

**Body (JSON)** ([CreateMenuDto](#createmenudto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Carta principal"` |
| `description` | string | no |  |
| `validFrom` | string (fecha-hora ISO) | no | Ej.: `"2026-11-01T00:00:00-05:00"` |
| `validUntil` | string (fecha-hora ISO) | no | Ej.: `"2026-12-31T23:59:59-05:00"` |

**Respuesta `201`:** `data` es [MenuResponseDto](#menuresponsedto)

#### `GET` /menus/{id}

Obtener un menú por id.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [MenuResponseDto](#menuresponsedto)

#### `PATCH` /menus/{id}

Actualizar un menú (incluye estado y vigencia).

Una sede tiene un solo menú activo: pasar uno a ACTIVE deja INACTIVE al que estaba activo, en la misma transacción.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateMenuDto](#updatemenudto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Carta principal"` |
| `description` | string | no |  |
| `validFrom` | string (fecha-hora ISO) | no | Ej.: `"2026-11-01T00:00:00-05:00"` |
| `validUntil` | string (fecha-hora ISO) | no | Ej.: `"2026-12-31T23:59:59-05:00"` |
| `status` | `DRAFT` \| `ACTIVE` \| `INACTIVE` | no |  |

**Respuesta `200`:** `data` es [MenuResponseDto](#menuresponsedto)

#### `DELETE` /menus/{id}

Desactivar un menú (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

#### `GET` /menus/{id}/products

Productos del menú con sus datos.

Cada entrada (sección, orden, precio mostrado, visibilidad) trae su producto completo, incluidos los inactivos y agotados.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [MenuProductDetailResponseDto](#menuproductdetailresponsedto)[]

#### `POST` /menus/{id}/products

Agregar un producto del mismo restaurante al menú.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([AddMenuProductDto](#addmenuproductdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí | Ej.: `"7c1e6f2a-2222-4b3a-9a1a-9f3b2c1d4e5f"` |
| `menuSectionId` | string \| null | no | Sección del mismo menú (null = sin sección) |
| `displayPrice` | number | no | Precio a mostrar en este menú (el pedido usa el precio del producto) Ej.: `29.9` |
| `sortOrder` | number | no | Orden dentro de su sección (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | false = oculto en la carta sin quitarlo del menú. Por defecto: `true`. |

**Respuesta `201`:** `data` es [MenuProductResponseDto](#menuproductresponsedto)

#### `PUT` /menus/{id}/products/order

Reordenar los productos de una sección del menú en una sola petición.

productIds debe traer todos los productos de esa sección (o, sin menuSectionId, todos los que no tienen sección) una sola vez; si no, 400 y no cambia nada.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ReorderMenuProductsDto](#reordermenuproductsdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuSectionId` | string \| null | no | Sección cuyos productos se ordenan; null u omitido = los productos sin sección. |
| `productIds` | string[] | sí | Todos los productos de esa sección en el nuevo orden. |

**Respuesta `200`:** `data` es [MenuProductResponseDto](#menuproductresponsedto)[]

#### `PATCH` /menus/{id}/products/{productId}

Cambiar sección, precio mostrado, orden o visibilidad.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `productId` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateMenuProductDto](#updatemenuproductdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuSectionId` | string \| null | no | Sección del mismo menú (null = sin sección) |
| `displayPrice` | number | no | Precio a mostrar en este menú (el pedido usa el precio del producto) Ej.: `29.9` |
| `sortOrder` | number | no | Orden dentro de su sección (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | false = oculto en la carta sin quitarlo del menú. Por defecto: `true`. |

**Respuesta `200`:** `data` es [MenuProductResponseDto](#menuproductresponsedto)

#### `DELETE` /menus/{id}/products/{productId}

Quitar un producto del menú.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `productId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es { menuId: string (uuid), productId: string (uuid) }

#### `GET` /menus/{menuId}/sections

Secciones del menú, en orden.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [MenuSectionResponseDto](#menusectionresponsedto)[]

#### `POST` /menus/{menuId}/sections

Crear una sección del menú.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string (uuid) | sí |  |

**Body (JSON)** ([CreateMenuSectionDto](#createmenusectiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Único dentro del menú (sin distinguir mayúsculas) Ej.: `"Entradas"` |
| `categoryId` | string | no | Categoría que reutiliza la sección (opcional) |
| `sortOrder` | number | no | Orden de la sección en el menú (menor primero) Por defecto: `0`. |

**Respuesta `201`:** `data` es [MenuSectionResponseDto](#menusectionresponsedto)

#### `PUT` /menus/{menuId}/sections/order

Reordenar todas las secciones del menú en una sola petición.

ids debe traer todas las secciones del menú (incluidas las ocultas) una sola vez; si no, 400 y no cambia nada.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string (uuid) | sí |  |

**Body (JSON)** ([ReorderMenuSectionsDto](#reordermenusectionsdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `ids` | string[] | sí | Todas las secciones del menú (incluidas las ocultas) en el nuevo orden. |

**Respuesta `200`:** `data` es [MenuSectionResponseDto](#menusectionresponsedto)[]

#### `PATCH` /menus/{menuId}/sections/{sectionId}

Editar, ordenar u ocultar una sección.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string (uuid) | sí |  |
| `sectionId` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateMenuSectionDto](#updatemenusectiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Único dentro del menú (sin distinguir mayúsculas) Ej.: `"Entradas"` |
| `categoryId` | string | no | Categoría que reutiliza la sección (opcional) |
| `sortOrder` | number | no | Orden de la sección en el menú (menor primero) Por defecto: `0`. |
| `isActive` | boolean | no | false = ocultar la sección, true = mostrarla. |

**Respuesta `200`:** `data` es [MenuSectionResponseDto](#menusectionresponsedto)

#### `DELETE` /menus/{menuId}/sections/{sectionId}

Desactivar una sección (baja lógica).

Con productos exige moveProductsTo (otra sección activa del mismo menú): pasan a esa sección en la misma transacción. Sin él → 422 SECTION_HAS_PRODUCTS.

**Acceso:** `catalog.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string (uuid) | sí |  |
| `sectionId` | string (uuid) | sí |  |

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `moveProductsTo` | string | no | Sección que recibe los productos. |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Estados y tipos de servicio

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /attention-statuses](#get-attention-statuses) | Estados comerciales de atención de una sede (activos e inactivos) | miembro |
| [`POST` /attention-statuses](#post-attention-statuses) | Crear un estado de atención propio de la sede | `settings.manage` |
| [`PATCH` /attention-statuses/{id}](#patch-attention-statusesid) | Renombrar, ordenar, marcar inicial o desactivar un estado de atención | `settings.manage` |
| [`GET` /order-statuses](#get-order-statuses) | Estados operativos de órdenes y platos de una sede | miembro |
| [`POST` /order-statuses](#post-order-statuses) | Crear un estado operativo propio de la sede (p. ej. "En horno") | `settings.manage` |
| [`PATCH` /order-statuses/{id}](#patch-order-statusesid) | Renombrar, ordenar, marcar inicial o desactivar un estado operativo | `settings.manage` |
| [`GET` /service-types](#get-service-types) | Tipos de servicio de una sede (activos e inactivos) | miembro |
| [`POST` /service-types](#post-service-types) | Crear un tipo de servicio de la sede | `settings.manage` |
| [`PATCH` /service-types/{id}](#patch-service-typesid) | Configurar, ordenar o retirar un tipo de servicio | `settings.manage` |

#### `GET` /attention-statuses

Estados comerciales de atención de una sede (activos e inactivos).

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |

**Respuesta `200`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)[]

#### `POST` /attention-statuses

Crear un estado de atención propio de la sede.

**Acceso:** `settings.manage`

**Body (JSON)** ([CreateAttentionStatusDto](#createattentionstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `restaurantId` | string | sí | Sede dueña del estado. |
| `code` | string | sí | Ej.: `"ESPERANDO_PAGO"` |
| `name` | string | sí | Ej.: `"Esperando pago"` |
| `sortOrder` | number | sí | Ej.: `25` |
| `canonicalState` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí | Lo que el backend hace con este estado; no se puede cambiar. |

**Respuesta `201`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)

#### `PATCH` /attention-statuses/{id}

Renombrar, ordenar, marcar inicial o desactivar un estado de atención.

**Acceso:** `settings.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateWorkflowStatusDto](#updateworkflowstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `code` | string | no | Único por sede. Ej.: `"EN_HORNO"` |
| `name` | string | no | Ej.: `"En horno"` |
| `sortOrder` | number | no | Ej.: `35` |
| `isActive` | boolean | no | false lo desactiva (los registros que lo usan lo conservan). No aplica al estado inicial ni al último activo de su estado canónico. |

**Respuesta `200`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)

#### `GET` /order-statuses

Estados operativos de órdenes y platos de una sede.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |

**Respuesta `200`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)[]

#### `POST` /order-statuses

Crear un estado operativo propio de la sede (p. ej. "En horno").

**Acceso:** `settings.manage`

**Body (JSON)** ([CreateOrderStatusDto](#createorderstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `restaurantId` | string | sí | Sede dueña del estado. |
| `code` | string | sí | Ej.: `"EN_HORNO"` |
| `name` | string | sí | Ej.: `"En horno"` |
| `sortOrder` | number | sí | Ej.: `35` |
| `canonicalState` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí | Lo que el backend hace con este estado; no se puede cambiar. |

**Respuesta `201`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)

#### `PATCH` /order-statuses/{id}

Renombrar, ordenar, marcar inicial o desactivar un estado operativo.

**Acceso:** `settings.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateWorkflowStatusDto](#updateworkflowstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `code` | string | no | Único por sede. Ej.: `"EN_HORNO"` |
| `name` | string | no | Ej.: `"En horno"` |
| `sortOrder` | number | no | Ej.: `35` |
| `isActive` | boolean | no | false lo desactiva (los registros que lo usan lo conservan). No aplica al estado inicial ni al último activo de su estado canónico. |

**Respuesta `200`:** `data` es [WorkflowStatusResponseDto](#workflowstatusresponsedto)

#### `GET` /service-types

Tipos de servicio de una sede (activos e inactivos).

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |

**Respuesta `200`:** `data` es [ServiceTypeResponseDto](#servicetyperesponsedto)[]

#### `POST` /service-types

Crear un tipo de servicio de la sede.

**Acceso:** `settings.manage`

**Body (JSON)** ([CreateServiceTypeDto](#createservicetypedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requiresTable` | boolean | no | Solo DINE_IN. |
| `requiresCustomerAddress` | boolean | no | Solo DELIVERY. |
| `minimumOrderAmount` | number | no | Ej.: `30` |
| `deliveryFee` | number | no | Ej.: `7.5` |
| `restaurantId` | string | sí | Sede que ofrece el tipo de servicio. |
| `code` | string | sí | Ej.: `"DELIVERY_PROPIO"` |
| `name` | string | sí | Ej.: `"Delivery propio"` |
| `sortOrder` | number | sí | Ej.: `30` |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí | Reglas que aplica el backend; no se puede cambiar. |

**Respuesta `201`:** `data` es [ServiceTypeResponseDto](#servicetyperesponsedto)

#### `PATCH` /service-types/{id}

Configurar, ordenar o retirar un tipo de servicio.

**Acceso:** `settings.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateServiceTypeDto](#updateservicetypedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requiresTable` | boolean | no | Solo DINE_IN. |
| `requiresCustomerAddress` | boolean | no | Solo DELIVERY. |
| `minimumOrderAmount` | number | no | Ej.: `30` |
| `deliveryFee` | number | no | Ej.: `7.5` |
| `code` | string | no | Único por sede. Ej.: `"DELIVERY_PROPIO"` |
| `name` | string | no | Ej.: `"Delivery propio"` |
| `sortOrder` | number | no | Ej.: `30` |
| `isActive` | boolean | no | false lo retira; las atenciones que lo usaron lo conservan. |

**Respuesta `200`:** `data` es [ServiceTypeResponseDto](#servicetyperesponsedto)

### Atenciones (mesas y pedidos)

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /attentions](#get-attentions) | Atenciones de la sede con sus platos (tablero, cocina, historial) | miembro |
| [`POST` /attentions](#post-attentions) | Abrir una atención (mesa, recojo o delivery) | `attentions.manage` |
| [`GET` /attentions/{id}](#get-attentionsid) | Detalle: participantes, órdenes y estado de cada plato | miembro |
| [`POST` /attentions/{id}/orders](#post-attentionsidorders) | Registrar una orden tomada por el mozo | `attentions.manage` |
| [`GET` /attentions/{id}/timeline](#get-attentionsidtimeline) | Historial de la atención y de sus platos, del más antiguo al más reciente | miembro |
| [`GET` /attentions/{id}/bill](#get-attentionsidbill) | Cuenta: ítems cobrables, total, pagado y saldo | miembro |
| [`POST` /attentions/{id}/request-bill](#post-attentionsidrequest-bill) | Marcar que se pidió la cuenta | `attentions.manage` |
| [`POST` /attentions/{id}/close](#post-attentionsidclose) | Cerrar la atención (solo con saldo cero) | `attentions.manage` |
| [`POST` /attentions/{id}/cancel](#post-attentionsidcancel) | Cancelar la atención (no permitido si tiene pagos) | `attentions.manage` |
| [`PATCH` /attentions/{id}/fulfillment/status](#patch-attentionsidfulfillmentstatus) | Avanzar el recojo/delivery por su flujo de estados | `attentions.manage` |
| [`POST` /attentions/orders/{orderId}/confirm](#post-attentionsordersorderidconfirm) | Confirmar una orden recibida | `attentions.manage` |
| [`POST` /attentions/orders/{orderId}/cancel](#post-attentionsordersorderidcancel) | Cancelar una orden completa | `attentions.manage` |

#### `GET` /attentions

Atenciones de la sede con sus platos (tablero, cocina, historial).

De la más reciente a la más antigua. active=true: solo OPEN / BILL_REQUESTED (tablero en vivo). from / to: fecha comercial de apertura en la zona horaria de la sede (historial).

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | no |  |
| `active` | boolean | no |  |
| `from` | string | no | Ej.: `"2026-11-01"` |
| `to` | string | no | Ej.: `"2026-11-08"` |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [AttentionWithItemsResponseDto](#attentionwithitemsresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /attentions

Abrir una atención (mesa, recojo o delivery).

Una mesa solo puede tener una atención activa (OPEN o BILL_REQUESTED).

**Acceso:** `attentions.manage`

**Body (JSON)** ([OpenAttentionDto](#openattentiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `serviceTypeId` | string | no | Tipo de servicio de la sede (GET /service-types). Alternativa a fulfillmentMode. |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | no | Usa el primer tipo de servicio activo de la sede con esta modalidad. |
| `diningTableId` | string | no | Requerido si el tipo de servicio exige mesa. |
| `restaurantId` | string | no | Requerido sin mesa ni serviceTypeId. |
| `customerUserId` | string | no | Comensal registrado titular de la cuenta. |
| `fulfillment` | [FulfillmentDto](#fulfillmentdto) | no | Requerido en PICKUP / DELIVERY. |

**Respuesta `201`:** `data` es [AttentionResponseDto](#attentionresponsedto)

#### `GET` /attentions/{id}

Detalle: participantes, órdenes y estado de cada plato.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [AttentionDetailResponseDto](#attentiondetailresponsedto)

#### `POST` /attentions/{id}/orders

Registrar una orden tomada por el mozo.

Nace confirmada (CONFIRMED): el mozo ya la revisó, así que no pasa por la confirmación de las órdenes del comensal; sus platos quedan en SUBMITTED esperando a cocina. Queda a nombre del usuario de la sesión salvo submittedByUserId. Idempotente por requestId; si la cuenta estaba pedida vuelve a OPEN.

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([WaiterOrderDto](#waiterorderdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |
| `submittedByUserId` | string | no | Mozo que registra la orden. |

**Respuesta `201`:** `data` es [OrderResponseDto](#orderresponsedto)

#### `GET` /attentions/{id}/timeline

Historial de la atención y de sus platos, del más antiguo al más reciente.

Apertura, órdenes enviadas y confirmadas, cada cambio de estado de cada plato (con quién y por qué), pedido de cuenta, cierre o cancelación. Solo se conoce el último pedido de cuenta.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [TimelineEventResponseDto](#timelineeventresponsedto)[]

#### `GET` /attentions/{id}/bill

Cuenta: ítems cobrables, total, pagado y saldo.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [AttentionBillResponseDto](#attentionbillresponsedto)

#### `POST` /attentions/{id}/request-bill

Marcar que se pidió la cuenta.

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [AttentionResponseDto](#attentionresponsedto)

#### `POST` /attentions/{id}/close

Cerrar la atención (solo con saldo cero).

Si ya estaba cerrada la devuelve tal cual (200, sin cambios). Una cancelada no se cierra (422).

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [AttentionResponseDto](#attentionresponsedto)

#### `POST` /attentions/{id}/cancel

Cancelar la atención (no permitido si tiene pagos).

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([CancelAttentionDto](#cancelattentiondto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `reason` | string | sí | Ej.: `"El cliente se retiró"` |

**Respuesta `200`:** `data` es [AttentionResponseDto](#attentionresponsedto)

#### `PATCH` /attentions/{id}/fulfillment/status

Avanzar el recojo/delivery por su flujo de estados.

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ChangeFulfillmentStatusDto](#changefulfillmentstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `status` | `PENDING` \| `CONFIRMED` \| `PREPARING` \| `READY` \| `OUT_FOR_DELIVERY` \| `COMPLETED` \| `CANCELLED` | sí | PENDING→CONFIRMED→PREPARING→READY→(PICKUP: COMPLETED \| DELIVERY: OUT_FOR_DELIVERY→COMPLETED); CANCELLED desde cualquier estado no final. |
| `estimatedReadyAt` | string (fecha-hora ISO) | no | Hora estimada de listo (útil al confirmar) |

**Respuesta `200`:** `data` es [FulfillmentResponseDto](#fulfillmentresponsedto)

#### `POST` /attentions/orders/{orderId}/confirm

Confirmar una orden recibida.

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `orderId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [OrderResponseDto](#orderresponsedto)

#### `POST` /attentions/orders/{orderId}/cancel

Cancelar una orden completa.

Solo si ningún producto se sirvió. Cancela sus productos pendientes; la atención y sus otras órdenes no cambian.

**Acceso:** `attentions.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `orderId` | string (uuid) | sí |  |

**Body (JSON)** ([CancelOrderDto](#cancelorderdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `reason` | string | sí | Ej.: `"La mesa cambió de pedido"` |

**Respuesta `200`:** `data` es [OrderResponseDto](#orderresponsedto)

### Platos (cocina)

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /order-items](#get-order-items) | Platos de un restaurante (tablero de cocina) | miembro |
| [`GET` /order-items/{id}](#get-order-itemsid) | Obtener un plato | miembro |
| [`POST` /order-items/status](#post-order-itemsstatus) | Cambiar el estado de varios platos a la vez | `kitchen.manage` |
| [`PATCH` /order-items/{id}/status](#patch-order-itemsidstatus) | Cambiar el estado de un plato | `kitchen.manage` |
| [`GET` /order-items/{id}/history](#get-order-itemsidhistory) | Historial de estados del plato | miembro |

#### `GET` /order-items

Platos de un restaurante (tablero de cocina).

Por defecto solo platos de atenciones activas (OPEN / BILL_REQUESTED). includeClosed=true incluye también las cerradas y canceladas.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `status` | string[] | no | Uno o varios estados canónicos separados por coma, ej. SUBMITTED,IN_PREPARATION. |
| `includeClosed` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [OrderItemResponseDto](#orderitemresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `GET` /order-items/{id}

Obtener un plato.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [OrderItemResponseDto](#orderitemresponsedto)

#### `POST` /order-items/status

Cambiar el estado de varios platos a la vez.

"Confirmar todo" / "Marcar listos". Cada plato cambia por separado con las mismas reglas que PATCH :id/status: uno que no puede cambiar (transición no permitida, versión distinta, de otra sede) va a failed con su errorCode y los demás siguen. Queda a nombre del usuario de la sesión.

**Acceso:** `kitchen.manage`

**Body (JSON)** ([BulkChangeOrderItemStatusDto](#bulkchangeorderitemstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Sede de todos los platos. |
| `items` | [BulkStatusItemDto](#bulkstatusitemdto)[] | sí |  |
| `statusId` | string | no | Estado de la sede. Alternativa a status. |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | no |  |
| `reason` | string | no | Obligatorio para REJECTED. |

**Respuesta `200`:** `data` es [BulkStatusChangeResponseDto](#bulkstatuschangeresponsedto)

#### `PATCH` /order-items/{id}/status

Cambiar el estado de un plato.

Destino por statusId (estado de la sede) o status (estado canónico). Flujo canónico: SUBMITTED→IN_PREPARATION/REJECTED/CANCELLED, IN_PREPARATION→READY/CANCELLED, READY→SERVED/CANCELLED; dentro de un estado no final se puede pasar entre los estados propios de la sede. Cada cambio queda en el historial.

**Acceso:** `kitchen.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ChangeOrderItemStatusDto](#changeorderitemstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `statusId` | string | no | Estado de la sede (GET /order-statuses). Alternativa a status. |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | no | Usa el primer estado activo de la sede con este estado canónico. |
| `version` | number | no | Versión leída del ítem. Si otro empleado lo cambió antes, responde 409 en lugar de sobrescribir. |
| `reason` | string | no | Obligatorio para REJECTED. |
| `changedByUserId` | string | no | Quién hizo el cambio, para el historial. |

**Respuesta `200`:** `data` es [OrderItemResponseDto](#orderitemresponsedto)

**Errores propios:**

- `409`: Transición no permitida o el plato fue modificado por otro empleado

#### `GET` /order-items/{id}/history

Historial de estados del plato.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [OrderItemHistoryResponseDto](#orderitemhistoryresponsedto)[]

### Pagos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /payments](#get-payments) | Listar pagos de una atención o de una sede | `payments.read` |
| [`POST` /payments](#post-payments) | Registrar un pago (toda la cuenta, un monto libre o productos elegidos) | `payments.manage` |
| [`GET` /payments/balance/{attentionId}](#get-paymentsbalanceattentionid) | Saldo de una atención por producto | `payments.read` |
| [`GET` /payments/{id}](#get-paymentsid) | Obtener un pago con sus asignaciones | `payments.read` |
| [`POST` /payments/{id}/cancel](#post-paymentsidcancel) | Cancelar un intento de pago pendiente o en proceso | `payments.manage` |
| [`PATCH` /payments/{id}/status](#patch-paymentsidstatus) | Cambiar a mano el estado de un pago pendiente o en proceso | `payments.manage` |

#### `GET` /payments

Listar pagos de una atención o de una sede.

Del más reciente al más antiguo. from / to: fechas comerciales en la zona horaria de la sede; un pago confirmado cuenta el día en que se pagó y uno pendiente o fallido el día en que se registró.

**Acceso:** `payments.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string | no |  |
| `restaurantId` | string | no |  |
| `status` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | no |  |
| `from` | string | no | Ej.: `"2026-11-01"` |
| `to` | string | no | Ej.: `"2026-11-08"` |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [PaymentResponseDto](#paymentresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /payments

Registrar un pago (toda la cuenta, un monto libre o productos elegidos).

El servidor calcula o valida cada monto contra el saldo pendiente; nunca confía en montos del cliente. Sin `provider` el pago queda PAID. Idempotente por requestId: 201 la primera vez, 200 al repetirlo.

**Acceso:** `payments.manage`

**Body (JSON)** ([RegisterPaymentDto](#registerpaymentdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string | sí | Atención que se cobra (activa) |
| `requestId` | string | sí | UUID generado por el cliente. Reenviarlo devuelve el mismo pago. |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | sí |  |
| `allocationMode` | `ITEMS` \| `FULL` \| `AMOUNT` | sí | FULL: todo el saldo. AMOUNT: un monto libre (se reparte automáticamente). ITEMS: productos y montos elegidos. |
| `amount` | number | no | Solo para AMOUNT. Ej.: `45` |
| `allocations` | [RequestedAllocationDto](#requestedallocationdto)[] | no | Solo para ITEMS. |
| `payerUserId` | string | no | Usuario que paga, si tiene cuenta. |
| `payerName` | string | no | Ej.: `"Ana"` |
| `externalReference` | string | no | Referencia manual, p. ej. número de operación Yape. |
| `notes` | string | no |  |
| `provider` | [ProviderDataDto](#providerdatadto) | no | Solo si interviene una pasarela; sin esto el pago queda PAID. |

**Respuesta `201`:** `data` es [PaymentResponseDto](#paymentresponsedto)

#### `GET` /payments/balance/{attentionId}

Saldo de una atención por producto.

Total, pagado, reservado por pagos pendientes y pendiente de cada producto y del costo de envío.

**Acceso:** `payments.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [AttentionBalanceDto](#attentionbalancedto)

#### `GET` /payments/{id}

Obtener un pago con sus asignaciones.

**Acceso:** `payments.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [PaymentResponseDto](#paymentresponsedto)

#### `POST` /payments/{id}/cancel

Cancelar un intento de pago pendiente o en proceso.

Libera el saldo que reservaba. Un pago confirmado no se cancela.

**Acceso:** `payments.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [PaymentResponseDto](#paymentresponsedto)

#### `PATCH` /payments/{id}/status

Cambiar a mano el estado de un pago pendiente o en proceso.

PENDING / PROCESSING → PROCESSING, PAID, FAILED o CANCELLED (p. ej. el voucher del POS salió aprobado o rechazado). Confirmar exige que la atención siga activa; el monto ya estaba reservado, así que nunca supera el saldo. Repetir el estado actual no cambia nada. Sin reembolsos por ahora (422).

**Acceso:** `payments.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ChangePaymentStatusDto](#changepaymentstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `status` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí | PROCESSING, PAID, FAILED o CANCELLED. Los reembolsos (PARTIALLY_REFUNDED / REFUNDED) aún no están habilitados (422) |

**Respuesta `200`:** `data` es [PaymentResponseDto](#paymentresponsedto)

### Unidades y tipos de movimiento

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /units-of-measure](#get-units-of-measure) | Unidades de medida del catálogo de ACMR | sesión |
| [`GET` /inventory-movement-types](#get-inventory-movement-types) | Tipos de movimiento y su efecto sobre el stock | sesión |

#### `GET` /units-of-measure

Unidades de medida del catálogo de ACMR.

**Acceso:** sesión

**Respuesta `200`:** `data` es [UnitOfMeasureResponseDto](#unitofmeasureresponsedto)[]

#### `GET` /inventory-movement-types

Tipos de movimiento y su efecto sobre el stock.

**Acceso:** sesión

**Respuesta `200`:** `data` es [MovementTypeResponseDto](#movementtyperesponsedto)[]

### Categorías de insumos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /inventory-categories](#get-inventory-categories) | Listar categorías de inventario | miembro |
| [`POST` /inventory-categories](#post-inventory-categories) | Crear una categoría de inventario | `inventory.manage` |
| [`GET` /inventory-categories/{id}](#get-inventory-categoriesid) | Obtener una categoría de inventario | miembro |
| [`PATCH` /inventory-categories/{id}](#patch-inventory-categoriesid) | Actualizar una categoría de inventario | `inventory.manage` |
| [`DELETE` /inventory-categories/{id}](#delete-inventory-categoriesid) | Desactivar una categoría de inventario (baja lógica) | `inventory.manage` |

#### `GET` /inventory-categories

Listar categorías de inventario.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [InventoryCategoryResponseDto](#inventorycategoryresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /inventory-categories

Crear una categoría de inventario.

**Acceso:** `inventory.manage`

**Body (JSON)** ([CreateInventoryCategoryDto](#createinventorycategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Verduras"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [InventoryCategoryResponseDto](#inventorycategoryresponsedto)

#### `GET` /inventory-categories/{id}

Obtener una categoría de inventario.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [InventoryCategoryResponseDto](#inventorycategoryresponsedto)

#### `PATCH` /inventory-categories/{id}

Actualizar una categoría de inventario.

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateInventoryCategoryDto](#updateinventorycategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Verduras"` |
| `description` | string | no |  |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [InventoryCategoryResponseDto](#inventorycategoryresponsedto)

#### `DELETE` /inventory-categories/{id}

Desactivar una categoría de inventario (baja lógica).

No se borra: queda inactivo para conservar el historial.

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Insumos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /supplies](#get-supplies) | Listar insumos maestros | miembro |
| [`POST` /supplies](#post-supplies) | Registrar un insumo en el catálogo de la organización | `inventory.manage` |
| [`GET` /supplies/{id}](#get-suppliesid) | Obtener un insumo maestro | miembro |
| [`PATCH` /supplies/{id}](#patch-suppliesid) | Actualizar un insumo maestro | `inventory.manage` |
| [`DELETE` /supplies/{id}](#delete-suppliesid) | Desactivar un insumo maestro (baja lógica) | `inventory.manage` |

#### `GET` /supplies

Listar insumos maestros.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `categoryId` | string | no |  |
| `isActive` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [SupplyResponseDto](#supplyresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /supplies

Registrar un insumo en el catálogo de la organización.

**Acceso:** `inventory.manage`

**Body (JSON)** ([CreateSupplyDto](#createsupplydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryId` | string | sí | Categoría de inventario de la misma organización. |
| `code` | string | sí | Único por organización (se guarda en mayúsculas) Ej.: `"ARROZ"` |
| `name` | string | sí | Ej.: `"Arroz"` |
| `unitCode` | string | sí | Unidad base del catálogo (GET /units-of-measure) Ej.: `"KG"` |
| `description` | string | no |  |

**Respuesta `201`:** `data` es [SupplyResponseDto](#supplyresponsedto)

#### `GET` /supplies/{id}

Obtener un insumo maestro.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [SupplyResponseDto](#supplyresponsedto)

#### `PATCH` /supplies/{id}

Actualizar un insumo maestro.

La unidad base solo cambia si ninguna sede registró movimientos (422).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateSupplyDto](#updatesupplydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | no | Categoría de inventario de la misma organización. |
| `code` | string | no | Único por organización (se guarda en mayúsculas) Ej.: `"ARROZ"` |
| `name` | string | no | Ej.: `"Arroz"` |
| `unitCode` | string | no | Unidad base del catálogo (GET /units-of-measure) Ej.: `"KG"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

**Respuesta `200`:** `data` es [SupplyResponseDto](#supplyresponsedto)

#### `DELETE` /supplies/{id}

Desactivar un insumo maestro (baja lógica).

Las sedes conservan su historial; ya no se puede habilitar en nuevas sedes.

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

### Stock por sede

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /restaurant-supplies](#get-restaurant-supplies) | Stock de las sedes | miembro |
| [`POST` /restaurant-supplies](#post-restaurant-supplies) | Habilitar un insumo en una sede (stock 0) | `inventory.manage` |
| [`GET` /restaurant-supplies/{id}](#get-restaurant-suppliesid) | Stock de un insumo en una sede | miembro |
| [`PATCH` /restaurant-supplies/{id}](#patch-restaurant-suppliesid) | Cambiar el mínimo o activar/desactivar en la sede (el stock no se edita) | `inventory.manage` |
| [`DELETE` /restaurant-supplies/{id}](#delete-restaurant-suppliesid) | Desactivar el insumo en la sede (baja lógica; conserva el historial) | `inventory.manage` |
| [`GET` /restaurant-supplies/{id}/movements](#get-restaurant-suppliesidmovements) | Historial de movimientos (más reciente primero) | miembro |
| [`POST` /restaurant-supplies/{id}/movements](#post-restaurant-suppliesidmovements) | Registrar una compra, consumo, merma o ajuste manual | `inventory.manage` |
| [`POST` /restaurant-supplies/{id}/counts](#post-restaurant-suppliesidcounts) | Registrar un conteo físico | `inventory.manage` |

#### `GET` /restaurant-supplies

Stock de las sedes.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `supplyId` | string | no |  |
| `isActive` | boolean | no |  |
| `lowStock` | boolean | no | Solo los que llegaron o bajaron del mínimo. |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [RestaurantSupplyResponseDto](#restaurantsupplyresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /restaurant-supplies

Habilitar un insumo en una sede (stock 0).

Con supplyId usa un insumo maestro existente de la organización; con supply crea el insumo maestro y lo habilita aquí en la misma transacción (uno de los dos). supplier: proveedor habitual en la sede.

**Acceso:** `inventory.manage`

**Body (JSON)** ([EnableRestaurantSupplyDto](#enablerestaurantsupplydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Sede donde se habilita el insumo. |
| `supplyId` | string | no | Insumo maestro existente de la misma organización (o supply para crear uno) |
| `supply` | [NewSupplyDto](#newsupplydto) | no | Insumo maestro nuevo: se crea en la organización y se habilita aquí en la misma transacción. |
| `minimumQuantity` | number | no | Por defecto: `0`. Ej.: `5` |
| `supplier` | string \| null | no | Proveedor habitual en esta sede. Ej.: `"Distribuidora Lima"` |

**Respuesta `201`:** `data` es [RestaurantSupplyResponseDto](#restaurantsupplyresponsedto)

#### `GET` /restaurant-supplies/{id}

Stock de un insumo en una sede.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [RestaurantSupplyResponseDto](#restaurantsupplyresponsedto)

#### `PATCH` /restaurant-supplies/{id}

Cambiar el mínimo o activar/desactivar en la sede (el stock no se edita).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ConfigureRestaurantSupplyDto](#configurerestaurantsupplydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `minimumQuantity` | number | no | Ej.: `5` |
| `supplier` | string \| null | no | Proveedor habitual; null lo quita. |
| `isActive` | boolean | no | false = desactivar en la sede, true = reactivar. |

**Respuesta `200`:** `data` es [RestaurantSupplyResponseDto](#restaurantsupplyresponsedto)

#### `DELETE` /restaurant-supplies/{id}

Desactivar el insumo en la sede (baja lógica; conserva el historial).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [IdResponseDto](#idresponsedto)

#### `GET` /restaurant-supplies/{id}/movements

Historial de movimientos (más reciente primero).

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [InventoryMovementResponseDto](#inventorymovementresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /restaurant-supplies/{id}/movements

Registrar una compra, consumo, merma o ajuste manual.

Saldo y movimiento se guardan juntos con la fila bloqueada. Una salida nunca deja stock negativo (422). Con idempotencyKey repetida devuelve el mismo movimiento (200).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([RegisterMovementDto](#registermovementdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | no |  |
| `idempotencyKey` | string | no | Repetir la misma clave devuelve el mismo movimiento. |
| `type` | `PURCHASE` \| `USAGE` \| `WASTE` \| `MANUAL_ADJUSTMENT_IN` \| `MANUAL_ADJUSTMENT_OUT` | sí |  |
| `quantity` | number | sí | Siempre positiva; el tipo define si suma o resta. Ej.: `10` |
| `unitCost` | number | no | Solo en compras: recalcula el costo promedio. Ej.: `4.5` |
| `supplier` | string \| null | no | Solo en compras: pasa a ser el proveedor habitual del insumo en la sede. Ej.: `"Mercado Mayorista"` |
| `registerExpense` | [PurchaseExpenseDto](#purchaseexpensedto) | no | Solo en compras con unitCost: registra el costo (cantidad × costo unitario) como gasto de la sede, con fecha de hoy y ligado al movimiento, en la misma transacción. |

**Respuesta `201`:** `data` es [MovementResultResponseDto](#movementresultresponsedto)

#### `POST` /restaurant-supplies/{id}/counts

Registrar un conteo físico.

El backend calcula la diferencia y crea COUNT_ADJUSTMENT_IN / OUT con la cantidad contada. Sin diferencia no crea movimiento (200, movement = null).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([CountDto](#countdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | no |  |
| `idempotencyKey` | string | no | Repetir la misma clave devuelve el mismo movimiento. |
| `countedQuantity` | number | sí | Cantidad realmente encontrada. Ej.: `18` |

**Respuesta `201`:** `data` es [MovementResultResponseDto](#movementresultresponsedto)

### Movimientos de inventario

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /inventory-movements](#get-inventory-movements) | Movimientos de todo el stock de una sede (más reciente primero) | miembro |
| [`GET` /inventory-movements/{id}](#get-inventory-movementsid) | Obtener un movimiento | miembro |
| [`POST` /inventory-movements/{id}/reverse](#post-inventory-movementsidreverse) | Revertir un movimiento con otro de signo contrario | `inventory.manage` |

#### `GET` /inventory-movements

Movimientos de todo el stock de una sede (más reciente primero).

from / to son fechas comerciales (YYYY-MM-DD) en la zona horaria de la sede.

**Acceso:** miembro

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `supplyId` | string | no | Insumo maestro. |
| `type` | `PURCHASE` \| `USAGE` \| `WASTE` \| `COUNT_ADJUSTMENT_IN` \| `COUNT_ADJUSTMENT_OUT` \| `MANUAL_ADJUSTMENT_IN` \| `MANUAL_ADJUSTMENT_OUT` \| `REVERSAL` | no |  |
| `from` | string | no | Ej.: `"2026-10-01"` |
| `to` | string | no | Ej.: `"2026-10-31"` |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [InventoryMovementResponseDto](#inventorymovementresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `GET` /inventory-movements/{id}

Obtener un movimiento.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [InventoryMovementResponseDto](#inventorymovementresponsedto)

#### `POST` /inventory-movements/{id}/reverse

Revertir un movimiento con otro de signo contrario.

El original no se modifica. Un movimiento se revierte una sola vez (409) y una reversión no se revierte (422).

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([ReverseMovementDto](#reversemovementdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | sí | Ej.: `"Compra registrada dos veces"` |
| `idempotencyKey` | string | no | Repetirla devuelve la misma reversión (200) en vez de crear otra. |

**Respuesta `201`:** `data` es [MovementResultResponseDto](#movementresultresponsedto)

### Recetas

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /product-recipes/{productId}](#get-product-recipesproductid) | Receta del producto: insumos que consume por unidad | miembro |
| [`PUT` /product-recipes/{productId}/supplies/{supplyId}](#put-product-recipesproductidsuppliessupplyid) | Agregar o actualizar un insumo de la receta | `inventory.manage` |
| [`DELETE` /product-recipes/{productId}/supplies/{supplyId}](#delete-product-recipesproductidsuppliessupplyid) | Quitar un insumo de la receta | `inventory.manage` |

#### `GET` /product-recipes/{productId}

Receta del producto: insumos que consume por unidad.

**Acceso:** miembro

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [RecipeLineResponseDto](#recipelineresponsedto)[]

#### `PUT` /product-recipes/{productId}/supplies/{supplyId}

Agregar o actualizar un insumo de la receta.

Insumo maestro de la misma organización que el producto. El descuento automático solo corre con INVENTORY_AUTO_CONSUMPTION=true.

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |
| `supplyId` | string (uuid) | sí |  |

**Body (JSON)** ([SetRecipeLineDto](#setrecipelinedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `quantityRequired` | number | sí | Cantidad del insumo por unidad del producto. Ej.: `0.15` |
| `wastePercentage` | number | no | Merma esperada en %. Por defecto: `0`. Ej.: `10` |

**Respuesta `200`:** `data` es [RecipeLineResponseDto](#recipelineresponsedto)

#### `DELETE` /product-recipes/{productId}/supplies/{supplyId}

Quitar un insumo de la receta.

**Acceso:** `inventory.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string (uuid) | sí |  |
| `supplyId` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es { productId: string (uuid), supplyId: string (uuid) }

### Categorías de gastos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /expense-categories](#get-expense-categories) | Listar categorías de gasto | `finance.read` |
| [`POST` /expense-categories](#post-expense-categories) | Crear una categoría de gasto | `finance.manage` |
| [`GET` /expense-categories/{id}](#get-expense-categoriesid) | Obtener una categoría de gasto | `finance.read` |
| [`PATCH` /expense-categories/{id}](#patch-expense-categoriesid) | Actualizar una categoría de gasto | `finance.manage` |
| [`DELETE` /expense-categories/{id}](#delete-expense-categoriesid) | Desactivar una categoría de gasto (baja lógica) | `finance.manage` |

#### `GET` /expense-categories

Listar categorías de gasto.

Cada una con expenseCount: sus gastos vigentes (no anulados).

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ExpenseCategoryWithCountDto](#expensecategorywithcountdto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /expense-categories

Crear una categoría de gasto.

**Acceso:** `finance.manage`

**Body (JSON)** ([CreateExpenseCategoryDto](#createexpensecategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Servicios"` |
| `description` | string | no | Ej.: `"Luz, agua, internet"` |

**Respuesta `201`:** `data` es [ExpenseCategoryResponseDto](#expensecategoryresponsedto)

#### `GET` /expense-categories/{id}

Obtener una categoría de gasto.

**Acceso:** `finance.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [ExpenseCategoryResponseDto](#expensecategoryresponsedto)

#### `PATCH` /expense-categories/{id}

Actualizar una categoría de gasto.

**Acceso:** `finance.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateExpenseCategoryDto](#updateexpensecategorydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Servicios"` |
| `description` | string | no | Ej.: `"Luz, agua, internet"` |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [ExpenseCategoryResponseDto](#expensecategoryresponsedto)

#### `DELETE` /expense-categories/{id}

Desactivar una categoría de gasto (baja lógica).

No se borra. Sin moveTo, los gastos pasados siguen apuntando a ella. Con moveTo, todos sus gastos (también los anulados) pasan a esa otra categoría activa de la misma organización, en la misma transacción.

**Acceso:** `finance.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `moveTo` | string | no | Categoría que recibe los gastos. |

**Respuesta `200`:** `data` es [DeactivatedExpenseCategoryDto](#deactivatedexpensecategorydto)

### Gastos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /expenses](#get-expenses) | Listar gastos | `finance.read` |
| [`POST` /expenses](#post-expenses) | Registrar un gasto (queda a nombre del usuario de la sesión) | `finance.manage` |
| [`GET` /expenses/{id}](#get-expensesid) | Obtener un gasto | `finance.read` |
| [`PATCH` /expenses/{id}](#patch-expensesid) | Corregir un gasto (solo si no está anulado) | `finance.manage` |
| [`DELETE` /expenses/{id}](#delete-expensesid) | Anular un gasto (baja lógica) | `finance.manage` |

#### `GET` /expenses

Listar gastos.

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `categoryId` | string | no |  |
| `status` | `REGISTERED` \| `VOIDED` | no |  |
| `from` | string | no | Ej.: `"2026-10-01"` |
| `to` | string | no | Ej.: `"2026-10-31"` |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ExpenseResponseDto](#expenseresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /expenses

Registrar un gasto (queda a nombre del usuario de la sesión).

**Acceso:** `finance.manage`

**Body (JSON)** ([RegisterExpenseDto](#registerexpensedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryId` | string | sí | Categoría de gasto de la misma organización. |
| `description` | string | sí | Ej.: `"Recibo de luz octubre"` |
| `amount` | number | sí | Ej.: `320.5` |
| `expenseDate` | string | sí | Fecha del gasto (YYYY-MM-DD) Ej.: `"2026-10-25"` |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | no | Si es CASH, descuenta del efectivo esperado del cierre. |

**Respuesta `201`:** `data` es [ExpenseResponseDto](#expenseresponsedto)

#### `GET` /expenses/{id}

Obtener un gasto.

**Acceso:** `finance.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [ExpenseResponseDto](#expenseresponsedto)

#### `PATCH` /expenses/{id}

Corregir un gasto (solo si no está anulado).

**Acceso:** `finance.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateExpenseDto](#updateexpensedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | no | Categoría de gasto de la misma organización. |
| `description` | string | no | Ej.: `"Recibo de luz octubre"` |
| `amount` | number | no | Ej.: `320.5` |
| `expenseDate` | string | no | Fecha del gasto (YYYY-MM-DD) Ej.: `"2026-10-25"` |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | no | Si es CASH, descuenta del efectivo esperado del cierre. |

**Respuesta `200`:** `data` es [ExpenseResponseDto](#expenseresponsedto)

#### `DELETE` /expenses/{id}

Anular un gasto (baja lógica).

No se borra: queda como VOIDED, deja de sumar en totales y cierres, y ya no se edita.

**Acceso:** `finance.manage`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [ExpenseResponseDto](#expenseresponsedto)

### Cierres del día

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /daily-closures/preview](#get-daily-closurespreview) | Cifras que tendría el cierre del día, sin guardarlo | `finance.read` |
| [`GET` /daily-closures](#get-daily-closures) | Listar cierres diarios | `finance.read` |
| [`POST` /daily-closures](#post-daily-closures) | Cerrar el día de una sede | `finance.manage` |
| [`PUT` /daily-closures](#put-daily-closures) | Cerrar el día o volver a cerrarlo | `finance.manage` |
| [`GET` /daily-closures/{id}](#get-daily-closuresid) | Obtener un cierre con su desglose por método de pago | `finance.read` |

#### `GET` /daily-closures/preview

Cifras que tendría el cierre del día, sin guardarlo.

Calculadas para la fecha comercial en la zona horaria de la sede.

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `businessDate` | string | sí | Ej.: `"2026-10-25"` |

**Respuesta `200`:** `data` es [ClosurePreviewResponseDto](#closurepreviewresponsedto)

#### `GET` /daily-closures

Listar cierres diarios.

El vigente de cada fecha, del más reciente al más antiguo. includeSuperseded=true agrega los reemplazados (historial).

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | no |  |
| `from` | string | no | Ej.: `"2026-10-01"` |
| `to` | string | no | Ej.: `"2026-10-31"` |
| `includeSuperseded` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [DailyClosureResponseDto](#dailyclosureresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /daily-closures

Cerrar el día de una sede.

Guarda una foto de las cifras. Si la fecha ya está cerrada → 409 (para volver a cerrarla usa PUT). No se permiten fechas futuras.

**Acceso:** `finance.manage`

**Body (JSON)** ([CloseDayDto](#closedaydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `businessDate` | string | sí | Fecha comercial (zona horaria de la sede) Ej.: `"2026-10-25"` |
| `actualCash` | number | no | Efectivo contado en caja. Ej.: `1250` |
| `notes` | string | no |  |

**Respuesta `201`:** `data` es [DailyClosureResponseDto](#dailyclosureresponsedto)

#### `PUT` /daily-closures

Cerrar el día o volver a cerrarlo.

Sin cierre previo de la fecha, igual que POST (201). Con cierre previo recalcula las cifras y lo reemplaza (200): el anterior queda en el historial como reemplazado y reason es obligatorio.

**Acceso:** `finance.manage`

**Body (JSON)** ([CloseOrReplaceDayDto](#closeorreplacedaydto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `businessDate` | string | sí | Fecha comercial (zona horaria de la sede) Ej.: `"2026-10-25"` |
| `actualCash` | number | no | Efectivo contado en caja. Ej.: `1250` |
| `notes` | string | no |  |
| `reason` | string | no | Obligatorio si la fecha ya estaba cerrada (reemplazo) Ej.: `"Se registró tarde un pago con tarjeta"` |

**Respuesta `200`:** `data` es [DailyClosureResponseDto](#dailyclosureresponsedto)

#### `GET` /daily-closures/{id}

Obtener un cierre con su desglose por método de pago.

**Acceso:** `finance.read`

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [DailyClosureResponseDto](#dailyclosureresponsedto)

### Reportes

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /reports/daily-financials](#get-reportsdaily-financials) | Serie diaria de finanzas de una sede | `finance.read` |
| [`GET` /reports/restaurants-overview](#get-reportsrestaurants-overview) | Tarjetas de las sedes: cifras de hoy de cada una | `finance.read` |
| [`GET` /reports/metrics](#get-reportsmetrics) | Métricas de una sede en un periodo | `finance.read` |

#### `GET` /reports/daily-financials

Serie diaria de finanzas de una sede.

Por día: atenciones, ventas brutas y netas, reembolsos, gastos, utilidad (ventas netas - gastos), ticket promedio y neto por método de pago; más el total del periodo. Fechas comerciales en la zona horaria de la sede; máximo 366 días. Cada día coincide con el preview del cierre de ese día.

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `from` | string | sí | Ej.: `"2026-10-01"` |
| `to` | string | sí | Ej.: `"2026-10-31"` |

**Respuesta `200`:** `data` es [DailyFinancialsReportDto](#dailyfinancialsreportdto)

#### `GET` /reports/restaurants-overview

Tarjetas de las sedes: cifras de hoy de cada una.

Solo las sedes de la organización a las que el usuario tiene acceso, por nombre. Por sede: atenciones abiertas ahora y las cifras de hoy (ventas, gastos, utilidad, ticket) en su zona horaria.

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí |  |

**Respuesta `200`:** `data` es [RestaurantOverviewDto](#restaurantoverviewdto)[]

#### `GET` /reports/metrics

Métricas de una sede en un periodo.

Totales del periodo (ventas, atenciones, ticket promedio), productos más vendidos (ítems cobrables de atenciones no canceladas) y tiempos promedio por etapa de cocina.

**Acceso:** `finance.read`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `from` | string | sí | Ej.: `"2026-10-01"` |
| `to` | string | sí | Ej.: `"2026-10-31"` |
| `top` | number | no | Ej.: `10` |

**Respuesta `200`:** `data` es [RestaurantMetricsDto](#restaurantmetricsdto)

### Imágenes

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`POST` /uploads/images](#post-uploadsimages) | Subir una imagen de la sede (productos, carta) | `catalog.manage` |

#### `POST` /uploads/images

Subir una imagen de la sede (productos, carta).

multipart/form-data con el campo "file". Tipos: image/jpeg, image/png, image/webp, image/avif; máximo 5 MB. Devuelve la URL pública para guardarla en el registro. 503 si el almacenamiento no está configurado (STORAGE_PROVIDER).

**Acceso:** `catalog.manage`

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |

**Body (`multipart/form-data`)**:

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `file` | string | sí |  |

**Respuesta `201`:** `data` es [UploadedFileResponseDto](#uploadedfileresponsedto)

## 4. Administración de la plataforma

Solo para administradores de ACMR (`isPlatformAdmin: true` en el login). No es parte de la app de un restaurante.

### Catálogos de pagos

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /platform/payment-statuses](#get-platformpayment-statuses) | Catálogo de estados internos de pago | plataforma |
| [`PATCH` /platform/payment-statuses/{code}](#patch-platformpayment-statusescode) | Cambiar el nombre visible o la descripción de un estado | plataforma |
| [`GET` /platform/payment-provider-status-mappings](#get-platformpayment-provider-status-mappings) | Mapeos de estados de pasarela a estados internos | plataforma |
| [`POST` /platform/payment-provider-status-mappings](#post-platformpayment-provider-status-mappings) | Incorporar un estado externo de una pasarela | plataforma |
| [`PATCH` /platform/payment-provider-status-mappings/{id}](#patch-platformpayment-provider-status-mappingsid) | Activar, desactivar o cambiar el estado interno de un mapeo | plataforma |
| [`POST` /platform/payment-providers/{providerCode}/events](#post-platformpayment-providersprovidercodeevents) | Registrar un evento de una pasarela (idempotente por eventId) | plataforma |
| [`GET` /platform/payment-provider-events](#get-platformpayment-provider-events) | Auditoría de eventos recibidos de pasarelas | plataforma |

#### `GET` /platform/payment-statuses

Catálogo de estados internos de pago.

**Acceso:** plataforma

**Respuesta `200`:** `data` es [PaymentStatusResponseDto](#paymentstatusresponsedto)[]

#### `PATCH` /platform/payment-statuses/{code}

Cambiar el nombre visible o la descripción de un estado.

El código y el efecto contable no se pueden cambiar.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí |  |

**Body (JSON)** ([RenamePaymentStatusDto](#renamepaymentstatusdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Pagado"` |
| `description` | string | no |  |

**Respuesta `200`:** `data` es [PaymentStatusResponseDto](#paymentstatusresponsedto)

#### `GET` /platform/payment-provider-status-mappings

Mapeos de estados de pasarela a estados internos.

**Acceso:** plataforma

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `providerCode` | string | no |  |
| `isActive` | boolean | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ProviderStatusMappingResponseDto](#providerstatusmappingresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `POST` /platform/payment-provider-status-mappings

Incorporar un estado externo de una pasarela.

**Acceso:** plataforma

**Body (JSON)** ([CreateProviderStatusMappingDto](#createproviderstatusmappingdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `providerCode` | string | sí | Ej.: `"mercado_pago"` |
| `externalStatus` | string | sí | Estado tal como lo envía la pasarela. Ej.: `"approved"` |
| `paymentStatus` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí |  |

**Respuesta `201`:** `data` es [ProviderStatusMappingResponseDto](#providerstatusmappingresponsedto)

#### `PATCH` /platform/payment-provider-status-mappings/{id}

Activar, desactivar o cambiar el estado interno de un mapeo.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Body (JSON)** ([UpdateProviderStatusMappingDto](#updateproviderstatusmappingdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `paymentStatus` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | no |  |
| `isActive` | boolean | no |  |

**Respuesta `200`:** `data` es [ProviderStatusMappingResponseDto](#providerstatusmappingresponsedto)

#### `POST` /platform/payment-providers/{providerCode}/events

Registrar un evento de una pasarela (idempotente por eventId).

Traduce el estado externo con los mapeos activos y actualiza el pago. Un evento repetido no se vuelve a aplicar (200 con duplicate=true). Los webhooks públicos con firma de cada pasarela se agregarán al integrar un proveedor.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `providerCode` | string | sí |  |

**Body (JSON)** ([ProviderEventDto](#providereventdto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `eventId` | string | sí | Identificador único del evento en la pasarela. |
| `eventType` | string | sí | Ej.: `"payment.updated"` |
| `providerPaymentId` | string | no | Id del pago en la pasarela (identifica el pago a actualizar) |
| `externalStatus` | string | no | Ej.: `"approved"` |
| `payload` | object | no | Payload original (los datos de tarjeta se eliminan) |

**Respuesta `201`:** `data` es [ProviderEventResponseDto](#providereventresponsedto)

#### `GET` /platform/payment-provider-events

Auditoría de eventos recibidos de pasarelas.

**Acceso:** plataforma

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `providerCode` | string | no |  |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ProviderEventResponseDto](#providereventresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

### Catálogos de inventario

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`PATCH` /platform/units-of-measure/{code}](#patch-platformunits-of-measurecode) | Renombrar o activar/desactivar una unidad | plataforma |
| [`PATCH` /platform/inventory-movement-types/{code}](#patch-platforminventory-movement-typescode) | Renombrar un tipo de movimiento | plataforma |

#### `PATCH` /platform/units-of-measure/{code}

Renombrar o activar/desactivar una unidad.

La dimensión y el factor de conversión no se pueden cambiar.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí |  |

**Body (JSON)** ([UpdateUnitOfMeasureDto](#updateunitofmeasuredto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Kilogramo"` |
| `isActive` | boolean | no | false = no se puede usar en insumos nuevos. |

**Respuesta `200`:** `data` es [UnitOfMeasureResponseDto](#unitofmeasureresponsedto)

#### `PATCH` /platform/inventory-movement-types/{code}

Renombrar un tipo de movimiento.

El efecto sobre el stock no se puede cambiar.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí |  |

**Body (JSON)** ([RenameMovementTypeDto](#renamemovementtypedto)):

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Compra a proveedor"` |

**Respuesta `200`:** `data` es [MovementTypeResponseDto](#movementtyperesponsedto)

### Errores registrados

| Endpoint | Qué hace | Acceso |
| --- | --- | --- |
| [`GET` /platform/error-logs](#get-platformerror-logs) | Listar errores registrados (más recientes primero) | plataforma |
| [`GET` /platform/error-logs/{id}](#get-platformerror-logsid) | Obtener un error con su stack trace | plataforma |

#### `GET` /platform/error-logs

Listar errores registrados (más recientes primero).

**Acceso:** plataforma

**Query:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `level` | `error` \| `fatal` | no |  |
| `requestId` | string | no | Header X-Request-Id. |
| `errorCode` | string | no | Ej.: `"INTERNAL_ERROR"` |
| `userId` | string | no |  |
| `from` | string | no | UTC. Ej.: `"2026-10-01"` |
| `to` | string | no | UTC. Ej.: `"2026-10-31"` |
| `page` | number | no | Ej.: `1` |
| `limit` | number | no | Máximo 100. Ej.: `20` |

**Respuesta `200`:** `data` es { items: [ErrorLogResponseDto](#errorlogresponsedto)[], meta: [PageMetaDto](#pagemetadto) }

#### `GET` /platform/error-logs/{id}

Obtener un error con su stack trace.

**Acceso:** plataforma

**Parámetros de ruta:**

| Nombre | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

**Respuesta `200`:** `data` es [ErrorLogResponseDto](#errorlogresponsedto)

## 5. Códigos de error

Decide en el cliente por `errorCode` (estable), no por `message` (texto en español que puede cambiar). El `status` HTTP agrupa: `400` datos inválidos, `401` sin sesión, `403` sin acceso, `404` no existe, `409` conflicto con el estado actual (reintenta tras recargar), `422` regla de negocio, `503` servicio no disponible.

### Generales

| errorCode | Status | Cuándo |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Body, query o parámetro inválido. `message` es una lista con cada problema. |
| `MISSING_ACCESS_TOKEN` | 401 | Falta `Authorization: Bearer <accessToken>`. |
| `INVALID_ACCESS_TOKEN` | 401 | Token vencido o inválido: renueva con `/auth/refresh` y reintenta una vez. |
| `INVALID_GUEST_TOKEN` | 400 | `X-Guest-Token` no es un UUID. |
| `NOT_FOUND` | 404 | La ruta no existe. |
| `DUPLICATE_RECORD` | 409 | Ya existe un registro con esos datos (carrera entre dos altas). |
| `REFERENCE_CONFLICT` | 409 | El registro está referenciado por otros datos. |
| `CONSTRAINT_VIOLATION` | 400 | Los datos no cumplen una regla del modelo. |
| `INTERNAL_ERROR` | 500 | Error inesperado. Reporta el `requestId` de la respuesta. |

### Identidad y acceso

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `ACCOUNT_DISABLED` | 403 | La cuenta está inactiva o bloqueada |
| `DUPLICATE_EMAIL` | 409 | Ya existe un usuario con el correo "…" |
| `DUPLICATE_MEMBERSHIP` | 409 | El usuario ya es miembro de esa organización |
| `DUPLICATE_PERMISSION_CODE` | 409 | El permiso "…" ya existe |
| `DUPLICATE_ROLE_CODE` | 409 | La organización ya tiene un rol con el código "…" |
| `DUPLICATE_ROLE_PERMISSION` | 409 | El rol ya tiene asignado ese permiso |
| `INVALID_CREDENTIALS` | 401 | Correo o contraseña incorrectos |
| `INVALID_PASSWORD_RESET_TOKEN` | 401 | Token de restablecimiento inválido o vencido |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token inválido o vencido |
| `MEMBERSHIP_NOT_FOUND` | 404 | No existe la membresía con id "…" |
| `ORGANIZATION_REFERENCE_NOT_FOUND` | 404 | No existe la organización con id "…" |
| `OWNER_PERMISSIONS_ARE_FIXED` | 422 | El rol OWNER tiene siempre todos los permisos: no se editan |
| `PERMISSION_NOT_FOUND` | 404 | No existe el permiso con id "…" |
| `PLATFORM_ADMIN_REQUIRED` | 403 | Esta operación es exclusiva de los administradores de ACMR |
| `RESTAURANT_FROM_ANOTHER_ORGANIZATION` | 400 | El restaurante "…" no pertenece a la organización de la membresía |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante con id "…" |
| `ROLE_FROM_ANOTHER_ORGANIZATION` | 400 | El rol no pertenece a la organización de la membresía |
| `ROLE_IN_USE` | 422 | El rol está asignado a … usuario(s): cámbiales el rol antes de desactivarlo |
| `ROLE_NOT_FOUND` | 404 | No existe el rol con id "…" |
| `ROLE_PERMISSION_NOT_FOUND` | 404 | El rol no tiene asignado ese permiso |
| `UNKNOWN_PERMISSIONS` | 400 | Permisos inexistentes o inactivos: … |
| `USER_NOT_FOUND` | 404 | No existe el usuario con id "…" |

### Organizaciones, sedes, mesas y personal

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `DINING_TABLE_NOT_FOUND` | 404 | No existe la mesa con id "…" |
| `DUPLICATE_DINING_TABLE_CODE` | 409 | La sede ya tiene una mesa con el código "…" |
| `DUPLICATE_EMPLOYEE_CODE` | 409 | La organización ya tiene un empleado con el código "…" |
| `DUPLICATE_JOB_POSITION_NAME` | 409 | El área ya tiene un puesto llamado "…" |
| `DUPLICATE_RESTAURANT_CODE` | 409 | La organización ya tiene un restaurante con el código "…" |
| `DUPLICATE_RESTAURANT_FLOOR_NAME` | 409 | La sede ya tiene un piso llamado "…" |
| `DUPLICATE_RESTAURANT_SLUG` | 409 | Ya existe un restaurante con el slug "…" |
| `DUPLICATE_TAX_IDENTIFIER` | 409 | Ya existe una organización con el identificador fiscal "…" |
| `DUPLICATE_WORK_AREA_NAME` | 409 | La organización ya tiene un área llamada "…" |
| `EMPLOYEE_FROM_ANOTHER_ORGANIZATION` | 400 | El empleado es de otra organización |
| `EMPLOYEE_LINKED_TO_ANOTHER_USER` | 409 | Ese empleado ya está vinculado a otro usuario |
| `EMPLOYEE_NOT_FOUND` | 404 | No existe el empleado con id "…" |
| `FLOOR_FROM_ANOTHER_RESTAURANT` | 400 | El piso no pertenece a la sede de la mesa |
| `FLOOR_HAS_TABLES` | 422 | El piso tiene … mesa(s) operativa(s): indica a qué piso moverlas (moveTablesTo) |
| `INACTIVE_DINING_TABLE` | 422 | La mesa "…" no está activa |
| `INACTIVE_JOB_POSITION` | 422 | El puesto está inactivo; no se puede asignar a un empleado |
| `INACTIVE_WORK_AREA` | 422 | El área está inactiva; no se le pueden agregar puestos |
| `INVALID_FLOOR_MOVE` | 400 | No se pueden mover las mesas: … |
| `JOB_POSITION_FROM_ANOTHER_ORGANIZATION` | 400 | El puesto pertenece a otra organización que el empleado |
| `JOB_POSITION_NOT_FOUND` | 404 | No existe el puesto con id "…" |
| `ORGANIZATION_NOT_FOUND` | 404 | No existe la organización con id "…" |
| `RESTAURANT_FLOOR_NOT_FOUND` | 404 | No existe el piso con id "…" |
| `RESTAURANT_NOT_FOUND` | 404 | No existe el restaurante "…" |
| `USER_ALREADY_EMPLOYEE` | 409 | Ese usuario ya está vinculado a otro empleado de la organización |
| `USER_REFERENCE_NOT_FOUND` | 404 | No existe el usuario con id "…" |
| `WORK_AREA_FROM_ANOTHER_ORGANIZATION` | 400 | El área pertenece a otra organización |
| `WORK_AREA_NOT_FOUND` | 404 | No existe el área con id "…" |

### Catálogo y carta

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `CATEGORY_CYCLE` | 400 | Una categoría no puede quedar dentro de sí misma ni de una de sus subcategorías |
| `CATEGORY_FROM_ANOTHER_ORGANIZATION` | 400 | La categoría pertenece a otra organización |
| `CATEGORY_NOT_FOUND` | 404 | No existe la categoría con id "…" |
| `CROSS_RESTAURANT_REFERENCE` | 400 | … pertenece a otra sede |
| `DUPLICATE_CATEGORY_NAME` | 409 | Ya existe una categoría llamada "…" en ese nivel |
| `DUPLICATE_MENU_NAME` | 409 | La sede ya tiene un menú llamado "…" |
| `DUPLICATE_MENU_PRODUCT` | 409 | El producto ya forma parte de ese menú |
| `DUPLICATE_MENU_SECTION_NAME` | 409 | El menú ya tiene una sección llamada "…" |
| `DUPLICATE_PRODUCT_CATEGORY` | 409 | El producto ya está en esa categoría |
| `DUPLICATE_PRODUCT_CODE` | 409 | La sede ya tiene un producto con el código "…" |
| `INACTIVE_CATEGORY` | 422 | La categoría está desactivada |
| `INACTIVE_MENU_SECTION` | 422 | La sección del menú está desactivada |
| `INVALID_REORDER` | 400 | El nuevo orden no es válido: … |
| `INVALID_SECTION_MOVE` | 400 | No se pueden mover los productos: … |
| `MENU_NOT_FOUND` | 404 | No existe el menú con id "…" |
| `MENU_PRODUCT_NOT_FOUND` | 404 | El producto no forma parte de ese menú |
| `MENU_SECTION_NOT_FOUND` | 404 | No existe la sección "…" en ese menú |
| `ORGANIZATION_REFERENCE_NOT_FOUND` | 404 | No existe la organización con id "…" |
| `PRODUCT_CATEGORY_NOT_FOUND` | 404 | El producto no está en esa categoría |
| `PRODUCT_INGREDIENT_NOT_FOUND` | 404 | No existe el ingrediente "…" en ese producto |
| `PRODUCT_NOT_FOUND` | 404 | No existe el producto con id "…" |
| `RESTAURANT_NOT_ACCEPTING_ORDERS` | 422 | El restaurante "…" no está recibiendo pedidos |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante "…" |
| `SECTION_HAS_PRODUCTS` | 422 | La sección tiene … producto(s): indica a qué sección moverlos (moveProductsTo) |

### Atenciones y pedidos

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `ACTIVE_ATTENTION_ALREADY_EXISTS` | 409 | La mesa "…" ya tiene una atención activa |
| `ATTENTION_ACCESS_DENIED` | 403 | No eres participante de esta atención |
| `ATTENTION_HAS_PAYMENTS` | 422 | La atención tiene pagos; primero deben reembolsarse para cancelarla |
| `ATTENTION_NOT_ACTIVE` | 422 | La atención está en estado …; ya no admite cambios |
| `ATTENTION_NOT_FOUND` | 404 | No existe la atención con id "…" |
| `DINING_TABLE_REFERENCE_NOT_FOUND` | 404 | No existe la mesa con id "…" |
| `DUPLICATE_ORDER_REQUEST` | 409 | Ya se envió una orden con el requestId "…" |
| `DUPLICATE_SERVICE_TYPE_CODE` | 409 | La sede ya tiene un tipo de servicio con el código "…" |
| `DUPLICATE_WORKFLOW_STATUS_CODE` | 409 | La sede ya tiene un estado con el código "…" |
| `EMPTY_ORDER` | 400 | La orden debe tener al menos un producto |
| `FULFILLMENT_NOT_FOUND` | 404 | La atención "…" no tiene datos de recojo/delivery |
| `INVALID_FULFILLMENT_TRANSITION` | 409 | Un … no puede pasar de "…" a "…" |
| `INVALID_ORDER_ITEM_TRANSITION` | 409 | Un plato no puede pasar de "…" a "…" |
| `INVALID_SERVICE_SETUP` | 400 | No existe un estado activo con id "…" en esta sede |
| `ITEM_ALREADY_IN_PREPARATION` | 422 | El plato ya está en preparación y no se puede cancelar |
| `ORDER_ALREADY_FINISHED` | 422 | (mensaje con datos del caso) |
| `ORDER_ITEM_HAS_PAYMENTS` | 422 | El producto ya tiene pagos asignados y no se puede cancelar ni rechazar |
| `ORDER_ITEM_NOT_FOUND` | 404 | No existe el plato con id "…" |
| `ORDER_NOT_FOUND` | 404 | No existe la orden con id "…" |
| `ORDER_NOT_SUBMITTED` | 422 | Solo se pueden confirmar órdenes en estado SUBMITTED |
| `OUTSTANDING_BALANCE` | 422 | La atención todavía tiene un saldo pendiente de … |
| `PRODUCT_NOT_ORDERABLE` | 422 | El producto "…" no se puede pedir: … |
| `QR_INVALID` | 404 | El QR no es válido o fue revocado |
| `REJECTION_REASON_REQUIRED` | 400 | Se requiere un motivo para rechazar un plato |
| `REQUIRED_WORKFLOW_STATUS` | 422 | No existe el tipo de servicio "…" en esta sede |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante con id "…" |
| `SERVICE_MODE_DISABLED` | 422 | La sede no acepta pedidos … |
| `STALE_ORDER_ITEM_VERSION` | 409 | El plato "…" fue modificado por otra persona; vuelve a cargarlo e inténtalo de nuevo |
| `STATUS_NOT_CONFIGURED` | 422 | La sede no tiene un estado activo … (…) |
| `TABLE_HAS_ACTIVE_ATTENTION` | 422 | La mesa tiene una atención activa: ciérrala o cancélala antes de retirarla |

### Pagos

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `ALLOCATION_EXCEEDS_ITEM_BALANCE` | 422 | No se puede asignar … a …: su saldo pendiente es … |
| `ALLOCATION_TARGET_NOT_IN_ATTENTION` | 400 | … no pertenece a esta atención o no se cobra |
| `ATTENTION_NOT_PAYABLE` | 422 | No se pueden registrar pagos en una atención en estado … |
| `ATTENTION_REFERENCE_NOT_FOUND` | 404 | No existe la atención con id "…" |
| `DUPLICATE_ALLOCATION_TARGET` | 400 | … aparece más de una vez en el pago |
| `DUPLICATE_PAYMENT_REQUEST` | 409 | Ya se registró un pago con el requestId "…" |
| `DUPLICATE_PROVIDER_PAYMENT` | 409 | Ya existe un pago de … con el identificador "…" |
| `DUPLICATE_PROVIDER_STATUS_MAPPING` | 409 | El estado "…" de … ya tiene un mapeo |
| `INVALID_PAYMENT_AMOUNT` | 400 | (mensaje con datos del caso) |
| `INVALID_PAYMENT_TRANSITION` | 409 | El pago no puede pasar de … a … |
| `NOTHING_TO_PAY` | 422 | La atención no tiene saldo pendiente |
| `PAYMENT_EXCEEDS_BALANCE` | 422 | El monto … supera el saldo pendiente de … |
| `PAYMENT_NOT_CANCELLABLE` | 422 | Solo se pueden cancelar pagos pendientes o en proceso (estado actual: …) |
| `PAYMENT_NOT_FOUND` | 404 | No existe el pago con id "…" |
| `PAYMENT_STATUS_NOT_FOUND` | 404 | No existe el estado de pago "…" |
| `PROVIDER_STATUS_MAPPING_NOT_FOUND` | 404 | No existe el mapeo de estado con id "…" |
| `REFUNDS_NOT_ENABLED` | 422 | Los reembolsos aún no están habilitados |
| `UNMAPPED_PROVIDER_STATUS` | 422 | El estado "…" de … no tiene un estado interno asociado |

### Inventario

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `CATEGORY_FROM_ANOTHER_ORGANIZATION` | 400 | La categoría de inventario pertenece a otra organización |
| `DUPLICATE_INVENTORY_CATEGORY_NAME` | 409 | La organización ya tiene una categoría de inventario llamada "…" |
| `DUPLICATE_RESTAURANT_SUPPLY` | 409 | La sede ya tiene habilitado ese insumo (reactívalo si estaba desactivado) |
| `DUPLICATE_SUPPLY_CODE` | 409 | La organización ya tiene un insumo con el código "…" |
| `INACTIVE_SUPPLY` | 422 | El insumo "…" está inactivo |
| `INSUFFICIENT_STOCK` | 422 | No hay stock suficiente (disponible: …, solicitado: …) |
| `INVALID_MOVEMENT_QUANTITY` | 400 | (mensaje con datos del caso) |
| `INVENTORY_CATALOG_ENTRY_NOT_FOUND` | 404 | No existe el código "…" en el catálogo de inventario |
| `INVENTORY_CATEGORY_NOT_FOUND` | 404 | No existe la categoría de inventario con id "…" |
| `MOVEMENT_ALREADY_REVERSED` | 409 | El movimiento ya fue revertido |
| `MOVEMENT_NOT_FOUND` | 404 | No existe el movimiento de inventario con id "…" |
| `ORGANIZATION_REFERENCE_NOT_FOUND` | 404 | No existe la organización con id "…" |
| `PRODUCT_REFERENCE_NOT_FOUND` | 404 | No existe el producto con id "…" |
| `RECIPE_LINE_NOT_FOUND` | 404 | La receta del producto no usa ese insumo |
| `RECIPE_SUPPLY_FROM_ANOTHER_ORGANIZATION` | 400 | El insumo pertenece a otra organización que el producto |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante con id "…" |
| `RESTAURANT_SUPPLY_NOT_FOUND` | 404 | No existe el insumo de sede con id "…" |
| `REVERSAL_NOT_REVERSIBLE` | 422 | Una reversión no se revierte; registra un movimiento nuevo |
| `SUPPLY_FROM_ANOTHER_ORGANIZATION` | 400 | El insumo pertenece a otra organización |
| `SUPPLY_NOT_FOUND` | 404 | No existe el insumo con id "…" |
| `SUPPLY_UNIT_LOCKED` | 422 | El insumo ya tiene movimientos: su unidad base solo puede cambiarse con una conversión controlada |
| `UNIT_OF_MEASURE_NOT_FOUND` | 404 | No existe la unidad de medida "…" o está desactivada |

### Finanzas

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `CATEGORY_FROM_ANOTHER_ORGANIZATION` | 400 | La categoría de gasto pertenece a otra organización |
| `DAILY_CLOSURE_ALREADY_EXISTS` | 409 | La sede ya tiene un cierre para el … |
| `DAILY_CLOSURE_NOT_FOUND` | 404 | No existe el cierre diario con id "…" |
| `DUPLICATE_EXPENSE_CATEGORY_NAME` | 409 | La organización ya tiene una categoría de gasto llamada "…" |
| `EXPENSE_CATEGORY_NOT_FOUND` | 404 | No existe la categoría de gasto con id "…" |
| `EXPENSE_NOT_FOUND` | 404 | No existe el gasto con id "…" |
| `EXPENSE_VOIDED` | 422 | El gasto está anulado y ya no se puede modificar |
| `FUTURE_BUSINESS_DATE` | 400 | No se puede cerrar una fecha futura (…) |
| `INACTIVE_EXPENSE_CATEGORY` | 422 | La categoría de gasto está inactiva |
| `INVALID_EXPENSE_CATEGORY_MOVE` | 400 | No se pueden mover los gastos: … |
| `ORGANIZATION_REFERENCE_NOT_FOUND` | 404 | No existe la organización con id "…" |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante con id "…" |

### Imágenes

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `EMPTY_IMAGE` | 400 | Envía la imagen en el campo "file" |
| `FILE_STORAGE_NOT_CONFIGURED` | 503 | La subida de archivos no está configurada en este entorno |
| `IMAGE_TOO_LARGE` | 400 | La imagen supera el máximo de … MB |
| `RESTAURANT_REFERENCE_NOT_FOUND` | 404 | No existe el restaurante con id "…" |
| `UNSUPPORTED_IMAGE_TYPE` | 400 | (mensaje con datos del caso) |

### Plataforma

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `ERROR_LOG_NOT_FOUND` | 404 | No existe el registro de error con id "…" |

### Generales

| errorCode | Status | Mensaje |
| --- | --- | --- |
| `ACCESS_DENIED` | 403 | (mensaje con datos del caso) |
| `ACCOUNT_DISABLED` | 403 | La cuenta está inactiva o bloqueada |
| `MISSING_ACCESS_POLICY` | 403 | Esta ruta no declara quién puede usarla |
| `TENANT_SCOPE_REQUIRED` | 400 | Indica … para acotar la consulta |

## 6. Modelos

Forma de cada objeto que aparece en los bodies y en `data`. Los campos `| null` vienen siempre, con `null` cuando no hay valor; los que no son requeridos pueden no venir.

### AddMenuProductDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí | Ej.: `"7c1e6f2a-2222-4b3a-9a1a-9f3b2c1d4e5f"` |
| `menuSectionId` | string \| null | no | Sección del mismo menú (null = sin sección) |
| `displayPrice` | number | no | Precio a mostrar en este menú (el pedido usa el precio del producto) Ej.: `29.9` |
| `sortOrder` | number | no | Orden dentro de su sección (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | false = oculto en la carta sin quitarlo del menú. Por defecto: `true`. |

### AddProductCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | sí |  |

### AllocationResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `concept` | `ORDER_ITEM` \| `DELIVERY_FEE` | sí |  |
| `orderItemId` | string \| null | no |  |
| `fulfillmentId` | string \| null | no | Solo DELIVERY_FEE. |
| `amount` | number | sí |  |

### AssignPermissionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `permissionId` | string | sí | Ej.: `"7c1e6f2a-2222-4b3a-9a1a-9f3b2c1d4e5f"` |

### AttentionBalanceDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string | sí |  |
| `currencyCode` | string | sí |  |
| `total` | number | sí |  |
| `paid` | number | sí |  |
| `reserved` | number | sí |  |
| `balance` | number | sí | Pendiente de pago (total - pagado - reservado) |
| `lines` | [ChargeLineBalanceDto](#chargelinebalancedto)[] | sí |  |

### AttentionBillResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string | sí |  |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí |  |
| `items` | [BillItemResponseDto](#billitemresponsedto)[] | sí | Solo ítems cobrables (sin rechazados ni cancelados), con lo pagado de cada uno. |
| `subtotal` | number | sí |  |
| `deliveryFee` | number | sí |  |
| `total` | number | sí |  |
| `paid` | number | sí | Pagos confirmados menos reembolsos. |
| `balance` | number | sí |  |
| `payments` | [BillPaymentResponseDto](#billpaymentresponsedto)[] | sí | Todos los pagos de la atención (cualquier estado), del más antiguo al más reciente. |

### AttentionDetailResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `diningTableId` | string \| null | no |  |
| `customerUserId` | string \| null | no |  |
| `attentionNumber` | string | sí | Ej.: `"A-7KX2QF"` |
| `serviceTypeId` | string | sí |  |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí | Estado de la sede (nombre y color en GET /attention-statuses) |
| `billRequestedAt` | string (fecha-hora ISO) \| null | no |  |
| `openedAt` | string (fecha-hora ISO) | sí |  |
| `closedAt` | string (fecha-hora ISO) \| null | no |  |
| `cancelledAt` | string (fecha-hora ISO) \| null | no |  |
| `cancellationReason` | string \| null | no |  |
| `version` | number | sí |  |
| `participants` | [ParticipantResponseDto](#participantresponsedto)[] | sí |  |
| `orders` | [OrderResponseDto](#orderresponsedto)[] | sí | Rondas con sus platos y el estado de cada uno. |
| `fulfillment` | [FulfillmentResponseDto](#fulfillmentresponsedto) \| null | no |  |
| `guestToken` | string | no | Solo al registrar a un invitado: guárdalo y envíalo como X-Guest-Token. |

### AttentionResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `diningTableId` | string \| null | no |  |
| `customerUserId` | string \| null | no |  |
| `attentionNumber` | string | sí | Ej.: `"A-7KX2QF"` |
| `serviceTypeId` | string | sí |  |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí | Estado de la sede (nombre y color en GET /attention-statuses) |
| `billRequestedAt` | string (fecha-hora ISO) \| null | no |  |
| `openedAt` | string (fecha-hora ISO) | sí |  |
| `closedAt` | string (fecha-hora ISO) \| null | no |  |
| `cancelledAt` | string (fecha-hora ISO) \| null | no |  |
| `cancellationReason` | string \| null | no |  |
| `version` | number | sí |  |

### AttentionVisitResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attention` | [AttentionResponseDto](#attentionresponsedto) | sí |  |
| `restaurant` | [VisitRestaurantDto](#visitrestaurantdto) \| null | no |  |
| `items` | [OrderItemResponseDto](#orderitemresponsedto)[] | sí | Productos cobrables de la visita. |
| `total` | number | sí |  |
| `paid` | number | sí |  |
| `balance` | number | sí |  |

### AttentionWithItemsResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `diningTableId` | string \| null | no |  |
| `customerUserId` | string \| null | no |  |
| `attentionNumber` | string | sí | Ej.: `"A-7KX2QF"` |
| `serviceTypeId` | string | sí |  |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí | Estado de la sede (nombre y color en GET /attention-statuses) |
| `billRequestedAt` | string (fecha-hora ISO) \| null | no |  |
| `openedAt` | string (fecha-hora ISO) | sí |  |
| `closedAt` | string (fecha-hora ISO) \| null | no |  |
| `cancelledAt` | string (fecha-hora ISO) \| null | no |  |
| `cancellationReason` | string \| null | no |  |
| `version` | number | sí |  |
| `items` | [OrderItemResponseDto](#orderitemresponsedto)[] | sí | Todos los platos de la atención, del más antiguo al más reciente. |

### AuthResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `accessToken` | string | sí |  |
| `refreshToken` | string | sí |  |
| `user` | [UserResponseDto](#userresponsedto) | sí |  |

### AuthTokensResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `accessToken` | string | sí |  |
| `refreshToken` | string | sí |  |

### BillItemResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `orderId` | string | sí |  |
| `productId` | string | sí |  |
| `requestedByParticipantId` | string \| null | no |  |
| `productName` | string | sí | Nombre del producto al momento del pedido. |
| `unitPrice` | number | sí | Precio al momento del pedido. |
| `quantity` | number | sí |  |
| `subtotal` | number | sí |  |
| `customerNote` | string \| null | no |  |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí | Estado de la sede (nombre y color en GET /order-statuses) |
| `rejectionReason` | string \| null | no |  |
| `version` | number | sí | Enviar en el cambio de estado (concurrencia optimista) |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |
| `paid` | number | sí | Cubierto por pagos confirmados. |
| `balance` | number | sí | Pendiente de este producto (subtotal - pagado) |

### BillPaymentResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `paymentMethod` | string | sí | Ej.: `"CASH"` |
| `amount` | number | sí |  |
| `status` | string | sí | Estado del pago (PENDING, PAID, FAILED...) Ej.: `"PAID"` |
| `paidAt` | string (fecha-hora ISO) \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |

### BulkChangeOrderItemStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Sede de todos los platos. |
| `items` | [BulkStatusItemDto](#bulkstatusitemdto)[] | sí |  |
| `statusId` | string | no | Estado de la sede. Alternativa a status. |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | no |  |
| `reason` | string | no | Obligatorio para REJECTED. |

### BulkStatusChangeResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `updated` | [OrderItemResponseDto](#orderitemresponsedto)[] | sí |  |
| `failed` | [BulkStatusFailureDto](#bulkstatusfailuredto)[] | sí |  |

### BulkStatusFailureDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `errorCode` | string | sí | Ej.: `"STALE_ORDER_ITEM_VERSION"` |
| `message` | string | sí |  |

### BulkStatusItemDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `version` | number | no | Versión leída del plato; si cambió, ese plato falla con 409 y los demás siguen. |

### CancelAttentionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `reason` | string | sí | Ej.: `"El cliente se retiró"` |

### CancelOrderDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `reason` | string | sí | Ej.: `"La mesa cambió de pedido"` |

### CartValidateDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `items` | [CartValidateItemDto](#cartvalidateitemdto)[] | sí |  |

### CartValidateItemDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `quantity` | number | sí | (mín. 1) Ej.: `2` |
| `unitPrice` | number | no | Precio que vio el cliente; solo sirve para avisar si cambió. Ej.: `28` |

### CartValidateResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `valid` | boolean | sí |  |
| `issues` | [CartValidationIssueDto](#cartvalidationissuedto)[] | sí |  |
| `serviceIssues` | (`MODE_DISABLED` \| `BELOW_MINIMUM`)[] | sí | Problemas del pedido completo según la modalidad de la sede. |
| `items` | [CartValidationLineDto](#cartvalidationlinedto)[] | sí | Productos válidos con nombre y precio del servidor. |
| `subtotal` | number | sí |  |
| `minimumOrderAmount` | number | sí | Monto mínimo del tipo de servicio (0 = sin mínimo) |
| `deliveryFee` | number | sí | Solo en DELIVERY. |
| `total` | number | sí | subtotal + deliveryFee. |

### CartValidationIssueDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí |  |
| `code` | `PRODUCT_NOT_FOUND` \| `PRODUCT_NOT_IN_RESTAURANT` \| `PRODUCT_INACTIVE` \| `PRODUCT_UNAVAILABLE` \| `MODE_NOT_ALLOWED` \| `PRICE_CHANGED` | sí |  |
| `price` | number | no | Precio vigente (solo en PRICE_CHANGED) |

### CartValidationLineDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí |  |
| `name` | string | sí |  |
| `quantity` | number | sí |  |
| `unitPrice` | number | sí | Precio vigente del servidor. |
| `subtotal` | number | sí |  |

### CategoryResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `parentCategoryId` | string \| null | no |  |
| `name` | string | sí | Ej.: `"Bebidas"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### ChangeFulfillmentStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `status` | `PENDING` \| `CONFIRMED` \| `PREPARING` \| `READY` \| `OUT_FOR_DELIVERY` \| `COMPLETED` \| `CANCELLED` | sí | PENDING→CONFIRMED→PREPARING→READY→(PICKUP: COMPLETED \| DELIVERY: OUT_FOR_DELIVERY→COMPLETED); CANCELLED desde cualquier estado no final. |
| `estimatedReadyAt` | string (fecha-hora ISO) | no | Hora estimada de listo (útil al confirmar) |

### ChangeOrderItemStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `statusId` | string | no | Estado de la sede (GET /order-statuses). Alternativa a status. |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | no | Usa el primer estado activo de la sede con este estado canónico. |
| `version` | number | no | Versión leída del ítem. Si otro empleado lo cambió antes, responde 409 en lugar de sobrescribir. |
| `reason` | string | no | Obligatorio para REJECTED. |
| `changedByUserId` | string | no | Quién hizo el cambio, para el historial. |

### ChangeOwnPasswordDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `currentPassword` | string | sí | Ej.: `"current-password"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

### ChangePaymentStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `status` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí | PROCESSING, PAID, FAILED o CANCELLED. Los reembolsos (PARTIALLY_REFUNDED / REFUNDED) aún no están habilitados (422) |

### ChargeLineBalanceDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `concept` | `ORDER_ITEM` \| `DELIVERY_FEE` | sí |  |
| `orderItemId` | string \| null | no |  |
| `label` | string | sí | Ej.: `"\"Lomo saltado\""` |
| `total` | number | sí |  |
| `paid` | number | sí | Cubierto por pagos confirmados. |
| `reserved` | number | sí | Reservado por pagos pendientes en una pasarela. |
| `balance` | number | sí | Pendiente de pago (total - pagado - reservado) |

### CloseDayDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `businessDate` | string | sí | Fecha comercial (zona horaria de la sede) Ej.: `"2026-10-25"` |
| `actualCash` | number | no | Efectivo contado en caja. Ej.: `1250` |
| `notes` | string | no |  |

### CloseOrReplaceDayDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `businessDate` | string | sí | Fecha comercial (zona horaria de la sede) Ej.: `"2026-10-25"` |
| `actualCash` | number | no | Efectivo contado en caja. Ej.: `1250` |
| `notes` | string | no |  |
| `reason` | string | no | Obligatorio si la fecha ya estaba cerrada (reemplazo) Ej.: `"Se registró tarde un pago con tarjeta"` |

### ClosurePreviewResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `businessDate` | string | sí | Ej.: `"2026-10-25"` |
| `openedAttentions` | number | sí |  |
| `closedAttentions` | number | sí |  |
| `cancelledAttentions` | number | sí |  |
| `grossSales` | number | sí |  |
| `refundedAmount` | number | sí |  |
| `netSales` | number | sí |  |
| `expenseAmount` | number | sí |  |
| `expectedCash` | number | sí | Efectivo cobrado - gastos pagados en efectivo (mínimo 0) |
| `byMethod` | [PaymentMethodTotalDto](#paymentmethodtotaldto)[] | sí | Neto cobrado por método de pago. |
| `alreadyClosed` | boolean | sí | Ya existe un cierre para esa fecha. |

### ConfigureRestaurantSupplyDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `minimumQuantity` | number | no | Ej.: `5` |
| `supplier` | string \| null | no | Proveedor habitual; null lo quita. |
| `isActive` | boolean | no | false = desactivar en la sede, true = reactivar. |

### CountDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | no |  |
| `idempotencyKey` | string | no | Repetir la misma clave devuelve el mismo movimiento. |
| `countedQuantity` | number | sí | Cantidad realmente encontrada. Ej.: `18` |

### CreateAttentionStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `restaurantId` | string | sí | Sede dueña del estado. |
| `code` | string | sí | Ej.: `"ESPERANDO_PAGO"` |
| `name` | string | sí | Ej.: `"Esperando pago"` |
| `sortOrder` | number | sí | Ej.: `25` |
| `canonicalState` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí | Lo que el backend hace con este estado; no se puede cambiar. |

### CreateCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `parentCategoryId` | string | no | Categoría padre de la misma organización (vacío = categoría raíz) |
| `name` | string | sí | Único dentro del mismo padre (sin distinguir mayúsculas) Ej.: `"Bebidas"` |
| `description` | string | no |  |

### CreatedDiningTableResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `floorId` | string | sí |  |
| `code` | string | sí | Ej.: `"M01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number \| null | no |  |
| `operationalStatus` | `ACTIVE` \| `INACTIVE` \| `MAINTENANCE` | sí |  |
| `serviceStatus` | `AVAILABLE` \| `RESERVED` \| `CLEANING` | sí |  |
| `positionX` | number \| null | no |  |
| `positionY` | number \| null | no |  |
| `qr` | [DiningTableQrDto](#diningtableqrdto) | sí | Nunca incluye el token ni su hash. |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |
| `qrToken` | string \| null | no | Token del QR recién generado (null con generateQr=false). Solo viene aquí. |
| `qrUrl` | string \| null | no | URL a codificar en la imagen del QR. Ej.: `"https://app.acmr.pe/t/<qrToken>"` |

### CreateDiningTableDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `floorId` | string | sí | Piso de la mesa; el restaurante se toma del piso. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | sí | Único dentro del restaurante. Ej.: `"M01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number | no | Ej.: `4` |
| `positionX` | number | no | Posición en el plano del piso. Ej.: `120.5` |
| `positionY` | number | no | Ej.: `80` |
| `generateQr` | boolean | no | Genera el QR de la mesa al crearla (el token solo viene en esta respuesta) Por defecto: `true`. |

### CreateEmployeeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `userId` | string | no | Usuario con acceso al sistema. Omitir si el empleado no tiene acceso. |
| `employeeCode` | string | sí | Único dentro de la organización. Ej.: `"EMP-001"` |
| `documentNumber` | string | no | Ej.: `"70123456"` |
| `jobPositionId` | string | no | Puesto vigente (de la misma organización y activo). El área se obtiene del puesto. |
| `hiredAt` | string | no | Ej.: `"2026-01-15"` |
| `terminatedAt` | string | no | Ej.: `"2026-12-31"` |

### CreateExpenseCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Servicios"` |
| `description` | string | no | Ej.: `"Luz, agua, internet"` |

### CreateIngredientDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Cebolla morada"` |
| `sortOrder` | number | no | Orden en que se muestra (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | Mostrarlo en la carta. Por defecto: `true`. |

### CreateInventoryCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Verduras"` |
| `description` | string | no |  |

### CreateJobPositionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `workAreaId` | string | sí | Área del puesto; la organización se toma del área. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Único por área (sin distinguir mayúsculas) Ej.: `"Cocinero"` |
| `description` | string | no |  |

### CreateMembershipDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `userId` | string | sí | Usuario que se vincula a la organización. |
| `roleId` | string | sí | Rol de la misma organización. |
| `allRestaurants` | boolean | no | true = acceso a todas las sedes (actuales y futuras) Por defecto: `false`. |
| `restaurantIds` | string[] | no | Sedes permitidas cuando allRestaurants es false. Lista vacía = sin acceso a sedes. |

### CreateMenuDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Carta principal"` |
| `description` | string | no |  |
| `validFrom` | string (fecha-hora ISO) | no | Ej.: `"2026-11-01T00:00:00-05:00"` |
| `validUntil` | string (fecha-hora ISO) | no | Ej.: `"2026-12-31T23:59:59-05:00"` |

### CreateMenuSectionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Único dentro del menú (sin distinguir mayúsculas) Ej.: `"Entradas"` |
| `categoryId` | string | no | Categoría que reutiliza la sección (opcional) |
| `sortOrder` | number | no | Orden de la sección en el menú (menor primero) Por defecto: `0`. |

### CreateOrderStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `restaurantId` | string | sí | Sede dueña del estado. |
| `code` | string | sí | Ej.: `"EN_HORNO"` |
| `name` | string | sí | Ej.: `"En horno"` |
| `sortOrder` | number | sí | Ej.: `35` |
| `canonicalState` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí | Lo que el backend hace con este estado; no se puede cambiar. |

### CreateOrganizationDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | (mín. 2 caracteres) Ej.: `"Grupo Sabores"` |
| `legalName` | string | no | Ej.: `"Grupo Sabores S.A.C."` |
| `taxIdentifier` | string | no | RUC u otro identificador fiscal. Ej.: `"20601234567"` |
| `currencyCode` | string | no | Por defecto: `"PEN"`. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto: `"America/Lima"`. Ej.: `"America/Lima"` |

### CreatePermissionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"orders.manage"` |
| `name` | string | sí | Ej.: `"Gestionar pedidos"` |
| `description` | string | no |  |

### CreateProductDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryIds` | string[] | no | Categorías de la organización de la sede (puede tener varias o ninguna) |
| `code` | string | sí | Único dentro del restaurante. Ej.: `"CEV-01"` |
| `name` | string | sí | Ej.: `"Ceviche clásico"` |
| `description` | string | no | Ej.: `"Pescado fresco marinado en limón"` |
| `imageUrl` | string | no | Ej.: `"https://cdn.example.com/ceviche.jpg"` |
| `price` | number | sí | (mín. 0) Ej.: `32.5` |
| `preparationMinutes` | number | no | Ej.: `15` |
| `isAvailable` | boolean | no | false = agotado hoy (sigue en la carta, no se puede pedir) Por defecto: `true`. |
| `isTakeawayAllowed` | boolean | no | Se puede pedir para recojo. Por defecto: `true`. |
| `isDeliveryAllowed` | boolean | no | Se puede pedir por delivery. Por defecto: `true`. |
| `tags` | string[] | no | Etiquetas libres para buscar y filtrar (hasta 20; se ignoran repetidas) Ej.: `["picante","bandera"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no | Ej.: `"En plato hondo, con arroz aparte"` |
| `menu` | [ProductMenuPlacementDto](#productmenuplacementdto) | no | Lo agrega a un menú en la misma transacción (crear y publicar en una llamada) |

### CreateProviderStatusMappingDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `providerCode` | string | sí | Ej.: `"mercado_pago"` |
| `externalStatus` | string | sí | Estado tal como lo envía la pasarela. Ej.: `"approved"` |
| `paymentStatus` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí |  |

### CreateRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | (mín. 2 caracteres) Ej.: `"Sabores Miraflores"` |
| `code` | string | no | Único dentro de la organización. Se genera a partir del slug si no se envía. Ej.: `"MIRAFLORES"` |
| `slug` | string | no | Se genera a partir del nombre si no se envía. Ej.: `"sabores-miraflores"` |
| `description` | string | no |  |
| `address` | string | no | Ej.: `"Av. Larco 123, Miraflores"` |
| `phone` | string | no | Ej.: `"+51 1 234 5678"` |
| `email` | string | no | Ej.: `"miraflores@sabores.pe"` |
| `latitude` | number | no | Ej.: `-12.1211` |
| `longitude` | number | no | Ej.: `-77.0297` |
| `currencyCode` | string | no | Por defecto, la de la organización. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto, la de la organización. Ej.: `"America/Lima"` |
| `floorsCount` | number | no | Pisos vacíos con los que arranca el plano ("Piso 1", "Piso 2"...) Por defecto: `0`. (mín. 0, máx. 20) |

### CreateRestaurantFloorDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Ej.: `"Primer piso"` |
| `sortOrder` | number | no | Por defecto: `0`. Ej.: `0` |

### CreateRoleDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | sí | Único dentro de la organización. Ej.: `"WAITER"` |
| `name` | string | sí | Ej.: `"Mozo"` |
| `description` | string | no | Ej.: `"Toma pedidos en sala"` |
| `permissions` | string[] | no | Códigos de permisos activos; el rol queda exactamente con estos. Ej.: `["attentions.manage","kitchen.read"]` |

### CreateServiceTypeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requiresTable` | boolean | no | Solo DINE_IN. |
| `requiresCustomerAddress` | boolean | no | Solo DELIVERY. |
| `minimumOrderAmount` | number | no | Ej.: `30` |
| `deliveryFee` | number | no | Ej.: `7.5` |
| `restaurantId` | string | sí | Sede que ofrece el tipo de servicio. |
| `code` | string | sí | Ej.: `"DELIVERY_PROPIO"` |
| `name` | string | sí | Ej.: `"Delivery propio"` |
| `sortOrder` | number | sí | Ej.: `30` |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí | Reglas que aplica el backend; no se puede cambiar. |

### CreateSupplyDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryId` | string | sí | Categoría de inventario de la misma organización. |
| `code` | string | sí | Único por organización (se guarda en mayúsculas) Ej.: `"ARROZ"` |
| `name` | string | sí | Ej.: `"Arroz"` |
| `unitCode` | string | sí | Unidad base del catálogo (GET /units-of-measure) Ej.: `"KG"` |
| `description` | string | no |  |

### CreateUserDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `mustChangePassword` | boolean | no | Obliga a cambiar la contraseña en el primer ingreso. Por defecto: `false`. |

### CreateWorkAreaDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `organizationId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | sí | Único por organización (sin distinguir mayúsculas) Ej.: `"Cocina"` |
| `description` | string | no |  |

### CustomerMeResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string \| null | no | Ej.: `"Pérez"` |
| `phone` | string \| null | no |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `BLOCKED` | sí |  |
| `mustChangePassword` | boolean | sí |  |
| `lastLoginAt` | string (fecha-hora ISO) \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |
| `dietaryPreferences` | string \| null | no |  |
| `allergies` | string \| null | no | Ej.: `"Maní, mariscos"` |
| `birthDate` | string (YYYY-MM-DD) \| null | no | Ej.: `"1994-05-21"` |
| `marketingOptIn` | boolean | sí |  |

### DailyClosureResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `businessDate` | string | sí | Ej.: `"2026-10-25"` |
| `openedAttentions` | number | sí |  |
| `closedAttentions` | number | sí |  |
| `cancelledAttentions` | number | sí |  |
| `grossSales` | number | sí |  |
| `refundedAmount` | number | sí |  |
| `netSales` | number | sí |  |
| `expenseAmount` | number | sí |  |
| `expectedCash` | number | sí | Efectivo cobrado - gastos pagados en efectivo (mínimo 0) |
| `byMethod` | [PaymentMethodTotalDto](#paymentmethodtotaldto)[] | sí | Neto cobrado por método de pago. |
| `id` | string | sí |  |
| `actualCash` | number \| null | no |  |
| `differenceAmount` | number \| null | no | actualCash - expectedCash. |
| `notes` | string \| null | no |  |
| `closedByUserId` | string | sí |  |
| `closedAt` | string (fecha-hora ISO) | sí |  |
| `supersededAt` | string (fecha-hora ISO) \| null | no | Si tiene fecha, otro cierre de la misma fecha lo reemplazó (historial) |
| `supersededByClosureId` | string \| null | no |  |
| `replacementReason` | string \| null | no | Por qué este cierre reemplazó al anterior de su fecha. |

### DailyFinancialsDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `openedAttentions` | number | sí |  |
| `closedAttentions` | number | sí |  |
| `cancelledAttentions` | number | sí |  |
| `grossSales` | number | sí |  |
| `refundedAmount` | number | sí |  |
| `netSales` | number | sí | Ventas brutas menos reembolsos. |
| `expenseAmount` | number | sí | Gastos registrados (no anulados) |
| `profit` | number | sí | Ventas netas menos gastos (sin costo de insumos ni de personal) |
| `averageTicket` | number | sí | Ventas netas / atenciones cerradas. |
| `byMethod` | [PaymentMethodTotalDto](#paymentmethodtotaldto)[] | sí |  |
| `businessDate` | string | sí | Ej.: `"2026-10-25"` |

### DailyFinancialsReportDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `from` | string | sí | Ej.: `"2026-10-01"` |
| `to` | string | sí | Ej.: `"2026-10-31"` |
| `days` | [DailyFinancialsDto](#dailyfinancialsdto)[] | sí | Todos los días del periodo, con ceros si no hubo actividad. |
| `totals` | [PeriodTotalsDto](#periodtotalsdto) | sí |  |

### DeactivatedExpenseCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |
| `movedExpenses` | number | no | Solo con moveTo: gastos movidos a la otra categoría. |

### DiningTableQrDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `active` | boolean | sí | Hay un QR vigente para la mesa. |
| `version` | number \| null | no | Aumenta en cada regeneración. |
| `generatedAt` | string (fecha-hora ISO) \| null | no |  |
| `assetUrl` | string \| null | no | Imagen del QR, si se almacena afuera. |

### DiningTableResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `floorId` | string | sí |  |
| `code` | string | sí | Ej.: `"M01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number \| null | no |  |
| `operationalStatus` | `ACTIVE` \| `INACTIVE` \| `MAINTENANCE` | sí |  |
| `serviceStatus` | `AVAILABLE` \| `RESERVED` \| `CLEANING` | sí |  |
| `positionX` | number \| null | no |  |
| `positionY` | number \| null | no |  |
| `qr` | [DiningTableQrDto](#diningtableqrdto) | sí | Nunca incluye el token ni su hash. |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### EmployeeResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `userId` | string \| null | no |  |
| `employeeCode` | string | sí | Ej.: `"EMP-001"` |
| `documentNumber` | string \| null | no |  |
| `jobPositionId` | string \| null | no |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `TERMINATED` | sí |  |
| `hiredAt` | string \| null | no | Ej.: `"2026-01-15"` |
| `terminatedAt` | string \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### EnableRestaurantSupplyDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Sede donde se habilita el insumo. |
| `supplyId` | string | no | Insumo maestro existente de la misma organización (o supply para crear uno) |
| `supply` | [NewSupplyDto](#newsupplydto) | no | Insumo maestro nuevo: se crea en la organización y se habilita aquí en la misma transacción. |
| `minimumQuantity` | number | no | Por defecto: `0`. Ej.: `5` |
| `supplier` | string \| null | no | Proveedor habitual en esta sede. Ej.: `"Distribuidora Lima"` |

### ErrorLogResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `level` | `error` \| `fatal` | sí |  |
| `source` | string \| null | no | Ej.: `"HttpExceptionFilter"` |
| `message` | string | sí | Ej.: `"POST /products → INTERNAL_ERROR"` |
| `stack` | string \| null | no |  |
| `requestId` | string \| null | no | Mismo valor que el header X-Request-Id de la respuesta. |
| `method` | string \| null | no | Ej.: `"POST"` |
| `path` | string \| null | no | Ej.: `"/products"` |
| `statusCode` | number \| null | no | Ej.: `500` |
| `errorCode` | string \| null | no | Ej.: `"INTERNAL_ERROR"` |
| `userId` | string \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |

### ExpenseCategoryResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `name` | string | sí | Ej.: `"Servicios"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |

### ExpenseCategoryWithCountDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `name` | string | sí | Ej.: `"Servicios"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `expenseCount` | number | sí | Gastos vigentes (no anulados) de la categoría. |

### ExpenseResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `categoryId` | string | sí |  |
| `inventoryMovementId` | string \| null | no |  |
| `description` | string | sí |  |
| `amount` | number | sí |  |
| `expenseDate` | string | sí | Ej.: `"2026-10-25"` |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` \| null | no |  |
| `createdByUserId` | string \| null | no | Usuario que registró el gasto. |
| `status` | `REGISTERED` \| `VOIDED` | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |

### FloorPlanFloorDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí | Ej.: `"Terraza"` |
| `sortOrder` | number | sí |  |
| `isActive` | boolean | sí |  |

### FloorPlanKpisDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `tables` | number | sí | Mesas operativas. |
| `availableTables` | number | sí |  |
| `occupiedTables` | number | sí |  |
| `occupiedCapacity` | number | sí | Suma de la capacidad de las mesas ocupadas. |
| `activeAttentions` | number | sí | Atenciones activas, incluidas recojo y delivery. |
| `billRequested` | number | sí |  |
| `balance` | number | sí | Saldo por cobrar de las atenciones activas. |

### FloorPlanResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `floors` | [FloorPlanFloorDto](#floorplanfloordto)[] | sí |  |
| `tables` | [FloorPlanTableDto](#floorplantabledto)[] | sí |  |
| `kpis` | [FloorPlanKpisDto](#floorplankpisdto) | sí |  |

### FloorPlanTableDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `floorId` | string | sí |  |
| `code` | string | sí | Ej.: `"M-01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number \| null | no |  |
| `operationalStatus` | string | sí | Ej.: `"ACTIVE"` |
| `serviceStatus` | string | sí | Ej.: `"AVAILABLE"` |
| `qr` | [TableQrStateDto](#tableqrstatedto) | sí |  |
| `positionX` | number \| null | no |  |
| `positionY` | number \| null | no |  |
| `occupancy` | `AVAILABLE` \| `OCCUPIED` \| `BILL_REQUESTED` \| `UNAVAILABLE` | sí | Ocupada = tiene una atención activa; no se guarda en la mesa. |
| `activeAttention` | [TableAttentionDto](#tableattentiondto) \| null | no |  |

### ForgotPasswordDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |

### FulfillmentDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `customerName` | string | sí | Ej.: `"Ana Torres"` |
| `customerPhone` | string | sí | Ej.: `"+51 999 999 999"` |
| `scheduledAt` | string (fecha-hora ISO) | no | Hora programada de recojo/entrega. |
| `deliveryAddress` | string | no | Requerido en DELIVERY. Ej.: `"Av. Larco 123, Miraflores"` |
| `deliveryReference` | string | no | Ej.: `"Puerta verde, 3er piso"` |
| `latitude` | number | no |  |
| `longitude` | number | no |  |
| `eatAtRestaurant` | boolean | no | PICKUP: comerá en el local. |

### FulfillmentResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `type` | `PICKUP` \| `DELIVERY` | sí |  |
| `status` | `PENDING` \| `CONFIRMED` \| `PREPARING` \| `READY` \| `OUT_FOR_DELIVERY` \| `COMPLETED` \| `CANCELLED` | sí |  |
| `customerName` | string | sí |  |
| `customerPhone` | string | sí |  |
| `scheduledAt` | string (fecha-hora ISO) \| null | no |  |
| `deliveryAddress` | string \| null | no |  |
| `deliveryReference` | string \| null | no |  |
| `deliveryFee` | number | sí |  |
| `estimatedReadyAt` | string (fecha-hora ISO) \| null | no |  |
| `deliveredAt` | string (fecha-hora ISO) \| null | no |  |

### GeneratedQrResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `table` | [DiningTableResponseDto](#diningtableresponsedto) | sí |  |
| `qrToken` | string | sí | Token del QR. Solo se devuelve aquí: en la base queda únicamente su SHA-256. |
| `qrUrl` | string | sí | URL a codificar en la imagen del QR. Ej.: `"https://app.acmr.pe/t/<qrToken>"` |

### GenerateQrDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `assetUrl` | string | no | Ubicación de la imagen si se guarda en almacenamiento externo. Si se genera bajo demanda, omitir. Ej.: `"https://storage.example.com/qr/mesa-1.png"` |

### IdResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string (uuid) | sí |  |

### IngredientResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `productId` | string | sí |  |
| `name` | string | sí | Ej.: `"Cebolla morada"` |
| `sortOrder` | number | sí |  |
| `isVisible` | boolean | sí |  |

### InventoryCategoryResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `name` | string | sí | Ej.: `"Verduras"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### InventoryMovementResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantSupplyId` | string | sí |  |
| `type` | `PURCHASE` \| `USAGE` \| `WASTE` \| `COUNT_ADJUSTMENT_IN` \| `COUNT_ADJUSTMENT_OUT` \| `MANUAL_ADJUSTMENT_IN` \| `MANUAL_ADJUSTMENT_OUT` \| `REVERSAL` | sí |  |
| `quantityDelta` | number | sí | Positivo = entrada, negativo = salida. |
| `previousQuantity` | number | sí |  |
| `resultingQuantity` | number | sí |  |
| `countedQuantity` | number \| null | no | Solo en conteos. |
| `unitCost` | number \| null | no |  |
| `notes` | string \| null | no |  |
| `originModule` | string \| null | no |  |
| `originId` | string \| null | no |  |
| `idempotencyKey` | string \| null | no |  |
| `createdByUserId` | string \| null | no |  |
| `reversalOfMovementId` | string \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |

### JobPositionResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `workAreaId` | string | sí |  |
| `name` | string | sí | Ej.: `"Cocinero"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### LoginDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `password` | string | sí | Ej.: `"S3cret-password"` |

### MemberRoleDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `code` | string | sí | Ej.: `"CASHIER"` |
| `name` | string | sí | Ej.: `"Cajero"` |

### MembershipResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `userId` | string | sí |  |
| `roleId` | string | sí |  |
| `allRestaurants` | boolean | sí |  |
| `restaurantIds` | string[] | sí |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `INVITED` \| `SUSPENDED` | sí |  |
| `joinedAt` | string (fecha-hora ISO) | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### MembershipWithPeopleResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `userId` | string | sí |  |
| `roleId` | string | sí |  |
| `allRestaurants` | boolean | sí |  |
| `restaurantIds` | string[] | sí |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `INVITED` \| `SUSPENDED` | sí |  |
| `joinedAt` | string (fecha-hora ISO) | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |
| `user` | [MemberUserDto](#memberuserdto) | sí |  |
| `role` | [MemberRoleDto](#memberroledto) | sí |  |
| `employeeId` | string \| null | no | Empleado de la organización vinculado al usuario. |

### MemberUserDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `email` | string | sí |  |
| `firstName` | string | sí |  |
| `lastName` | string \| null | no |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `BLOCKED` | sí | Estado de la cuenta (global) |

### MenuProductDetailResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string | sí |  |
| `productId` | string | sí |  |
| `menuSectionId` | string \| null | no |  |
| `displayPrice` | number \| null | no |  |
| `sortOrder` | number | sí |  |
| `isVisible` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `product` | [ProductResponseDto](#productresponsedto) | sí | El producto (incluso inactivo o agotado), para la administración de la carta. |

### MenuProductResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string | sí |  |
| `productId` | string | sí |  |
| `menuSectionId` | string \| null | no |  |
| `displayPrice` | number \| null | no |  |
| `sortOrder` | number | sí |  |
| `isVisible` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |

### MenuResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `name` | string | sí | Ej.: `"Carta principal"` |
| `description` | string \| null | no |  |
| `status` | `DRAFT` \| `ACTIVE` \| `INACTIVE` | sí |  |
| `validFrom` | string (fecha-hora ISO) \| null | no |  |
| `validUntil` | string (fecha-hora ISO) \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### MenuSectionResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `menuId` | string | sí |  |
| `categoryId` | string \| null | no |  |
| `name` | string | sí | Ej.: `"Entradas"` |
| `sortOrder` | number | sí |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### MovementResultResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantSupply` | [RestaurantSupplyResponseDto](#restaurantsupplyresponsedto) | sí |  |
| `movement` | [InventoryMovementResponseDto](#inventorymovementresponsedto) \| null | no | null si el conteo coincidió con el saldo registrado. |

### MovementTypeResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"PURCHASE"` |
| `name` | string | sí | Ej.: `"Compra"` |
| `effect` | `INCREASE` \| `DECREASE` \| `CALCULATED` | sí |  |
| `isActive` | boolean | sí |  |

### NamedRefDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí |  |

### NewSupplyDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | sí | Categoría de inventario de la misma organización. |
| `code` | string | sí | Único por organización (se guarda en mayúsculas) Ej.: `"ARROZ"` |
| `name` | string | sí | Ej.: `"Arroz"` |
| `unitCode` | string | sí | Unidad base del catálogo (GET /units-of-measure) Ej.: `"KG"` |
| `description` | string | no |  |

### OpenAttentionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `serviceTypeId` | string | no | Tipo de servicio de la sede (GET /service-types). Alternativa a fulfillmentMode. |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | no | Usa el primer tipo de servicio activo de la sede con esta modalidad. |
| `diningTableId` | string | no | Requerido si el tipo de servicio exige mesa. |
| `restaurantId` | string | no | Requerido sin mesa ni serviceTypeId. |
| `customerUserId` | string | no | Comensal registrado titular de la cuenta. |
| `fulfillment` | [FulfillmentDto](#fulfillmentdto) | no | Requerido en PICKUP / DELIVERY. |

### OrderItemHistoryResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `previousStatus` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` \| null | no |  |
| `previousStatusId` | string \| null | no |  |
| `newStatus` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí |  |
| `newStatusId` | string | sí |  |
| `changedByUserId` | string \| null | no |  |
| `reason` | string \| null | no |  |
| `changedAt` | string (fecha-hora ISO) | sí |  |
| `versionBefore` | number \| null | no |  |

### OrderItemResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `orderId` | string | sí |  |
| `productId` | string | sí |  |
| `requestedByParticipantId` | string \| null | no |  |
| `productName` | string | sí | Nombre del producto al momento del pedido. |
| `unitPrice` | number | sí | Precio al momento del pedido. |
| `quantity` | number | sí |  |
| `subtotal` | number | sí |  |
| `customerNote` | string \| null | no |  |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí | Estado de la sede (nombre y color en GET /order-statuses) |
| `rejectionReason` | string \| null | no |  |
| `version` | number | sí | Enviar en el cambio de estado (concurrencia optimista) |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### OrderLineDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `quantity` | number | sí | (mín. 1) Ej.: `2` |
| `customerNote` | string | no | Ej.: `"Sin cebolla"` |

### OrderResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `attentionId` | string | sí |  |
| `requestId` | string | sí |  |
| `source` | `CUSTOMER` \| `WAITER` | sí |  |
| `submittedByUserId` | string \| null | no |  |
| `submittedByParticipantId` | string \| null | no |  |
| `status` | `SUBMITTED` \| `CONFIRMED` \| `IN_PREPARATION` \| `READY` \| `SERVED` \| `REJECTED` \| `CANCELLED` | sí | Estado canónico. |
| `statusId` | string | sí |  |
| `submittedAt` | string (fecha-hora ISO) | sí |  |
| `confirmedAt` | string (fecha-hora ISO) \| null | no |  |
| `items` | [OrderItemResponseDto](#orderitemresponsedto)[] | sí |  |

### OrganizationResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí | Ej.: `"Grupo Sabores"` |
| `legalName` | string \| null | no |  |
| `taxIdentifier` | string \| null | no |  |
| `currencyCode` | string | sí | Ej.: `"PEN"` |
| `timezone` | string | sí | Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### OwnerOrganizationDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Grupo Sabores"` |
| `legalName` | string | no | Ej.: `"Grupo Sabores S.A.C."` |
| `taxIdentifier` | string | no | Ej.: `"20601234567"` |
| `currencyCode` | string | no | Por defecto: `"PEN"`. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto: `"America/Lima"`. Ej.: `"America/Lima"` |

### OwnerRegistrationResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `accessToken` | string | sí |  |
| `refreshToken` | string | sí |  |
| `user` | [UserResponseDto](#userresponsedto) | sí |  |
| `organization` | [RegisteredOrganizationDto](#registeredorganizationdto) | sí |  |
| `restaurant` | [RegisteredRestaurantDto](#registeredrestaurantdto) \| null | no |  |
| `roleId` | string | sí | Rol OWNER creado para la organización. |
| `membershipId` | string | sí |  |
| `permissionCount` | number | sí | Permisos asignados al rol OWNER. |

### OwnerRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Sabores Miraflores"` |
| `address` | string | no | Ej.: `"Av. Larco 123, Miraflores"` |
| `phone` | string | no |  |
| `email` | string | no |  |

### PageMetaDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `page` | number | sí | Ej.: `1` |
| `limit` | number | sí | Ej.: `20` |
| `total` | number | sí | Ej.: `42` |
| `totalPages` | number | sí | Ej.: `3` |

### ParticipantResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `userId` | string \| null | no |  |
| `displayName` | string \| null | no |  |
| `joinedAt` | string (fecha-hora ISO) | sí |  |

### PaymentMethodTotalDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | sí |  |
| `amount` | number | sí | Neto cobrado (pagos - reembolsos) |

### PaymentResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `attentionId` | string | sí |  |
| `restaurantId` | string | sí |  |
| `status` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí | Estado interno de ACMR. |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | sí |  |
| `allocationMode` | `ITEMS` \| `FULL` \| `AMOUNT` | sí |  |
| `amount` | number | sí |  |
| `currencyCode` | string | sí | Ej.: `"PEN"` |
| `payerUserId` | string \| null | no |  |
| `payerName` | string \| null | no |  |
| `externalReference` | string \| null | no |  |
| `provider` | [ProviderResponseDto](#providerresponsedto) \| null | no |  |
| `requestId` | string | sí |  |
| `notes` | string \| null | no |  |
| `paidAt` | string (fecha-hora ISO) \| null | no |  |
| `createdByUserId` | string \| null | no | Usuario que registró el pago. |
| `allocations` | [AllocationResponseDto](#allocationresponsedto)[] | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### PaymentStatusResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí | Código estable e inmutable. |
| `name` | string | sí |  |
| `description` | string \| null | no |  |
| `isFinal` | boolean | sí | Estado final: el pago ya no cambia. |
| `countsTowardBalance` | boolean | sí | Si reduce el saldo de la atención. |
| `reservesBalance` | boolean | sí | Si un intento sin confirmar bloquea su monto para evitar cobros duplicados. |
| `allowsRefund` | boolean | sí |  |
| `isActive` | boolean | sí |  |

### PeriodTotalsDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `openedAttentions` | number | sí |  |
| `closedAttentions` | number | sí |  |
| `cancelledAttentions` | number | sí |  |
| `grossSales` | number | sí |  |
| `refundedAmount` | number | sí |  |
| `netSales` | number | sí | Ventas brutas menos reembolsos. |
| `expenseAmount` | number | sí | Gastos registrados (no anulados) |
| `profit` | number | sí | Ventas netas menos gastos (sin costo de insumos ni de personal) |
| `averageTicket` | number | sí | Ventas netas / atenciones cerradas. |
| `byMethod` | [PaymentMethodTotalDto](#paymentmethodtotaldto)[] | sí |  |

### PermissionResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `code` | string | sí | Ej.: `"orders.manage"` |
| `name` | string | sí | Ej.: `"Gestionar pedidos"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### ProductMenuPlacementDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuId` | string | sí | Menú de la misma sede. |
| `menuSectionId` | string \| null | no | Sección activa de ese menú; sin ella, el producto queda sin sección. |
| `sortOrder` | number | no | Orden dentro de su sección (menor primero) Por defecto: `0`. |

### ProductResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `code` | string | sí | Ej.: `"CEV-01"` |
| `name` | string | sí | Ej.: `"Ceviche clásico"` |
| `description` | string \| null | no |  |
| `imageUrl` | string \| null | no |  |
| `price` | number | sí | Ej.: `32.5` |
| `preparationMinutes` | number \| null | no |  |
| `tags` | string[] | sí | Ej.: `["picante"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no |  |
| `isAvailable` | boolean | sí |  |
| `isTakeawayAllowed` | boolean | sí |  |
| `isDeliveryAllowed` | boolean | sí |  |
| `status` | `ACTIVE` \| `INACTIVE` | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### ProductSalesDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí |  |
| `productName` | string | sí | Ej.: `"Lomo saltado"` |
| `quantity` | number | sí |  |
| `subtotal` | number | sí |  |

### ProviderDataDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"mercado_pago"` |
| `paymentId` | string | no | Identificador del pago en la pasarela. |
| `status` | string | no | Estado original informado por la pasarela. Ej.: `"approved"` |

### ProviderEventDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `eventId` | string | sí | Identificador único del evento en la pasarela. |
| `eventType` | string | sí | Ej.: `"payment.updated"` |
| `providerPaymentId` | string | no | Id del pago en la pasarela (identifica el pago a actualizar) |
| `externalStatus` | string | no | Ej.: `"approved"` |
| `payload` | object | no | Payload original (los datos de tarjeta se eliminan) |

### ProviderEventResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `providerCode` | string | sí |  |
| `eventId` | string | sí |  |
| `eventType` | string | sí |  |
| `providerPaymentId` | string \| null | no |  |
| `externalStatus` | string \| null | no |  |
| `paymentId` | string \| null | no |  |
| `payload` | object | sí | Cuerpo del evento tal como llegó (sin datos de tarjeta) |
| `receivedAt` | string (fecha-hora ISO) | sí |  |
| `processedAt` | string (fecha-hora ISO) \| null | no |  |
| `result` | `PROCESSED` \| `IGNORED` \| `FAILED` \| null | no |  |
| `resultMessage` | string \| null | no |  |
| `duplicate` | boolean | sí | true si el evento ya se había recibido (no se volvió a aplicar) |

### ProviderResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí |  |
| `paymentId` | string \| null | no |  |
| `status` | string \| null | no | Último estado original de la pasarela. |

### ProviderStatusMappingResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `providerCode` | string | sí |  |
| `externalStatus` | string | sí |  |
| `paymentStatus` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | sí |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### PurchaseExpenseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | sí | Categoría de gasto de la organización (activa) |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` \| null | no |  |

### RecipeLineResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `productId` | string | sí |  |
| `supplyId` | string | sí |  |
| `quantityRequired` | number | sí |  |
| `wastePercentage` | number | sí |  |
| `effectiveQuantity` | number | sí | quantityRequired incluyendo la merma. |

### RefreshDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `refreshToken` | string | sí | Ej.: `"<refresh token>"` |

### RegisterCustomerDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"ana@mail.com"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Torres"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `dietaryPreferences` | string | no | Ej.: `"Vegetariana, sin maní"` |

### RegisteredOrganizationDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí |  |

### RegisteredRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí |  |
| `slug` | string | sí |  |

### RegisterExpenseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí | Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `categoryId` | string | sí | Categoría de gasto de la misma organización. |
| `description` | string | sí | Ej.: `"Recibo de luz octubre"` |
| `amount` | number | sí | Ej.: `320.5` |
| `expenseDate` | string | sí | Fecha del gasto (YYYY-MM-DD) Ej.: `"2026-10-25"` |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | no | Si es CASH, descuenta del efectivo esperado del cierre. |

### RegisterMovementDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | no |  |
| `idempotencyKey` | string | no | Repetir la misma clave devuelve el mismo movimiento. |
| `type` | `PURCHASE` \| `USAGE` \| `WASTE` \| `MANUAL_ADJUSTMENT_IN` \| `MANUAL_ADJUSTMENT_OUT` | sí |  |
| `quantity` | number | sí | Siempre positiva; el tipo define si suma o resta. Ej.: `10` |
| `unitCost` | number | no | Solo en compras: recalcula el costo promedio. Ej.: `4.5` |
| `supplier` | string \| null | no | Solo en compras: pasa a ser el proveedor habitual del insumo en la sede. Ej.: `"Mercado Mayorista"` |
| `registerExpense` | [PurchaseExpenseDto](#purchaseexpensedto) | no | Solo en compras con unitCost: registra el costo (cantidad × costo unitario) como gasto de la sede, con fecha de hoy y ligado al movimiento, en la misma transacción. |

### RegisterOwnerDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | sí | Ej.: `"duena@sabores.pe"` |
| `password` | string | sí | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | sí | Ej.: `"Lucía"` |
| `lastName` | string | no | Ej.: `"Ramos"` |
| `phone` | string | no |  |
| `organization` | [OwnerOrganizationDto](#ownerorganizationdto) | sí |  |
| `restaurant` | [OwnerRestaurantDto](#ownerrestaurantdto) | no | Primera sede, si el onboarding ya la pide. |

### RegisterPaymentDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `attentionId` | string | sí | Atención que se cobra (activa) |
| `requestId` | string | sí | UUID generado por el cliente. Reenviarlo devuelve el mismo pago. |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | sí |  |
| `allocationMode` | `ITEMS` \| `FULL` \| `AMOUNT` | sí | FULL: todo el saldo. AMOUNT: un monto libre (se reparte automáticamente). ITEMS: productos y montos elegidos. |
| `amount` | number | no | Solo para AMOUNT. Ej.: `45` |
| `allocations` | [RequestedAllocationDto](#requestedallocationdto)[] | no | Solo para ITEMS. |
| `payerUserId` | string | no | Usuario que paga, si tiene cuenta. |
| `payerName` | string | no | Ej.: `"Ana"` |
| `externalReference` | string | no | Referencia manual, p. ej. número de operación Yape. |
| `notes` | string | no |  |
| `provider` | [ProviderDataDto](#providerdatadto) | no | Solo si interviene una pasarela; sin esto el pago queda PAID. |

### RenameMovementTypeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | sí | Ej.: `"Compra a proveedor"` |

### RenamePaymentStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Pagado"` |
| `description` | string | no |  |

### ReorderMenuProductsDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuSectionId` | string \| null | no | Sección cuyos productos se ordenan; null u omitido = los productos sin sección. |
| `productIds` | string[] | sí | Todos los productos de esa sección en el nuevo orden. |

### ReorderMenuSectionsDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `ids` | string[] | sí | Todas las secciones del menú (incluidas las ocultas) en el nuevo orden. |

### RequestedAllocationDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `orderItemId` | string | no | Producto a pagar; omitirlo para pagar el costo de envío. |
| `amount` | number | sí | Ej.: `40` |

### ResetPasswordDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `token` | string | sí | Ej.: `"<token from the email>"` |
| `newPassword` | string | sí | (mín. 8 caracteres) Ej.: `"N3w-password"` |

### RestaurantFloorResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `name` | string | sí | Ej.: `"Primer piso"` |
| `sortOrder` | number | sí |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### RestaurantMetricsDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `from` | string | sí |  |
| `to` | string | sí |  |
| `totals` | [PeriodTotalsDto](#periodtotalsdto) | sí |  |
| `topProducts` | [ProductSalesDto](#productsalesdto)[] | sí | Más vendidos por cantidad. |
| `stageTimes` | [StageTimeDto](#stagetimedto)[] | sí | Espera (SUBMITTED→IN_PREPARATION), preparación (→READY), entrega (→SERVED) y total (SUBMITTED→SERVED) |

### RestaurantOverviewDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `name` | string | sí | Ej.: `"Sabores Miraflores"` |
| `slug` | string | sí | Ej.: `"sabores-miraflores"` |
| `isActive` | boolean | sí |  |
| `businessDate` | string | sí | Hoy en la zona horaria de la sede. Ej.: `"2026-11-08"` |
| `activeAttentions` | number | sí | Atenciones abiertas en este momento. |
| `today` | [DailyFinancialsDto](#dailyfinancialsdto) | sí | Cifras de hoy (como el cierre del día) |

### RestaurantResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `code` | string | sí | Ej.: `"MIRAFLORES"` |
| `slug` | string | sí | Ej.: `"sabores-miraflores"` |
| `name` | string | sí | Ej.: `"Sabores Miraflores"` |
| `description` | string \| null | no |  |
| `address` | string \| null | no |  |
| `phone` | string \| null | no |  |
| `email` | string \| null | no |  |
| `latitude` | number \| null | no |  |
| `longitude` | number \| null | no |  |
| `currencyCode` | string | sí | Ej.: `"PEN"` |
| `timezone` | string | sí | Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### RestaurantSupplyResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `supply` | [SupplySummaryDto](#supplysummarydto) | sí |  |
| `currentQuantity` | number | sí |  |
| `minimumQuantity` | number | sí |  |
| `averageUnitCost` | number | sí |  |
| `supplier` | string \| null | no | Proveedor habitual en la sede. |
| `lowStock` | boolean | sí | Alerta: el saldo llegó o bajó del mínimo. |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### ReverseMovementDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `notes` | string | sí | Ej.: `"Compra registrada dos veces"` |
| `idempotencyKey` | string | no | Repetirla devuelve la misma reversión (200) en vez de crear otra. |

### RoleRefDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí |  |
| `code` | string | sí | Ej.: `"CASHIER"` |

### RoleWithAccessResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `code` | string | sí | Ej.: `"WAITER"` |
| `name` | string | sí | Ej.: `"Mozo"` |
| `description` | string \| null | no |  |
| `isSystem` | boolean | sí |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |
| `permissions` | string[] | sí | Permisos efectivos (OWNER siempre tiene todos) |
| `memberCount` | number | sí | Usuarios con este rol (membresías activas) |

### ServiceOfferResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"DELIVERY"` |
| `name` | string | sí | Ej.: `"Delivery"` |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `minimumOrderAmount` | number | sí | 0 = sin mínimo. Ej.: `30` |
| `deliveryFee` | number | sí | Ej.: `5` |

### ServiceTypeResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `code` | string | sí |  |
| `name` | string | sí |  |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | sí |  |
| `requiresTable` | boolean | sí |  |
| `requiresCustomerAddress` | boolean | sí |  |
| `minimumOrderAmount` | number | sí |  |
| `deliveryFee` | number | sí |  |
| `sortOrder` | number | sí |  |
| `isActive` | boolean | sí |  |

### SetRecipeLineDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `quantityRequired` | number | sí | Cantidad del insumo por unidad del producto. Ej.: `0.15` |
| `wastePercentage` | number | no | Merma esperada en %. Por defecto: `0`. Ej.: `10` |

### StaffAccessResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `membershipId` | string | sí |  |
| `organizationId` | string | sí |  |
| `organizationName` | string | sí |  |
| `role` | [RoleRefDto](#rolerefdto) | sí |  |
| `allRestaurants` | boolean | sí | true = todas las sedes de la organización. |
| `restaurantIds` | string[] | sí | Sedes permitidas si allRestaurants es false. |
| `permissions` | string[] | sí | Ej.: `["attentions.manage","payments.read"]` |

### StaffEmploymentResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `employeeId` | string | sí |  |
| `organizationId` | string | sí |  |
| `organizationName` | string | sí |  |
| `employeeCode` | string | sí |  |
| `status` | string | sí | Ej.: `"ACTIVE"` |
| `hiredAt` | string \| null | no | Ej.: `"2026-01-15"` |
| `jobPosition` | [NamedRefDto](#namedrefdto) \| null | no |  |
| `workArea` | [NamedRefDto](#namedrefdto) \| null | no |  |

### StaffLoginResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `accessToken` | string | sí |  |
| `refreshToken` | string | sí |  |
| `user` | [UserResponseDto](#userresponsedto) | sí |  |
| `isPlatformAdmin` | boolean | sí |  |
| `access` | [StaffAccessResponseDto](#staffaccessresponsedto)[] | sí | Membresías activas: rol, sedes y permisos por organización. |
| `employments` | [StaffEmploymentResponseDto](#staffemploymentresponsedto)[] | sí |  |

### StaffProfileResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `user` | [UserResponseDto](#userresponsedto) | sí |  |
| `isPlatformAdmin` | boolean | sí |  |
| `access` | [StaffAccessResponseDto](#staffaccessresponsedto)[] | sí | Membresías activas: rol, sedes y permisos por organización. |
| `employments` | [StaffEmploymentResponseDto](#staffemploymentresponsedto)[] | sí | Empleados vinculados al usuario (puesto y área) |

### StageTimeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `startStatus` | string | sí | Ej.: `"IN_PREPARATION"` |
| `endStatus` | string | sí | Ej.: `"READY"` |
| `averageMinutes` | number | sí | Ej.: `12.5` |
| `itemCount` | number | sí | Platos que pasaron por ambos estados. |

### StartCustomerAttentionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |
| `serviceTypeId` | string | no | Tipo de servicio de la sede (GET /service-types). Alternativa a fulfillmentMode. |
| `fulfillmentMode` | `DINE_IN` \| `PICKUP` \| `DELIVERY` | no | Usa el primer tipo de servicio activo de la sede con esta modalidad. |
| `qrToken` | string | no | Token del QR de la mesa. Requerido si el tipo de servicio exige mesa. |
| `restaurantId` | string | no | Requerido sin mesa ni serviceTypeId. |
| `displayName` | string | no | Cómo verán al comensal en la mesa. Ej.: `"Ana"` |
| `fulfillment` | [FulfillmentDto](#fulfillmentdto) | no | Requerido en PICKUP / DELIVERY. |

### StorefrontMenuResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurantId` | string | sí |  |
| `menu` | [MenuResponseDto](#menuresponsedto) \| null | no | Menú vigente; null si la sede no tiene uno. |
| `sections` | [MenuSectionResponseDto](#menusectionresponsedto)[] | sí | Secciones activas, en orden. |
| `products` | [StorefrontProductResponseDto](#storefrontproductresponsedto)[] | sí | Por orden de sección (sin sección al final) y luego orden en el menú. |

### StorefrontProductResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí | Ej.: `"Lomo saltado"` |
| `description` | string \| null | no |  |
| `imageUrl` | string \| null | no |  |
| `price` | number | sí | Precio que se cobra en el pedido. Ej.: `42` |
| `displayPrice` | number \| null | no | Precio de exhibición en este menú (si difiere) |
| `preparationMinutes` | number \| null | no |  |
| `tags` | string[] | sí | Ej.: `["picante"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no |  |
| `isAvailable` | boolean | sí | false = agotado hoy (se muestra igual) |
| `isTakeawayAllowed` | boolean | sí |  |
| `isDeliveryAllowed` | boolean | sí |  |
| `menuSectionId` | string \| null | no | Sección del menú; null = sin sección. |

### StorefrontRestaurantResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `slug` | string | sí | Ej.: `"sabores-miraflores"` |
| `name` | string | sí | Ej.: `"Sabores Miraflores"` |
| `description` | string \| null | no |  |
| `address` | string \| null | no |  |
| `phone` | string \| null | no |  |
| `email` | string \| null | no |  |
| `latitude` | number \| null | no |  |
| `longitude` | number \| null | no |  |
| `currencyCode` | string | sí | Ej.: `"PEN"` |
| `timezone` | string | sí | Ej.: `"America/Lima"` |
| `services` | [ServiceOfferResponseDto](#serviceofferresponsedto)[] | sí | Modalidades activas (en mesa, recojo, delivery) con mínimo y costo de envío. |

### SubmitOrderDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |

### SupplyResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `categoryId` | string | sí |  |
| `code` | string | sí | Ej.: `"ARROZ"` |
| `name` | string | sí | Ej.: `"Arroz"` |
| `unitCode` | string | sí | Ej.: `"KG"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### SupplySummaryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `code` | string | sí | Ej.: `"ARROZ"` |
| `name` | string | sí | Ej.: `"Arroz"` |
| `unitCode` | string | sí | Ej.: `"KG"` |

### TableAttentionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `attentionNumber` | string | sí | Ej.: `"A-0042"` |
| `status` | `OPEN` \| `BILL_REQUESTED` \| `CLOSED` \| `CANCELLED` | sí |  |
| `statusId` | string | sí |  |
| `openedAt` | string (fecha-hora ISO) | sí |  |
| `billRequestedAt` | string (fecha-hora ISO) \| null | no |  |
| `total` | number | sí |  |
| `paid` | number | sí |  |
| `balance` | number | sí |  |

### TableQrResolveResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `restaurant` | [TableQrRestaurantDto](#tableqrrestaurantdto) | sí |  |
| `table` | [TableQrTableDto](#tableqrtabledto) | sí |  |
| `activeAttention` | [AttentionResponseDto](#attentionresponsedto) \| null | no |  |

### TableQrRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `slug` | string | sí |  |
| `name` | string | sí |  |

### TableQrStateDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `active` | boolean | sí | Tiene un QR vigente. |

### TableQrTableDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `code` | string | sí | Ej.: `"M01"` |
| `name` | string | sí | Ej.: `"Mesa 1"` |
| `capacity` | number \| null | no | Ej.: `4` |
| `floorId` | string | sí |  |

### TimelineEventResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `type` | `ATTENTION_OPENED` \| `ORDER_SUBMITTED` \| `ORDER_CONFIRMED` \| `ITEM_STATUS_CHANGED` \| `BILL_REQUESTED` \| `ATTENTION_CLOSED` \| `ATTENTION_CANCELLED` | sí |  |
| `at` | string (fecha-hora ISO) | sí |  |
| `orderId` | string \| null | no |  |
| `orderItemId` | string \| null | no |  |
| `productName` | string \| null | no | Ej.: `"Lomo saltado"` |
| `previousStatus` | string \| null | no | Estado canónico anterior del plato. |
| `newStatus` | string \| null | no | Estado canónico nuevo del plato. |
| `newStatusId` | string \| null | no | Estado de la sede (nombre y color en GET /order-statuses) |
| `userId` | string \| null | no | Quién envió la orden o cambió el plato. |
| `reason` | string \| null | no |  |

### UnitOfMeasureResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | sí | Ej.: `"KG"` |
| `name` | string | sí | Ej.: `"Kilogramo"` |
| `dimension` | `MASS` \| `VOLUME` \| `UNIT` | sí |  |
| `conversionFactorToBase` | number | sí | Factor a la unidad base de su dimensión (KG, L, UNIT) Ej.: `1` |
| `isActive` | boolean | sí |  |

### UpdateCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `parentCategoryId` | string | no | Categoría padre de la misma organización (vacío = categoría raíz) |
| `name` | string | no | Único dentro del mismo padre (sin distinguir mayúsculas) Ej.: `"Bebidas"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

### UpdateCustomerMeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `dietaryPreferences` | string | no | Ej.: `"Vegetariana, sin maní"` |
| `allergies` | string \| null | no | Alergias del comensal (texto libre). null las borra. Ej.: `"Maní, mariscos"` |
| `birthDate` | string (YYYY-MM-DD) \| null | no | Fecha de nacimiento (YYYY-MM-DD), no futura. Ej.: `"1994-05-21"` |
| `marketingOptIn` | boolean | no | Acepta recibir promociones. |

### UpdateDiningTableDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `floorId` | string | no | Piso de la mesa; el restaurante se toma del piso. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `code` | string | no | Único dentro del restaurante. Ej.: `"M01"` |
| `name` | string | no | Ej.: `"Mesa 1"` |
| `capacity` | number | no | Ej.: `4` |
| `positionX` | number | no | Posición en el plano del piso. Ej.: `120.5` |
| `positionY` | number | no | Ej.: `80` |
| `operationalStatus` | `ACTIVE` \| `INACTIVE` \| `MAINTENANCE` | no |  |
| `serviceStatus` | `AVAILABLE` \| `RESERVED` \| `CLEANING` | no |  |

### UpdateEmployeeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `userId` | string | no | Usuario con acceso al sistema. Omitir si el empleado no tiene acceso. |
| `employeeCode` | string | no | Único dentro de la organización. Ej.: `"EMP-001"` |
| `documentNumber` | string | no | Ej.: `"70123456"` |
| `jobPositionId` | string | no | Puesto vigente (de la misma organización y activo). El área se obtiene del puesto. |
| `hiredAt` | string | no | Ej.: `"2026-01-15"` |
| `terminatedAt` | string | no | Ej.: `"2026-12-31"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `TERMINATED` | no |  |

### UpdateExpenseCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Servicios"` |
| `description` | string | no | Ej.: `"Luz, agua, internet"` |
| `isActive` | boolean | no |  |

### UpdateExpenseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | no | Categoría de gasto de la misma organización. |
| `description` | string | no | Ej.: `"Recibo de luz octubre"` |
| `amount` | number | no | Ej.: `320.5` |
| `expenseDate` | string | no | Fecha del gasto (YYYY-MM-DD) Ej.: `"2026-10-25"` |
| `paymentMethod` | `CASH` \| `CARD` \| `YAPE` \| `PLIN` \| `BANK_TRANSFER` \| `OTHER` | no | Si es CASH, descuenta del efectivo esperado del cierre. |

### UpdateIngredientDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Cebolla morada"` |
| `sortOrder` | number | no | Orden en que se muestra (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | Mostrarlo en la carta. Por defecto: `true`. |

### UpdateInventoryCategoryDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Verduras"` |
| `description` | string | no |  |
| `isActive` | boolean | no |  |

### UpdateJobPositionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `workAreaId` | string | no | Área del puesto; la organización se toma del área. Ej.: `"424590bf-8d98-41c3-8ab9-e50440292401"` |
| `name` | string | no | Único por área (sin distinguir mayúsculas) Ej.: `"Cocinero"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

### UpdateMeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |

### UpdateMembershipDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `roleId` | string | no | Rol de la misma organización. |
| `allRestaurants` | boolean | no | true = acceso a todas las sedes (actuales y futuras) Por defecto: `false`. |
| `restaurantIds` | string[] | no | Sedes permitidas cuando allRestaurants es false. Lista vacía = sin acceso a sedes. |
| `status` | `ACTIVE` \| `INACTIVE` \| `INVITED` \| `SUSPENDED` | no |  |
| `employeeId` | string \| null | no | Empleado de la organización vinculado al usuario (null lo desvincula). Un empleado por usuario: si tenía otro, se desvincula. Se guarda junto con el acceso. |

### UpdateMenuDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Carta principal"` |
| `description` | string | no |  |
| `validFrom` | string (fecha-hora ISO) | no | Ej.: `"2026-11-01T00:00:00-05:00"` |
| `validUntil` | string (fecha-hora ISO) | no | Ej.: `"2026-12-31T23:59:59-05:00"` |
| `status` | `DRAFT` \| `ACTIVE` \| `INACTIVE` | no |  |

### UpdateMenuProductDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `menuSectionId` | string \| null | no | Sección del mismo menú (null = sin sección) |
| `displayPrice` | number | no | Precio a mostrar en este menú (el pedido usa el precio del producto) Ej.: `29.9` |
| `sortOrder` | number | no | Orden dentro de su sección (menor primero) Por defecto: `0`. |
| `isVisible` | boolean | no | false = oculto en la carta sin quitarlo del menú. Por defecto: `true`. |

### UpdateMenuSectionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Único dentro del menú (sin distinguir mayúsculas) Ej.: `"Entradas"` |
| `categoryId` | string | no | Categoría que reutiliza la sección (opcional) |
| `sortOrder` | number | no | Orden de la sección en el menú (menor primero) Por defecto: `0`. |
| `isActive` | boolean | no | false = ocultar la sección, true = mostrarla. |

### UpdateOrganizationDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | (mín. 2 caracteres) Ej.: `"Grupo Sabores"` |
| `legalName` | string | no | Ej.: `"Grupo Sabores S.A.C."` |
| `taxIdentifier` | string | no | RUC u otro identificador fiscal. Ej.: `"20601234567"` |
| `currencyCode` | string | no | Por defecto: `"PEN"`. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto: `"America/Lima"`. Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | no |  |

### UpdatePermissionDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Gestionar pedidos"` |
| `description` | string | no |  |
| `isActive` | boolean | no |  |

### UpdateProductDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `code` | string | no | Único dentro del restaurante. Ej.: `"CEV-01"` |
| `name` | string | no | Ej.: `"Ceviche clásico"` |
| `description` | string | no | Ej.: `"Pescado fresco marinado en limón"` |
| `imageUrl` | string | no | Ej.: `"https://cdn.example.com/ceviche.jpg"` |
| `price` | number | no | (mín. 0) Ej.: `32.5` |
| `preparationMinutes` | number | no | Ej.: `15` |
| `isAvailable` | boolean | no | false = agotado hoy (sigue en la carta, no se puede pedir) Por defecto: `true`. |
| `isTakeawayAllowed` | boolean | no | Se puede pedir para recojo. Por defecto: `true`. |
| `isDeliveryAllowed` | boolean | no | Se puede pedir por delivery. Por defecto: `true`. |
| `tags` | string[] | no | Etiquetas libres para buscar y filtrar (hasta 20; se ignoran repetidas) Ej.: `["picante","bandera"]` |
| `portion` | string \| null | no | Ej.: `"300 g"` |
| `presentation` | string \| null | no | Ej.: `"En plato hondo, con arroz aparte"` |
| `status` | `ACTIVE` \| `INACTIVE` | no |  |

### UpdateProviderStatusMappingDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `paymentStatus` | `PENDING` \| `PROCESSING` \| `PAID` \| `FAILED` \| `CANCELLED` \| `PARTIALLY_REFUNDED` \| `REFUNDED` | no |  |
| `isActive` | boolean | no |  |

### UpdateRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | (mín. 2 caracteres) Ej.: `"Sabores Miraflores"` |
| `description` | string | no |  |
| `address` | string | no | Ej.: `"Av. Larco 123, Miraflores"` |
| `phone` | string | no | Ej.: `"+51 1 234 5678"` |
| `email` | string | no | Ej.: `"miraflores@sabores.pe"` |
| `latitude` | number | no | Ej.: `-12.1211` |
| `longitude` | number | no | Ej.: `-77.0297` |
| `currencyCode` | string | no | Por defecto, la de la organización. Ej.: `"PEN"` |
| `timezone` | string | no | Por defecto, la de la organización. Ej.: `"America/Lima"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `SUSPENDED` | no |  |

### UpdateRestaurantFloorDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Primer piso"` |
| `sortOrder` | number | no | Por defecto: `0`. Ej.: `0` |
| `isActive` | boolean | no |  |

### UpdateRoleDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Mozo"` |
| `description` | string | no | Ej.: `"Toma pedidos en sala"` |
| `permissions` | string[] | no | Códigos de permisos activos; el rol queda exactamente con estos. Ej.: `["attentions.manage","kitchen.read"]` |
| `isActive` | boolean | no |  |

### UpdateServiceTypeDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requiresTable` | boolean | no | Solo DINE_IN. |
| `requiresCustomerAddress` | boolean | no | Solo DELIVERY. |
| `minimumOrderAmount` | number | no | Ej.: `30` |
| `deliveryFee` | number | no | Ej.: `7.5` |
| `code` | string | no | Único por sede. Ej.: `"DELIVERY_PROPIO"` |
| `name` | string | no | Ej.: `"Delivery propio"` |
| `sortOrder` | number | no | Ej.: `30` |
| `isActive` | boolean | no | false lo retira; las atenciones que lo usaron lo conservan. |

### UpdateSupplyDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `categoryId` | string | no | Categoría de inventario de la misma organización. |
| `code` | string | no | Único por organización (se guarda en mayúsculas) Ej.: `"ARROZ"` |
| `name` | string | no | Ej.: `"Arroz"` |
| `unitCode` | string | no | Unidad base del catálogo (GET /units-of-measure) Ej.: `"KG"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

### UpdateUnitOfMeasureDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Ej.: `"Kilogramo"` |
| `isActive` | boolean | no | false = no se puede usar en insumos nuevos. |

### UpdateUserDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `email` | string | no | Ej.: `"ana@restaurant.com"` |
| `password` | string | no | (mín. 8 caracteres) Ej.: `"S3cret-password"` |
| `firstName` | string | no | Ej.: `"Ana"` |
| `lastName` | string | no | Ej.: `"Pérez"` |
| `phone` | string | no | Ej.: `"+51 999 999 999"` |
| `status` | `ACTIVE` \| `INACTIVE` \| `BLOCKED` | no |  |

### UpdateWorkAreaDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `name` | string | no | Único por organización (sin distinguir mayúsculas) Ej.: `"Cocina"` |
| `description` | string | no |  |
| `isActive` | boolean | no | false = desactivar, true = reactivar. |

### UpdateWorkflowStatusDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `color` | string \| null | no | Ej.: `"#D97706"` |
| `isInitial` | boolean | no | true lo vuelve el estado inicial (el anterior deja de serlo) |
| `code` | string | no | Único por sede. Ej.: `"EN_HORNO"` |
| `name` | string | no | Ej.: `"En horno"` |
| `sortOrder` | number | no | Ej.: `35` |
| `isActive` | boolean | no | false lo desactiva (los registros que lo usan lo conservan). No aplica al estado inicial ni al último activo de su estado canónico. |

### UploadedFileResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `key` | string | sí | Ej.: `"restaurants/1f0c.../images/9a7b....webp"` |
| `url` | string | sí | URL pública para guardar en el registro (p. ej. imageUrl del producto) Ej.: `"https://cdn.acmr.pe/restaurants/1f0c.../images/9a7b....webp"` |

### UserResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `email` | string | sí | Ej.: `"ana@restaurant.com"` |
| `firstName` | string | sí | Ej.: `"Ana"` |
| `lastName` | string \| null | no | Ej.: `"Pérez"` |
| `phone` | string \| null | no |  |
| `status` | `ACTIVE` \| `INACTIVE` \| `BLOCKED` | sí |  |
| `mustChangePassword` | boolean | sí |  |
| `lastLoginAt` | string (fecha-hora ISO) \| null | no |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### VisitRestaurantDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `name` | string | sí | Ej.: `"Sabores Miraflores"` |
| `slug` | string | sí | Ej.: `"sabores-miraflores"` |

### WaiterOrderDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `requestId` | string | sí | UUID generado por el cliente para esta orden. Reenviarlo no duplica productos. Ej.: `"0b6f8c1e-3c1a-4b8e-9d6a-2f1e7c9a5b10"` |
| `items` | [OrderLineDto](#orderlinedto)[] | sí |  |
| `submittedByUserId` | string | no | Mozo que registra la orden. |

### WorkAreaResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `organizationId` | string | sí |  |
| `name` | string | sí | Ej.: `"Cocina"` |
| `description` | string \| null | no |  |
| `isActive` | boolean | sí |  |
| `createdAt` | string (fecha-hora ISO) | sí |  |
| `updatedAt` | string (fecha-hora ISO) | sí |  |

### WorkflowStatusResponseDto
| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `id` | string | sí |  |
| `restaurantId` | string | sí |  |
| `code` | string | sí |  |
| `name` | string | sí |  |
| `canonicalState` | string | sí | Estado canónico con el que opera el backend. |
| `color` | string \| null | no |  |
| `sortOrder` | number | sí |  |
| `isInitial` | boolean | sí |  |
| `isFinal` | boolean | sí |  |
| `isActive` | boolean | sí |  |
