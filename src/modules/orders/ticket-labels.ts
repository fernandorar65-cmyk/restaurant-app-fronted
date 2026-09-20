import type { KitchenTicketPriority, KitchenTicketStatus } from '@/modules/orders/types'

export const ticketStatusLabel: Record<KitchenTicketStatus, string> = {
  backlog: 'Entrantes / Backlog',
  cooking: 'En fuego / Marchando',
  plating: 'Emplatado y QA',
  pass: 'Listo en pasaplatos',
  served: 'Servido',
}

export const ticketPriorityLabel: Record<KitchenTicketPriority, string> = {
  normal: 'Prioridad normal',
  high: 'Prioridad alta',
  urgent: 'Urgente',
}

export const boardColumns: KitchenTicketStatus[] = ['backlog', 'cooking', 'plating', 'pass', 'served']
