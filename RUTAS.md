# Rutas del proyecto

Fuente: [src/app/router/index.ts](src/app/router/index.ts)

---

## Cliente (comensal)

Público, no requiere login.

- `/` ---> (Inicio: mapa y buscador de restaurantes cercanos, recientes)
- `/:restaurantSlug/menu` ---> (Carta de un restaurante, ej. `/bodega-san-telmo-grand-cru/menu`)
- `/table/:tableId` ---> (Entrada por QR de la mesa)
- `/cart` ---> (Tu orden / carrito)
- `/pedido/entrega` ---> (Cómo recibir el pedido: en mesa, llego al local o delivery)
- `/pago` ---> (Elegir método de pago)
- `/pago/:method` ---> (Pago con `card`, `yape`, `plin` o `transfer`; solo visual)
- `/pago/listo` ---> (Pedido confirmado)
- `/orders/:attentionId` ---> (Seguimiento del pedido)
- `/orders/:attentionId/cuenta` ---> (Cuenta de la mesa)
- `/perfil` ---> (Perfil del cliente)
- `/mis-visitas` ---> (Historial de visitas del cliente)

### Acceso del cliente

- `/acceso` ---> (Elegir tipo de cuenta: cliente o dueño de restaurante; `?modo=registro` para registrarse)
- `/customer/auth/login` ---> (Login del cliente)
- `/customer/auth/register` ---> (Registro del cliente)

---

## Restaurante (dueño y personal)

Base: `/owner`. Requiere login; cada ruta pide un permiso y el rol decide qué se ve.

### Acceso

- `/owner/auth/login` ---> (Login del dueño y del personal)
- `/owner/auth/register` ---> (Registro del dueño)

### General

- `/owner` ---> (Redirige a `/owner/dashboard`)
- `/owner/dashboard` ---> (Directorio de sedes)
- `/owner/finanzas` ---> (Finanzas de la cadena: ganancias por local, filtros día/mes/año)
- `/owner/finanzas/:restaurantId` ---> (Detalle de ingresos y gastos de un local)
- `/owner/cuenta` ---> (Perfil del dueño / empleado)
- `/owner/sin-acceso` ---> (Acceso denegado por permiso o sede)

### Sede

El nombre del local es el mismo slug de su carta pública, ej. `/owner/sede/bodega-san-telmo-grand-cru`.

- `/owner/sede/:nombre-del-local` ---> (Gestión de mesas)
- `/owner/sede/:nombre-del-local/pedidos` ---> (Gestión de pedidos: tablero por estados y lista)
- `/owner/sede/:nombre-del-local/pedidos/:attentionId` ---> (Detalle de un pedido)
- `/owner/sede/:nombre-del-local/cocina` ---> (Cola de cocina — deshabilitada por ahora, redirige a Gestión de pedidos)
- `/owner/sede/:nombre-del-local/menu` ---> (Gestión de la carta)
- `/owner/sede/:nombre-del-local/cuentas` ---> (Cuentas y cobros de mesas)
- `/owner/sede/:nombre-del-local/cuentas?vista=gastos` ---> (Gastos de la sede: insumos, sueldos, alquiler, servicios, etc.)
- `/owner/sede/:nombre-del-local/cuentas/:attentionId` ---> (Detalle de una cuenta)
- `/owner/sede/:nombre-del-local/insumos` ---> (Inventario de insumos: stock, entradas, salidas, mermas y conteos; `?vista=movimientos` para el historial)
- `/owner/sede/:nombre-del-local/metricas` ---> (Métricas de la sede)
- `/owner/sede/:nombre-del-local/cierre` ---> (Cierre del día)

### Administración

- `/owner/admin` ---> (Inicio de administración)
- `/owner/admin/empleados` ---> (Empleados)
- `/owner/admin/usuarios` ---> (Usuarios y accesos)
- `/owner/admin/roles` ---> (Roles y permisos)
- `/owner/admin/inventario` ---> (Inventario)
- `/owner/admin/restaurantes` ---> (Sedes / restaurantes)
- `/owner/admin/configuracion` ---> (Configuración de la organización)

---

## Otras

- `/para-restaurantes` ---> (Landing comercial para dueños)
- `/:pathMatch(.*)*` ---> (Página 404)

### Rutas antiguas (redirigen solas)

- `/ingresar` → `/customer/auth/login` (o `/register` con `?modo=registro`)
- `/menu` → carta de la sede actual
- `/auth/*` y `/restaurant-owner/auth/*` → `/owner/auth/*`
- `/dashboard`, `/finanzas/*`, `/admin/*`, `/cuenta`, `/sin-acceso` → mismas rutas bajo `/owner`
- `/sedes/:id/*` y `/owner/sedes/:id/*` → `/owner/sede/:nombre-del-local/*`
- `/owner/sede/:nombre-del-local/entregas` → Gestión de pedidos (la sección Entregas se eliminó)
