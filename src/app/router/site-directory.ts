import { ref } from 'vue'

import { fetchRestaurants } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'

/**
 * Directorio de sedes en memoria para traducir entre el slug de la URL
 * (/owner/sede/bodega-san-telmo-grand-cru) y el id que usan la API y los permisos.
 */
const sites = ref<RestaurantSite[] | null>(null)
let pending: Promise<void> | null = null

export async function ensureSiteDirectory(force = false): Promise<void> {
  if (sites.value && !force) {
    return
  }

  pending ??= fetchRestaurants()
    .then((list) => {
      sites.value = list
    })
    .finally(() => {
      pending = null
    })

  await pending
}

/**
 * Sede por slug (o por id, si alguna URL se armó antes de cargar el directorio).
 * Si no la encuentra, recarga una vez por si es una sede recién creada.
 */
export async function findSite(slugOrId: string): Promise<{ id: string; slug: string } | null> {
  const lookup = () => sites.value?.find((site) => site.slug === slugOrId) ?? sites.value?.find((site) => site.id === slugOrId)

  await ensureSiteDirectory()
  let match = lookup()

  if (!match) {
    await ensureSiteDirectory(true)
    match = lookup()
  }

  return match ? { id: match.id, slug: match.slug } : null
}

/** Slug de una sede ya cargada. Si el directorio aún no cargó, usa el id como respaldo. */
export function siteSlugFor(id: string): string {
  return sites.value?.find((site) => site.id === id)?.slug ?? id
}
