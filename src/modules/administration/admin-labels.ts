import type { StatusTone } from '@/components/base/StatusBadge.vue'
import type {
  EmployeeArea,
  EmployeeStatus,
  InventoryStatus,
  MembershipStatus,
} from '@/modules/administration/types'

/** Traducción de nombres de área conocidos; las áreas reales vienen del catálogo `/work-areas`. */
export const employeeAreaLabel: Record<EmployeeArea, string> = {
  kitchen: 'Cocina',
  floor: 'Sala',
  support: 'Soporte',
  management: 'Dirección',
}

export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  terminated: 'Cesado',
}

export const employeeStatusClass: Record<EmployeeStatus, string> = {
  active: 'bg-primary/10 text-primary',
  inactive: 'bg-tertiary-fixed text-on-tertiary-container',
  terminated: 'bg-surface-container-high text-on-surface-variant',
}

export const inventoryStatusLabel: Record<InventoryStatus, string> = {
  ok: 'Óptimo',
  low: 'Bajo',
  critical: 'Crítico',
}

export const inventoryStatusClass: Record<InventoryStatus, string> = {
  ok: 'bg-success-container text-on-success-container',
  low: 'bg-tertiary-fixed text-on-tertiary-container',
  critical: 'bg-error-container text-on-error-container',
}

export const inventoryStatusTone: Record<InventoryStatus, StatusTone> = {
  ok: 'success',
  low: 'warning',
  critical: 'danger',
}

export const employeeStatusTone: Record<EmployeeStatus, StatusTone> = {
  active: 'success',
  inactive: 'warning',
  terminated: 'muted',
}

export const membershipStatusLabel: Record<MembershipStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  invited: 'Invitado',
  suspended: 'Suspendido',
}

export const membershipStatusTone: Record<MembershipStatus, StatusTone> = {
  active: 'success',
  inactive: 'muted',
  invited: 'info',
  suspended: 'danger',
}
