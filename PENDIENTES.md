# Pendientes

## 1. Cuentas de empleados y accesos por rol

- [ ] El dueño crea las cuentas de sus empleados (el empleado no se registra solo).
- [ ] Al crear la cuenta, el dueño asigna rol (mesero, jefe de cocina, cajero…) y sedes.
- [ ] El rol define a qué rutas y acciones puede acceder cada empleado.
- [ ] El dueño puede modificar los accesos del empleado: rol, sedes, permisos, desactivar o bloquear.
- [ ] Los accesos se validan y se guardan en el backend, no solo en el navegador.
- [ ] El registro público queda solo para dueños y crea su organización y su primera sede.
- [ ] Cada dueño solo ve y gestiona los empleados, usuarios y sedes de su organización.
- [ ] Contraseña temporal y cambio obligatorio en el primer ingreso del empleado.
- [ ] Contraseñas guardadas con hash (hoy están en texto plano en `db.json`).

## Otros pendientes

- [ ] Integrar los métodos de pago (hoy las vistas son solo visuales).
- [ ] Registrar los pedidos de recojo y delivery para que el personal los vea.
- [ ] Configurar desde administración las modalidades de cada sede (en mesa, recojo, delivery).
- [ ] Marcar los platos que no se ofrecen para llevar o delivery.
- [ ] Calcular las finanzas desde las ventas y costos reales (hoy usan datos de demostración en `dailyFinancials`).
- [ ] Usar los gastos registrados en Cuentas → Gastos (`expenses`) en el cálculo de Finanzas.
- [ ] Restringir la pestaña Gastos con un permiso propio (hoy usa el de cobros).
- [ ] Recetas: vincular cada plato con sus insumos para descontar stock al vender y calcular el costo por plato.
- [ ] Unificar el inventario de Administración con Insumos (hoy son dos vistas sobre los mismos datos).
