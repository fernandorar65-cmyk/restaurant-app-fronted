import type { EmployeeArea, EmployeeStatus, InventoryStatus } from '@/modules/administration/types'

export const employeeAreaLabel: Record<EmployeeArea, string> = {
  kitchen: 'Cocina',
  floor: 'Sala',
  support: 'Soporte',
  management: 'Dirección',
}

export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  active: 'Activo',
  'on-leave': 'Excedencia',
  inactive: 'Inactivo',
}

export const employeeStatusClass: Record<EmployeeStatus, string> = {
  active: 'bg-primary/10 text-primary',
  'on-leave': 'bg-tertiary-fixed text-on-tertiary-container',
  inactive: 'bg-surface-container-high text-on-surface-variant',
}

export const inventoryStatusLabel: Record<InventoryStatus, string> = {
  ok: 'Óptimo',
  low: 'Bajo',
  critical: 'Crítico',
}

export const inventoryStatusClass: Record<InventoryStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  low: 'bg-tertiary-fixed text-on-tertiary-container',
  critical: 'bg-error-container text-on-error-container',
}
