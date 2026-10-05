import { http, HttpError } from '@/services/http'
import type {
  LiveTable,
  Organization,
  RestaurantOperationalStatus,
  RestaurantSite,
  SiteOperation,
  SiteStaffMember,
  StaffArea,
  StaffShiftStatus,
  TableFloorStatus,
  TableStatus,
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

function isRestaurantOperationalStatus(value: unknown): value is RestaurantOperationalStatus {
  return value === 'active' || value === 'inactive' || value === 'suspended'
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
    isRestaurantOperationalStatus(value.status) &&
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
    currency: typeof value.currency === 'string' && value.currency ? value.currency : 'EUR',
    timezone: typeof value.timezone === 'string' && value.timezone ? value.timezone : 'Europe/Madrid',
  }
}

/** La sede puede recibir comensales y abrir atenciones. */
export function isRestaurantOpen(site: RestaurantSite): boolean {
  return site.status === 'active'
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

export interface RestaurantDraft {
  name: string
  city: string
  address: string
  cuisine: string
  status: RestaurantOperationalStatus
  statusLabel: string
  category: RestaurantSite['category']
  categoryLabel: string
  currency: string
  timezone: string
}

export interface NewRestaurantDraft extends RestaurantDraft {
  code: string
  imageUrl: string
}

/** Alta de sede: crea el restaurante y su registro operativo (plano de sala vacío). */
export async function createRestaurant(draft: NewRestaurantDraft): Promise<RestaurantSite> {
  const payload = await http<unknown>('/restaurants', {
    method: 'POST',
    body: {
      ...draft,
      badgeLabel: draft.categoryLabel,
      badgeTone: 'blue',
      capacityLabel: 'Cubiertos: —',
      roleLabel: 'Dirección de sede',
      kpis: {
        revenueLabel: '—',
        revenueHint: 'Sin datos todavía',
        marginLabel: '—',
        stockLabel: '—',
        stockHint: '—',
        stockNote: '—',
        occupancyLabel: '—',
        occupancyHint: '—',
        occupancyPercent: 0,
      },
    },
  })

  if (!isRestaurantSite(payload)) {
    throw new Error('No se pudo crear la sede.')
  }

  const site = toRestaurantSite(payload)

  await http<unknown>('/siteOperations', {
    method: 'POST',
    body: {
      restaurantId: site.id,
      shiftLabel: 'Sin turno configurado',
      kpis: {
        revenue: '—',
        revenueHint: '—',
        ticket: '—',
        margin: '—',
        occupancyCurrent: 0,
        occupancyMax: 0,
        occupancyDetail: '—',
        occupancyVip: '—',
        cadence: '—',
        cadenceHint: '—',
        cadenceDetail: '—',
        cellar: '—',
        cellarShare: '—',
        cellarDetail: '—',
      },
      tables: [],
      staff: [],
      quality: { chef: '—', title: '—', description: '—', imageUrl: '', extra: '—' },
      stations: [],
      alerts: [],
      cellar: { sommelier: '—', champagnes: 0, reds: 0, whites: 0, pairingPercent: 0 },
      brigade: { present: 0, total: 0, kitchen: '—', floor: '—', support: '—', headChef: '—' },
    },
  })

  return site
}

export async function updateRestaurant(
  id: string,
  draft: RestaurantDraft & { imageUrl?: string },
): Promise<RestaurantSite> {
  const payload = await http<unknown>(`/restaurants/${id}`, {
    method: 'PATCH',
    body: draft,
  })

  if (!isRestaurantSite(payload)) {
    throw new Error('No se pudo actualizar la sede.')
  }

  return toRestaurantSite(payload)
}

export interface OrganizationDraft {
  name: string
  code: string
}

export async function updateOrganization(id: string, draft: OrganizationDraft): Promise<Organization> {
  const payload = await http<unknown>(`/organizations/${id}`, {
    method: 'PATCH',
    body: draft,
  })

  if (!isOrganization(payload)) {
    throw new Error('No se pudo actualizar la organización.')
  }

  return toOrganization(payload)
}

const FLOOR_STATUSES: readonly TableFloorStatus[] = ['occupied', 'available', 'reserved', 'cleaning']
const TABLE_STATUSES: readonly TableStatus[] = ['active', 'inactive', 'maintenance']
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
    typeof value.note === 'string' &&
    typeof value.qrToken === 'string' &&
    typeof value.qrActive === 'boolean'
  )
}

function toLiveTable(value: LiveTable): LiveTable {
  return {
    ...value,
    code: typeof value.code === 'string' && value.code ? value.code : `M-${value.number}`,
    status: (TABLE_STATUSES as readonly unknown[]).includes(value.status) ? value.status : 'active',
  }
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
    tables: value.tables.map(toLiveTable),
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

export async function updateSiteOperationTables(operationId: string, tables: LiveTable[]): Promise<SiteOperation> {
  const payload = await http<unknown>(`/siteOperations/${operationId}`, {
    method: 'PATCH',
    body: { tables },
  })

  if (!isSiteOperation(payload)) {
    throw new Error('No se pudo actualizar el plano de sala.')
  }

  return toSiteOperation(payload)
}
