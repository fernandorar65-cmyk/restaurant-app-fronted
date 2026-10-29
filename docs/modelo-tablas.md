# Modelo de tablas

Propuesta de modelo relacional para el backend (NestJS), alineada con lo que el frontend ya usa en `db.json`.

Leyenda:
- `[F1]` primera fase, el front ya depende de ella
- `[F2]` segunda fase, se puede postergar
- `(PK)` llave primaria · `(FK)` llave foránea · `?` campo opcional / nullable

---

## IAM

```
IAM
├── users              [F1]
├── roles              [F1]
├── permissions        [F1]
├── role_permissions   [F1]
├── user_restaurants   [F2]
├── customers          [F1]
└── customer_addresses [F2]
```

Relaciones
- `roles` → `users` es **1 a muchos**: un usuario tiene un solo rol, pero un rol lo comparten muchos usuarios. La FK `role_id` va en `users`.
- `roles` ↔ `permissions` es **muchos a muchos** mediante `role_permissions`.
- `organizations` → `roles` es **1 a muchos**: cada organización puede crear sus propios roles. `organization_id?` va en null para los roles del sistema (admin, dueño).
- `users` ↔ `restaurants` es **muchos a muchos** mediante `user_restaurants`. Solo hace falta si un dueño o admin ve varios locales sin ser empleado; si no, el acceso sale de `employees`.
- `customers` es una tabla **separada de `users`**: el comensal no tiene rol ni permisos de staff.
- `customers` → `customer_addresses` es **1 a muchos** (solo para delivery).

Campos clave
| Tabla | Campos |
|---|---|
| users | id (PK), role_id (FK), name, email, password_hash, phone, job_title, is_active, is_blocked, created_at |
| roles | id (PK), organization_id? (FK), name, description |
| permissions | id (PK), code, description |
| role_permissions | role_id (FK), permission_id (FK) |
| user_restaurants | user_id (FK), restaurant_id (FK) |
| customers | id (PK), name, email, password_hash, phone, birthday?, dietary_preferences?, allergens?, marketing_opt_in, created_at |
| customer_addresses | id (PK), customer_id (FK), label, address, reference?, lat?, lng?, is_default |

---

## Organizations

```
Organizations
├── organizations      [F1]
├── restaurants        [F1]
├── restaurant_areas   [F2]
├── dining_tables      [F1]
├── table_qr_codes     [F1]
├── employees          [F1]
├── menus              [F1]
├── categories         [F1]
├── products           [F1]
├── allergens          [F2]
└── product_allergens  [F2]
```

Relaciones
- `organizations` → `restaurants` es **1 a muchos**. La dirección, la ciudad y las coordenadas viven en `restaurants` (ya no existe `restaurant_locations`).
- `restaurants` → `restaurant_areas` es **1 a muchos** (salón, terraza, barra, pisos).
- `restaurants` → `dining_tables` es **1 a muchos**. `area_id?` en la mesa es opcional.
- `dining_tables` → `table_qr_codes` es **1 a muchos**, con un solo QR `is_active` a la vez. Así se puede rotar un QR filtrado sin perder el historial.
- `restaurants` → `employees` es **1 a muchos**. `employees.user_id?` enlaza con el login cuando el empleado tiene acceso al sistema.
- `restaurants` → `menus` es **1 a muchos**.
- `menus` → `categories` es **1 a muchos**. Las categorías son solo del menú y se ordenan con `position`. El tipo de cocina del restaurante es una columna de `restaurants`, no una categoría.
- `categories` → `products` es **1 a muchos**: cada producto pertenece a **una sola** categoría y a **un solo** restaurante.
- `products` ↔ `allergens` es **muchos a muchos** mediante `product_allergens`.

> Regla de negocio: al no existir `category_products` ni `location_products`, un mismo plato no se comparte entre locales. Si en el futuro una cadena quiere el mismo producto con precios distintos por local, hay que reintroducir una tabla pivote.

Campos clave
| Tabla | Campos |
|---|---|
| organizations | id (PK), name, code, created_at |
| restaurants | id (PK), organization_id (FK), code, slug, name, cuisine, address, city, lat, lng, image_url, fulfillment_modes, currency, timezone, status |
| restaurant_areas | id (PK), restaurant_id (FK), name, position |
| dining_tables | id (PK), restaurant_id (FK), area_id? (FK), number, capacity, status |
| table_qr_codes | id (PK), table_id (FK), token, is_active, created_at, revoked_at? |
| employees | id (PK), restaurant_id (FK), user_id? (FK), role_id (FK), name, email, phone, area, status, hired_at |
| menus | id (PK), restaurant_id (FK), name, status |
| categories | id (PK), menu_id (FK), name, description?, position |
| products | id (PK), restaurant_id (FK), category_id (FK), name, description, long_description?, price, prep_minutes, portion?, image_url?, is_available, is_active, position |
| allergens | id (PK), name |
| product_allergens | product_id (FK), allergen_id (FK) |

---

## Inventory

```
Inventory
├── kitchen_supplies     [F1]
├── suppliers            [F2]
├── inventory_movements  [F1]
└── product_recipes      [F2]
```

Relaciones
- `restaurants` → `kitchen_supplies` es **1 a muchos**: los insumos de cocina de cada local.
- `suppliers` → `kitchen_supplies` es **1 a muchos** (hoy el proveedor es un texto libre).
- `kitchen_supplies` → `inventory_movements` es **1 a muchos**: entradas, salidas, mermas y ajustes. El stock actual de un insumo es el resultado de sus movimientos.
- `products` ↔ `kitchen_supplies` es **muchos a muchos** mediante `product_recipes` (con la cantidad usada). Permite descontar stock al vender un plato y calcular el *food cost* real.

Campos clave
| Tabla | Campos |
|---|---|
| kitchen_supplies | id (PK), restaurant_id (FK), supplier_id? (FK), name, category, unit, stock, min_stock, unit_cost, is_active, updated_at |
| suppliers | id (PK), organization_id (FK), name, phone?, email? |
| inventory_movements | id (PK), supply_id (FK), type (in / out / waste / adjust), delta, stock_after, unit_cost, reason?, expense_id? (FK), created_by (FK), created_at |
| product_recipes | product_id (FK), supply_id (FK), quantity |

---

## Attention

```
Attention
├── orders          [F1]
├── order_batches   [F1]
├── order_items     [F1]
└── status_history  [F1]
```

Relaciones
- `orders` es **la cuenta**, es decir, la sesión de una mesa o un pedido de delivery o recojo. Cubre lo que el front llama `attentions`.
- `restaurants` → `orders` es **1 a muchos**. `dining_tables` → `orders` es **1 a muchos** (`table_id?` va en null en delivery y recojo).
- `customers` → `orders` es **1 a muchos** (opcional).
- `orders` → `order_batches` es **1 a muchos**: cada ronda o comanda que se envía a cocina.
- `order_batches` → `order_items` es **1 a muchos**.
- `products` → `order_items` es **1 a muchos**: muchos ítems apuntan al mismo producto.
- `order_items` guarda una **copia del nombre y el precio** del producto. Si mañana cambia el precio, las cuentas viejas no cambian.
- `status_history` es **polimórfica** (`entity_type` + `entity_id`): registra los cambios de estado tanto de la cuenta como de cada plato.

Campos clave
| Tabla | Campos |
|---|---|
| orders | id (PK), restaurant_id (FK), table_id? (FK), customer_id? (FK), fulfillment_type (dine_in / pickup / delivery), address_id? (FK), guest_name?, status, opened_at, closed_at?, cancellation_reason? |
| order_batches | id (PK), order_id (FK), created_by (FK), sent_at |
| order_items | id (PK), order_id (FK), batch_id (FK), product_id (FK), product_name, unit_price, quantity, subtotal, notes?, status, rejection_reason?, customer_id? (FK), requested_at |
| status_history | id (PK), entity_type (order / order_item / payment), entity_id, from_status, to_status, reason?, changed_by (FK), changed_at |

---

## Billing

```
Billing
├── payments             [F1]
├── payment_allocations  [F1]
└── discounts            [F2]
```

Relaciones
- `orders` → `payments` es **1 a muchos**: una cuenta se puede pagar en partes y con varios métodos.
- `payments` ↔ `order_items` es **muchos a muchos** mediante `payment_allocations`: indica qué ítems y qué monto cubre cada pago (para dividir la cuenta).
- `orders` → `discounts` es **1 a muchos** (promociones, cortesías).

Campos clave
| Tabla | Campos |
|---|---|
| payments | id (PK), order_id (FK), amount, tip_amount, method (cash / card / yape / plin / transfer), status, payer_name?, external_reference?, processed_by (FK), created_at |
| payment_allocations | payment_id (FK), order_item_id (FK), amount |
| discounts | id (PK), order_id (FK), type (percent / amount), value, reason, applied_by (FK) |

---

## Finance

```
Finance
├── expense_categories  [F1]
├── expenses            [F1]
└── daily_closures      [F1]
```

Relaciones
- `expense_categories` → `expenses` es **1 a muchos**.
- `restaurants` → `expenses` es **1 a muchos**. Una compra de insumos puede generar movimientos en `inventory_movements.expense_id`.
- `restaurants` → `daily_closures` es **1 a muchos**: un cierre de caja por día y por local.
- Los indicadores diarios (`dailyFinancials` en el front) **no son una tabla**: son una vista o consulta calculada a partir de pedidos, pagos y gastos.

Campos clave
| Tabla | Campos |
|---|---|
| expense_categories | id (PK), name, hint?, default_kind, icon? |
| expenses | id (PK), restaurant_id (FK), category_id (FK), kind, description, amount, date, supplier_id? (FK), payment_method, notes?, created_by (FK), created_at |
| daily_closures | id (PK), restaurant_id (FK), date, opening_cash, expected_cash, counted_cash, difference, closed_by (FK), closed_at |

---

## Reglas transversales

- **Multi-tenant**: toda tabla operativa lleva `restaurant_id` (o `organization_id`) para filtrar y proteger los datos en el backend.
- **Auditoría**: `created_at`, `updated_at`, `created_by` y `deleted_at` (soft delete) en productos, empleados, pedidos y pagos.
- **Dinero**: siempre `DECIMAL(10,2)`, nunca float. La moneda y la zona horaria salen de `restaurants`.
- **Estados**: los estados de mesa, cuenta, ítem y pago se definen como enums.

---

## Resumen

```
IAM            users, roles, permissions, role_permissions, user_restaurants, customers, customer_addresses
Organizations  organizations, restaurants, restaurant_areas, dining_tables, table_qr_codes,
               employees, menus, categories, products, allergens, product_allergens
Inventory      kitchen_supplies, suppliers, inventory_movements, product_recipes
Attention      orders, order_batches, order_items, status_history
Billing        payments, payment_allocations, discounts
Finance        expense_categories, expenses, daily_closures
```
