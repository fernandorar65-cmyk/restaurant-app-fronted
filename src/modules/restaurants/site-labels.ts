import type {
  RestaurantOperationalStatus,
  StaffArea,
  StaffShiftStatus,
  TableFloorStatus,
  TableStatus,
} from '@/modules/restaurants/types'

export const floorStatusLabel: Record<TableFloorStatus, string> = {
  occupied: 'Ocupada',
  available: 'Libre',
  reserved: 'Reservada',
  cleaning: 'Limpieza',
}

export const staffAreaLabel: Record<StaffArea, string> = {
  kitchen: 'Cocina',
  floor: 'Sala',
  support: 'Soporte',
}

export const staffStatusLabel: Record<StaffShiftStatus, string> = {
  'on-shift': 'En turno',
  break: 'Descanso',
  absent: 'Ausente',
}

export const tableStatusLabel: Record<TableStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  maintenance: 'Mantenimiento',
}

export const restaurantStatusLabel: Record<RestaurantOperationalStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
}

export const CURRENCY_OPTIONS = ['EUR', 'PEN', 'USD', 'MXN', 'COP', 'CLP', 'ARS'] as const

export const TIMEZONE_OPTIONS = [
  'Europe/Madrid',
  'America/Lima',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/New_York',
] as const
