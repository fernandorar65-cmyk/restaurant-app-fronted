import type {
  RestaurantOperationalStatus,
  TableFloorStatus,
  TableServiceStatus,
  TableStatus,
} from '@/modules/restaurants/types'

export const floorStatusLabel: Record<TableFloorStatus, string> = {
  occupied: 'Ocupada',
  available: 'Libre',
  reserved: 'Reservada',
  cleaning: 'Limpieza',
}

export const tableServiceStatusLabel: Record<TableServiceStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  cleaning: 'En limpieza',
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

export const CURRENCY_OPTIONS = ['PEN', 'USD', 'EUR', 'MXN', 'COP', 'CLP', 'ARS'] as const

export const TIMEZONE_OPTIONS = [
  'America/Lima',
  'Europe/Madrid',
  'America/Bogota',
  'America/Mexico_City',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/New_York',
] as const
