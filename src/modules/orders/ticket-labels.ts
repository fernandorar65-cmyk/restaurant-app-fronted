import type { KitchenTicketPriority, KitchenTicketStatus } from '@/modules/orders/types'

export const ticketStatusLabel: Record<KitchenTicketStatus, string> = {
  backlog: 'Entrantes',
  cooking: 'En fuego',
  plating: 'Emplatado',
  pass: 'Pasaplatos',
  served: 'Servido',
}

export const ticketPriorityLabel: Record<KitchenTicketPriority, string> = {
  normal: 'Prioridad normal',
  high: 'Prioridad alta',
  urgent: 'Urgente',
}

export const boardColumns: KitchenTicketStatus[] = ['backlog', 'cooking', 'plating', 'pass', 'served']

export const columnDotClass: Record<KitchenTicketStatus, string> = {
  backlog: 'bg-secondary',
  cooking: 'bg-primary-container animate-pulse',
  plating: 'bg-tertiary',
  pass: 'bg-emerald-600',
  served: 'bg-outline',
}

export const columnWipLimit: Record<KitchenTicketStatus, number | null> = {
  backlog: 8,
  cooking: 8,
  plating: 6,
  pass: null,
  served: null,
}

export const columnHint: Record<KitchenTicketStatus, string> = {
  backlog: 'Pendiente de marcha',
  cooking: 'Activo',
  plating: 'Límite',
  pass: 'Recogida sala',
  served: 'Últimos pases en mesa:',
}

export const columnHintClass: Record<KitchenTicketStatus, string> = {
  backlog: 'text-on-surface-variant',
  cooking: 'font-bold text-primary',
  plating: 'rounded-full bg-error-container px-2 py-0.5 font-bold text-error',
  pass: 'text-secondary',
  served: 'tracking-widest text-on-surface-variant/80',
}

export const columnCountClass: Record<KitchenTicketStatus, string> = {
  backlog: 'bg-surface-container text-on-surface-variant',
  cooking: 'bg-primary-container text-on-primary',
  plating: 'bg-amber-100 text-amber-900',
  pass: 'bg-emerald-100 text-emerald-800',
  served: 'bg-surface-container-high text-on-surface-variant',
}

export const columnShellClass: Record<KitchenTicketStatus, string> = {
  backlog: 'min-w-0 bg-surface-container-low',
  cooking: 'min-w-0 bg-surface-container-low',
  plating: 'min-w-0 bg-surface-container-low',
  pass: 'min-w-0 bg-surface-container-low',
  served: 'min-w-0 bg-surface-container',
}
