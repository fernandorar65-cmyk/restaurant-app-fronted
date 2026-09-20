import { http } from '@/services/http'
import type {
  KitchenChecklistItem,
  KitchenTicket,
  KitchenTicketPriority,
  KitchenTicketStatus,
} from '@/modules/orders/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const STATUSES: readonly KitchenTicketStatus[] = ['backlog', 'cooking', 'plating', 'pass', 'served']
const PRIORITIES: readonly KitchenTicketPriority[] = ['normal', 'high', 'urgent']

function isKitchenTicketStatus(value: unknown): value is KitchenTicketStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

function isKitchenTicketPriority(value: unknown): value is KitchenTicketPriority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

function isChecklistItem(value: unknown): value is KitchenChecklistItem {
  return isRecord(value) && typeof value.label === 'string' && typeof value.done === 'boolean'
}

function isKitchenTicket(value: unknown): value is KitchenTicket {
  if (!isRecord(value)) {
    return false
  }

  const allergen = value.allergen
  const notes = value.notes
  const progressPercent = value.progressPercent
  const progressLabel = value.progressLabel
  const pairing = value.pairing
  const deliveredBy = value.deliveredBy

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.code === 'string' &&
    typeof value.tableNumber === 'string' &&
    typeof value.guests === 'number' &&
    typeof value.courseLabel === 'string' &&
    typeof value.title === 'string' &&
    typeof value.station === 'string' &&
    typeof value.location === 'string' &&
    isKitchenTicketPriority(value.priority) &&
    isKitchenTicketStatus(value.status) &&
    typeof value.chefName === 'string' &&
    typeof value.chefInitials === 'string' &&
    typeof value.waitLabel === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    (allergen === null || typeof allergen === 'string') &&
    (notes === null || typeof notes === 'string') &&
    (progressPercent === null || typeof progressPercent === 'number') &&
    (progressLabel === null || typeof progressLabel === 'string') &&
    (pairing === null || typeof pairing === 'string') &&
    (deliveredBy === null || typeof deliveredBy === 'string') &&
    Array.isArray(value.checklist) &&
    value.checklist.every(isChecklistItem)
  )
}

function toKitchenTicket(value: KitchenTicket): KitchenTicket {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
  }
}

export async function fetchKitchenTickets(restaurantId: string): Promise<KitchenTicket[]> {
  const payload = await http<unknown>('/kitchenTickets')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isKitchenTicket)
    .map(toKitchenTicket)
    .filter((ticket) => ticket.restaurantId === restaurantId)
}
