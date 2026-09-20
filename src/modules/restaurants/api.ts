import { http } from '@/services/http'
import type { Organization, RestaurantSite } from '@/modules/restaurants/types'

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
