# Diseño de tablas

Detalle de columnas, tipos y restricciones del modelo descrito en [modelo-tablas.md](modelo-tablas.md).

Convenciones
- Motor de referencia: **PostgreSQL**.
- Llaves primarias: `uuid` con `gen_random_uuid()`.
- Nombres en `snake_case`, tablas en plural.
- Dinero: `numeric(10,2)`. Cantidades de insumos: `numeric(12,3)`.
- Fechas: `timestamptz` en UTC. La zona horaria de cada local está en `restaurants.timezone`.
- Columnas de auditoría (`created_at`, `updated_at`, `deleted_at`) cuando se indica **auditoría**:

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| created_at | timestamptz | no | now() |
| updated_at | timestamptz | no | now() |
| deleted_at | timestamptz | sí | — |

Leyenda de la columna **Restricción**: `PK` llave primaria · `FK →` llave foránea · `UQ` único · `IDX` índice · `CHK` check.

---

## Enums

| Enum | Valores |
|---|---|
| restaurant_status | `active`, `paused`, `closed` |
| fulfillment_type | `dine_in`, `pickup`, `delivery` |
| table_status | `free`, `occupied`, `reserved`, `cleaning`, `disabled` |
| employee_status | `active`, `on_leave`, `inactive` |
| menu_status | `draft`, `published`, `archived` |
| order_status | `open`, `in_progress`, `ready`, `delivered`, `paid`, `cancelled` |
| order_item_status | `pending`, `accepted`, `preparing`, `ready`, `served`, `rejected`, `cancelled` |
| payment_method | `cash`, `card`, `yape`, `plin`, `transfer` |
| payment_status | `pending`, `approved`, `rejected`, `refunded` |
| movement_type | `in`, `out`, `waste`, `adjust` |
| expense_kind | `fixed`, `variable` |
| discount_type | `percent`, `amount` |
| status_entity | `order`, `order_item`, `payment` |

---

## IAM

### users
Personal con acceso al sistema (dueños, admins, mozos, cocina). **Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| role_id | uuid | no | — | FK → roles.id | Rol único del usuario |
| name | varchar(120) | no | — | | Nombre completo |
| email | varchar(160) | no | — | UQ | Login |
| password_hash | varchar(255) | no | — | | Hash bcrypt / argon2 |
| phone | varchar(20) | sí | — | | |
| job_title | varchar(80) | sí | — | | Cargo visible |
| is_active | boolean | no | true | | Puede iniciar sesión |
| is_blocked | boolean | no | false | | Bloqueado por seguridad |
| last_login_at | timestamptz | sí | — | | |

Índices: `IDX(role_id)`.

### roles
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| organization_id | uuid | sí | — | FK → organizations.id | null = rol del sistema |
| code | varchar(40) | no | — | | `owner`, `admin`, `waiter`, `chef`… |
| name | varchar(80) | no | — | | |
| description | varchar(255) | sí | — | | |
| is_system | boolean | no | false | | No se puede borrar |
| created_at | timestamptz | no | now() | | |

Índices: `UQ(organization_id, code)`.

### permissions
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| code | varchar(80) | no | — | UQ | Ej. `orders.create`, `menu.update` |
| module | varchar(40) | no | — | | Agrupador para la UI |
| description | varchar(255) | sí | — | | |

### role_permissions
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| role_id | uuid | no | — | PK, FK → roles.id (cascade) | |
| permission_id | uuid | no | — | PK, FK → permissions.id (cascade) | |

### user_restaurants `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| user_id | uuid | no | — | PK, FK → users.id (cascade) | |
| restaurant_id | uuid | no | — | PK, FK → restaurants.id (cascade) | |
| created_at | timestamptz | no | now() | | |

### customers
Comensales que piden desde la app. **Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| name | varchar(120) | no | — | | |
| email | varchar(160) | no | — | UQ | |
| password_hash | varchar(255) | no | — | | |
| phone | varchar(20) | sí | — | | |
| birthday | date | sí | — | | Para promociones |
| dietary_preferences | text[] | no | '{}' | | `vegano`, `sin gluten`… |
| allergens | text[] | no | '{}' | | Alergias declaradas |
| marketing_opt_in | boolean | no | false | | |

### customer_addresses `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| customer_id | uuid | no | — | FK → customers.id (cascade) | |
| label | varchar(40) | no | — | | `Casa`, `Oficina` |
| address | varchar(255) | no | — | | |
| reference | varchar(255) | sí | — | | Referencia para el repartidor |
| lat | numeric(9,6) | sí | — | | |
| lng | numeric(9,6) | sí | — | | |
| is_default | boolean | no | false | | |
| created_at | timestamptz | no | now() | | |

Índices: `IDX(customer_id)`; único parcial `UQ(customer_id) WHERE is_default`.

---

## Organizations

### organizations
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| name | varchar(120) | no | — | | Razón comercial |
| code | varchar(20) | no | — | UQ | Código corto |
| tax_id | varchar(20) | sí | — | | RUC |
| owner_user_id | uuid | sí | — | FK → users.id | Dueño principal |

### restaurants
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| organization_id | uuid | no | — | FK → organizations.id | |
| code | varchar(20) | no | — | | Código interno del local |
| slug | varchar(80) | no | — | UQ | URL pública |
| name | varchar(120) | no | — | | |
| cuisine | varchar(60) | sí | — | | Tipo de cocina |
| description | text | sí | — | | |
| address | varchar(255) | no | — | | |
| city | varchar(80) | no | — | | |
| lat | numeric(9,6) | sí | — | | |
| lng | numeric(9,6) | sí | — | | |
| phone | varchar(20) | sí | — | | |
| image_url | varchar(500) | sí | — | | |
| fulfillment_modes | fulfillment_type[] | no | '{dine_in}' | | Modalidades que ofrece |
| currency | char(3) | no | 'PEN' | | ISO 4217 |
| timezone | varchar(40) | no | 'America/Lima' | | IANA |
| status | restaurant_status | no | 'active' | | |

Índices: `UQ(organization_id, code)`, `IDX(city)`.

### restaurant_areas `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id (cascade) | |
| name | varchar(60) | no | — | | `Salón`, `Terraza`, `Piso 2` |
| position | smallint | no | 0 | | Orden en pantalla |

Índices: `UQ(restaurant_id, name)`.

### dining_tables
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| area_id | uuid | sí | — | FK → restaurant_areas.id (set null) | |
| number | smallint | no | — | | Número visible de la mesa |
| capacity | smallint | no | 4 | CHK > 0 | Comensales |
| status | table_status | no | 'free' | | |

Índices: `UQ(restaurant_id, number)`.

### table_qr_codes
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| table_id | uuid | no | — | FK → dining_tables.id (cascade) | |
| token | varchar(64) | no | — | UQ | Va en la URL del QR |
| is_active | boolean | no | true | | |
| created_at | timestamptz | no | now() | | |
| revoked_at | timestamptz | sí | — | | |

Índices: único parcial `UQ(table_id) WHERE is_active` (un QR activo por mesa).

### employees
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| user_id | uuid | sí | — | UQ, FK → users.id (set null) | Si tiene acceso al sistema |
| role_id | uuid | no | — | FK → roles.id | |
| name | varchar(120) | no | — | | |
| email | varchar(160) | sí | — | | |
| phone | varchar(20) | sí | — | | |
| document_number | varchar(20) | sí | — | | DNI / CE |
| area | varchar(40) | sí | — | | `cocina`, `salón`, `barra`, `caja` |
| status | employee_status | no | 'active' | | |
| hired_at | date | sí | — | | |

Índices: `IDX(restaurant_id)`.

### menus
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| name | varchar(80) | no | — | | `Carta principal`, `Almuerzo` |
| status | menu_status | no | 'draft' | | |

Índices: `IDX(restaurant_id)`.

### categories
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| menu_id | uuid | no | — | FK → menus.id (cascade) | |
| name | varchar(80) | no | — | | `Entradas`, `Bebidas` |
| description | varchar(255) | sí | — | | |
| position | smallint | no | 0 | | |
| created_at | timestamptz | no | now() | | |

Índices: `UQ(menu_id, name)`.

### products
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | Redundante con la categoría, acelera filtros |
| category_id | uuid | no | — | FK → categories.id | |
| name | varchar(120) | no | — | | |
| description | varchar(255) | sí | — | | Texto corto en la carta |
| long_description | text | sí | — | | Detalle del plato |
| price | numeric(10,2) | no | — | CHK >= 0 | |
| prep_minutes | smallint | sí | — | | Tiempo estimado |
| portion | varchar(60) | sí | — | | `Personal`, `Para 2` |
| presentation | varchar(120) | sí | — | | |
| image_url | varchar(500) | sí | — | | |
| tags | text[] | no | '{}' | | `picante`, `recomendado` |
| is_available | boolean | no | true | | Agotado temporalmente |
| is_active | boolean | no | true | | Visible en la carta |
| position | smallint | no | 0 | | |

Índices: `IDX(restaurant_id)`, `IDX(category_id)`; para búsqueda, `GIN(to_tsvector('spanish', name || ' ' || coalesce(description, '')))`.

### allergens `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| name | varchar(60) | no | — | UQ | `Gluten`, `Mariscos`… |

### product_allergens `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| product_id | uuid | no | — | PK, FK → products.id (cascade) | |
| allergen_id | uuid | no | — | PK, FK → allergens.id (cascade) | |

---

## Inventory

### suppliers `[F2]`
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| organization_id | uuid | no | — | FK → organizations.id | |
| name | varchar(120) | no | — | | |
| tax_id | varchar(20) | sí | — | | RUC |
| contact_name | varchar(120) | sí | — | | |
| phone | varchar(20) | sí | — | | |
| email | varchar(160) | sí | — | | |

Índices: `UQ(organization_id, name)`.

### kitchen_supplies
Insumos de cocina por local. **Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| supplier_id | uuid | sí | — | FK → suppliers.id (set null) | |
| name | varchar(120) | no | — | | |
| category | varchar(60) | sí | — | | `Carnes`, `Verduras`, `Abarrotes` |
| unit | varchar(10) | no | — | | `kg`, `l`, `und` |
| stock | numeric(12,3) | no | 0 | | Lo mantiene `inventory_movements` |
| min_stock | numeric(12,3) | no | 0 | | Alerta de reposición |
| unit_cost | numeric(10,2) | no | 0 | | Último costo |
| is_active | boolean | no | true | | |

Índices: `UQ(restaurant_id, name)`.

### inventory_movements
Solo inserción: no se edita ni se borra.

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| supply_id | uuid | no | — | FK → kitchen_supplies.id | |
| type | movement_type | no | — | | |
| delta | numeric(12,3) | no | — | CHK <> 0 | Positivo entra, negativo sale |
| stock_after | numeric(12,3) | no | — | | Stock resultante |
| unit_cost | numeric(10,2) | sí | — | | Costo en compras |
| reason | varchar(255) | sí | — | | |
| order_item_id | uuid | sí | — | FK → order_items.id | Salida por venta (con recetas) |
| expense_id | uuid | sí | — | FK → expenses.id | Compra registrada como gasto |
| created_by | uuid | no | — | FK → users.id | |
| created_at | timestamptz | no | now() | | |

Índices: `IDX(supply_id, created_at)`, `IDX(restaurant_id, created_at)`.

### product_recipes `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| product_id | uuid | no | — | PK, FK → products.id (cascade) | |
| supply_id | uuid | no | — | PK, FK → kitchen_supplies.id | |
| quantity | numeric(12,3) | no | — | CHK > 0 | En la unidad del insumo |

---

## Attention

### orders
La cuenta: sesión de una mesa o pedido de delivery o recojo. **Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| code | varchar(20) | no | — | | Número correlativo visible |
| fulfillment_type | fulfillment_type | no | 'dine_in' | | |
| table_id | uuid | sí | — | FK → dining_tables.id | Obligatorio en `dine_in` |
| customer_id | uuid | sí | — | FK → customers.id | |
| address_id | uuid | sí | — | FK → customer_addresses.id | Obligatorio en `delivery` |
| guest_name | varchar(120) | sí | — | | Comensal sin cuenta |
| guests_count | smallint | sí | — | | |
| status | order_status | no | 'open' | | |
| subtotal | numeric(10,2) | no | 0 | | Suma de ítems no anulados |
| discount_total | numeric(10,2) | no | 0 | | |
| total | numeric(10,2) | no | 0 | | subtotal − descuentos |
| opened_by | uuid | sí | — | FK → users.id | Mozo que abrió la mesa |
| opened_at | timestamptz | no | now() | | |
| closed_at | timestamptz | sí | — | | |
| cancellation_reason | varchar(255) | sí | — | | |

Restricciones:
- `UQ(restaurant_id, code)`.
- `CHK(fulfillment_type <> 'dine_in' OR table_id IS NOT NULL)`.
- `CHK(fulfillment_type <> 'delivery' OR address_id IS NOT NULL)`.
- Único parcial `UQ(table_id) WHERE status NOT IN ('paid','cancelled')`: una sola cuenta abierta por mesa.

Índices: `IDX(restaurant_id, status)`, `IDX(customer_id)`.

### order_batches
Cada ronda o comanda enviada a cocina.

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| order_id | uuid | no | — | FK → orders.id (cascade) | |
| number | smallint | no | — | | Ronda 1, 2, 3… |
| created_by_user_id | uuid | sí | — | FK → users.id | Si lo pidió un mozo |
| created_by_customer_id | uuid | sí | — | FK → customers.id | Si lo pidió el comensal |
| sent_at | timestamptz | no | now() | | |

Restricciones: `UQ(order_id, number)`.

### order_items
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| order_id | uuid | no | — | FK → orders.id (cascade) | |
| batch_id | uuid | no | — | FK → order_batches.id | |
| product_id | uuid | no | — | FK → products.id | |
| product_name | varchar(120) | no | — | | Copia al momento del pedido |
| unit_price | numeric(10,2) | no | — | CHK >= 0 | Copia al momento del pedido |
| quantity | smallint | no | 1 | CHK > 0 | |
| subtotal | numeric(10,2) | no | — | | unit_price × quantity |
| notes | varchar(255) | sí | — | | `Sin cebolla` |
| status | order_item_status | no | 'pending' | | |
| rejection_reason | varchar(255) | sí | — | | Si cocina lo rechaza |
| customer_id | uuid | sí | — | FK → customers.id | Quién lo pidió (cuentas divididas) |
| requested_at | timestamptz | no | now() | | |
| updated_at | timestamptz | no | now() | | |

Índices: `IDX(order_id)`, `IDX(status)` para la pantalla de cocina.

### status_history
Solo inserción.

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| entity_type | status_entity | no | — | | |
| entity_id | uuid | no | — | | Id de la cuenta, ítem o pago |
| from_status | varchar(30) | sí | — | | null en la creación |
| to_status | varchar(30) | no | — | | |
| reason | varchar(255) | sí | — | | |
| changed_by | uuid | sí | — | FK → users.id | null si fue el comensal o el sistema |
| changed_at | timestamptz | no | now() | | |

Índices: `IDX(entity_type, entity_id, changed_at)`.

---

## Billing

### payments
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| order_id | uuid | no | — | FK → orders.id | |
| amount | numeric(10,2) | no | — | CHK > 0 | Monto aplicado a la cuenta |
| tip_amount | numeric(10,2) | no | 0 | CHK >= 0 | Propina |
| method | payment_method | no | — | | |
| status | payment_status | no | 'pending' | | |
| payer_name | varchar(120) | sí | — | | |
| customer_id | uuid | sí | — | FK → customers.id | |
| external_reference | varchar(120) | sí | — | | N° de operación / voucher |
| processed_by | uuid | sí | — | FK → users.id | Cajero o mozo |

Índices: `IDX(order_id)`, `IDX(created_at)`.

### payment_allocations
Qué ítems cubre cada pago (cuenta dividida).

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| payment_id | uuid | no | — | PK, FK → payments.id (cascade) | |
| order_item_id | uuid | no | — | PK, FK → order_items.id | |
| amount | numeric(10,2) | no | — | CHK > 0 | Parte del ítem cubierta |

### discounts `[F2]`
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| order_id | uuid | no | — | FK → orders.id (cascade) | |
| order_item_id | uuid | sí | — | FK → order_items.id | null = descuento a toda la cuenta |
| type | discount_type | no | — | | |
| value | numeric(10,2) | no | — | CHK > 0 | % o monto |
| amount | numeric(10,2) | no | — | | Monto final descontado |
| reason | varchar(255) | no | — | | `Cortesía`, `Promo 2x1` |
| applied_by | uuid | no | — | FK → users.id | |
| created_at | timestamptz | no | now() | | |

---

## Finance

### expense_categories
| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| name | varchar(60) | no | — | UQ | `Insumos`, `Servicios`, `Planilla` |
| hint | varchar(255) | sí | — | | Ayuda en el formulario |
| default_kind | expense_kind | no | 'variable' | | |
| icon | varchar(40) | sí | — | | |

### expenses
**Auditoría.**

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| category_id | uuid | no | — | FK → expense_categories.id | |
| kind | expense_kind | no | — | | |
| description | varchar(255) | no | — | | |
| amount | numeric(10,2) | no | — | CHK > 0 | |
| date | date | no | — | | Fecha del gasto |
| supplier_id | uuid | sí | — | FK → suppliers.id | |
| payment_method | payment_method | sí | — | | |
| notes | text | sí | — | | |
| created_by | uuid | no | — | FK → users.id | |

Índices: `IDX(restaurant_id, date)`.

### daily_closures
Cierre de caja por día y local.

| Columna | Tipo | Nulo | Default | Restricción | Descripción |
|---|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK | |
| restaurant_id | uuid | no | — | FK → restaurants.id | |
| date | date | no | — | | Día operativo |
| opening_cash | numeric(10,2) | no | 0 | | Fondo inicial |
| sales_total | numeric(10,2) | no | — | | Suma de pagos aprobados |
| sales_by_method | jsonb | no | '{}' | | `{ "cash": 0, "card": 0, … }` |
| expenses_total | numeric(10,2) | no | 0 | | |
| expected_cash | numeric(10,2) | no | — | | opening + cash − gastos en efectivo |
| counted_cash | numeric(10,2) | no | — | | Lo contado en caja |
| difference | numeric(10,2) | no | — | | counted − expected |
| notes | text | sí | — | | |
| closed_by | uuid | no | — | FK → users.id | |
| closed_at | timestamptz | no | now() | | |

Restricciones: `UQ(restaurant_id, date)`.

### Vista `daily_financials`
No es una tabla. Es una vista (o vista materializada) calculada por `restaurant_id` y fecha:

| Columna | Origen |
|---|---|
| revenue | Σ `payments.amount` aprobados |
| orders | conteo de `orders` pagadas |
| guests | Σ `orders.guests_count` |
| food_cost | Σ `inventory_movements` de salida × `unit_cost` |
| operating_cost | Σ `expenses.amount` |
| profit | revenue − food_cost − operating_cost |
| by_method | Σ `payments.amount` agrupado por `method` |

---

## Reglas de integridad que van en el backend

- Al crear un `order_item`, copiar `name` y `price` del producto y calcular `subtotal`.
- Recalcular `orders.subtotal` y `orders.total` cuando cambia un ítem o un descuento.
- Una cuenta pasa a `paid` cuando la suma de los `payments` aprobados es mayor o igual a `orders.total`.
- Cada cambio de estado de una cuenta, un ítem o un pago inserta una fila en `status_history`.
- Todo cambio de `kitchen_supplies.stock` se hace insertando en `inventory_movements`, en la misma transacción.
- Filtrar siempre por `restaurant_id` según los locales a los que el usuario tiene acceso.
