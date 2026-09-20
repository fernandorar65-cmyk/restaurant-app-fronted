export type KitchenTicketStatus = 'backlog' | 'cooking' | 'plating' | 'pass' | 'served'

export type KitchenTicketPriority = 'normal' | 'high' | 'urgent'

export interface KitchenChecklistItem {
  label: string
  done: boolean
}

export interface KitchenTicket {
  id: string
  restaurantId: string
  code: string
  tableNumber: string
  guests: number
  courseLabel: string
  title: string
  station: string
  location: string
  priority: KitchenTicketPriority
  status: KitchenTicketStatus
  chefName: string
  chefInitials: string
  waitLabel: string
  tags: string[]
  allergen: string | null
  notes: string | null
  progressPercent: number | null
  progressLabel: string | null
  pairing: string | null
  deliveredBy: string | null
  checklist: KitchenChecklistItem[]
}
