export type Permission =
  | 'org.manage'
  | 'users.manage'
  | 'staff.manage'
  | 'sites.manage'
  | 'orders.manage'
  | 'kitchen.manage'
  | 'delivery.manage'
  | 'menu.manage'
  | 'payments.manage'
  | 'inventory.manage'
  | 'reports.view'

export const PERMISSIONS: readonly Permission[] = [
  'org.manage',
  'users.manage',
  'staff.manage',
  'sites.manage',
  'orders.manage',
  'kitchen.manage',
  'delivery.manage',
  'menu.manage',
  'payments.manage',
  'inventory.manage',
  'reports.view',
]

export const permissionLabel: Record<Permission, string> = {
  'org.manage': 'Organización y sedes',
  'users.manage': 'Usuarios y roles',
  'staff.manage': 'Empleados',
  'sites.manage': 'Sala, mesas y QR',
  'orders.manage': 'Pedidos entrantes y pedido manual',
  'kitchen.manage': 'Cola de cocina',
  'delivery.manage': 'Entregas en mesa',
  'menu.manage': 'Menú y productos',
  'payments.manage': 'Cuentas y cobros',
  'inventory.manage': 'Inventario',
  'reports.view': 'Métricas y cierre del día',
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}

export const ADMIN_PERMISSIONS: readonly Permission[] = [
  'org.manage',
  'users.manage',
  'staff.manage',
  'inventory.manage',
]

/** Permisos que habilitan al menos una vista dentro de una sede. */
export const SITE_PERMISSIONS: readonly Permission[] = [
  'sites.manage',
  'orders.manage',
  'kitchen.manage',
  'delivery.manage',
  'menu.manage',
  'payments.manage',
  'reports.view',
]
