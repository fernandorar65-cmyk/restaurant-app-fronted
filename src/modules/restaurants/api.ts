import { http, HttpError } from '@/services/http'
import type {
  LiveTable,
  Organization,
  RestaurantSite,
  SiteOperation,
  SiteStaffMember,
  StaffArea,
  StaffShiftStatus,
  TableFloorStatus,
  TableTagTone,
} from '@/modules/restaurants/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOrganization(value: unknown): value is Organization {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.code === 'string'
  )
}

function isRestaurantSite(value: unknown): value is RestaurantSite {
  if (!isRecord(value) || !isRecord(value.kpis)) {
    return false
  }

  const category = value.category
  const badgeTone = value.badgeTone
  const occupancyPercent = value.kpis.occupancyPercent

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    typeof value.city === 'string' &&
    typeof value.address === 'string' &&
    typeof value.imageUrl === 'string' &&
    (category === 'fine-dining' || category === 'bistro' || category === 'lab') &&
    typeof value.categoryLabel === 'string' &&
    typeof value.cuisine === 'string' &&
    typeof value.statusLabel === 'string' &&
    typeof value.badgeLabel === 'string' &&
    (badgeTone === 'amber' || badgeTone === 'emerald' || badgeTone === 'wine' || badgeTone === 'blue') &&
    typeof value.capacityLabel === 'string' &&
    typeof value.roleLabel === 'string' &&
    typeof value.kpis.revenueLabel === 'string' &&
    typeof value.kpis.revenueHint === 'string' &&
    typeof value.kpis.marginLabel === 'string' &&
    typeof value.kpis.stockLabel === 'string' &&
    typeof value.kpis.stockHint === 'string' &&
    typeof value.kpis.stockNote === 'string' &&
    typeof value.kpis.occupancyLabel === 'string' &&
    typeof value.kpis.occupancyHint === 'string' &&
    typeof occupancyPercent === 'number'
  )
}

function toOrganization(value: Organization): Organization {
  return {
    id: String(value.id),
    name: value.name,
    code: value.code,
  }
}

function toRestaurantSite(value: RestaurantSite): RestaurantSite {
  return {
    ...value,
    id: String(value.id),
  }
}

export async function fetchOrganizations(): Promise<Organization[]> {
  const payload = await http<unknown>('/organizations')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isOrganization).map(toOrganization)
}

export async function fetchRestaurants(): Promise<RestaurantSite[]> {
  const payload = await http<unknown>('/restaurants')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isRestaurantSite).map(toRestaurantSite)
}

export async function fetchRestaurantById(id: string): Promise<RestaurantSite | null> {
  try {
    const payload = await http<unknown>(`/restaurants/${id}`)
    return isRestaurantSite(payload) ? toRestaurantSite(payload) : null
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return null
    }

    throw error
  }
}

const FLOOR_STATUSES: readonly TableFloorStatus[] = ['occupied', 'available', 'reserved', 'cleaning']
const TAG_TONES: readonly TableTagTone[] = ['critical', 'neutral', 'alert']
const STAFF_AREAS: readonly StaffArea[] = ['kitchen', 'floor', 'support']
const STAFF_STATUSES: readonly StaffShiftStatus[] = ['on-shift', 'break', 'absent']

function isTableFloorStatus(value: unknown): value is TableFloorStatus {
  return typeof value === 'string' && (FLOOR_STATUSES as readonly string[]).includes(value)
}

function isTableTagTone(value: unknown): value is TableTagTone {
  return typeof value === 'string' && (TAG_TONES as readonly string[]).includes(value)
}

function isStaffArea(value: unknown): value is StaffArea {
  return typeof value === 'string' && (STAFF_AREAS as readonly string[]).includes(value)
}

function isStaffShiftStatus(value: unknown): value is StaffShiftStatus {
  return typeof value === 'string' && (STAFF_STATUSES as readonly string[]).includes(value)
}

function isLiveTable(value: unknown): value is LiveTable {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.number === 'string' &&
    typeof value.seats === 'number' &&
    typeof value.occupiedSeats === 'number' &&
    isTableFloorStatus(value.floorStatus) &&
    typeof value.guests === 'number' &&
    typeof value.tagLabel === 'string' &&
    isTableTagTone(value.tagTone) &&
    typeof value.location === 'string' &&
    typeof value.staff === 'string' &&
    typeof value.statusLabel === 'string' &&
    typeof value.courseLabel === 'string' &&
    typeof value.dish === 'string' &&
    typeof value.note === 'string'
  )
}

function isSiteStaffMember(value: unknown): value is SiteStaffMember {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    typeof value.name === 'string' &&
    typeof value.role === 'string' &&
    isStaffArea(value.area) &&
    isStaffShiftStatus(value.status)
  )
}

function isSiteOperation(value: unknown): value is SiteOperation {
  if (!isRecord(value) || !isRecord(value.kpis) || !isRecord(value.quality) || !isRecord(value.cellar) || !isRecord(value.brigade)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.shiftLabel === 'string' &&
    Array.isArray(value.tables) &&
    value.tables.every(isLiveTable) &&
    Array.isArray(value.staff) &&
    value.staff.every(isSiteStaffMember) &&
    Array.isArray(value.stations) &&
    Array.isArray(value.alerts)
  )
}

function toSiteOperation(value: SiteOperation): SiteOperation {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    staff: value.staff.map((member) => ({
      ...member,
      id: String(member.id),
    })),
  }
}

export async function fetchSiteOperation(restaurantId: string): Promise<SiteOperation | null> {
  const payload = await http<unknown>('/siteOperations')

  if (!Array.isArray(payload)) {
    return null
  }

  const match = payload.find((item) => {
    if (!isSiteOperation(item)) {
      return false
    }

    return String(item.restaurantId) === restaurantId
  })

  return match ? toSiteOperation(match) : null
}
