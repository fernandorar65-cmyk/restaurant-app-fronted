import type { StaffArea, StaffShiftStatus, TableFloorStatus } from '@/modules/restaurants/types'

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
