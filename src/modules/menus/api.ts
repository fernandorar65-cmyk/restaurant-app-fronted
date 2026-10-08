import { http } from '@/services/http'
import { normalizeSearch } from '@/utils/string'
import type { Menu, MenuCategory, MenuCategoryDraft, MenuProduct, MenuProductDraft, MenuStatus } from '@/modules/menus/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const MENU_STATUSES: readonly MenuStatus[] = ['draft', 'active', 'inactive']

function isMenuStatus(value: unknown): value is MenuStatus {
  return typeof value === 'string' && (MENU_STATUSES as readonly string[]).includes(value)
}

function isMenu(value: unknown): value is Menu {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    typeof value.name === 'string' &&
    isMenuStatus(value.status)
  )
}

function toMenu(value: Menu): Menu {
  return { ...value, id: String(value.id), restaurantId: String(value.restaurantId) }
}

function isMenuCategory(value: unknown): value is MenuCategory {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    (typeof value.menuId === 'string' || typeof value.menuId === 'number') &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.position === 'number'
  )
}

function isMenuProduct(value: unknown): value is MenuProduct {
  if (!isRecord(value)) {
    return false
  }

  return (
    (typeof value.id === 'string' || typeof value.id === 'number') &&
    (typeof value.restaurantId === 'string' || typeof value.restaurantId === 'number') &&
    (typeof value.categoryId === 'string' || typeof value.categoryId === 'number') &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.price === 'number' &&
    typeof value.imageUrl === 'string' &&
    typeof value.isAvailable === 'boolean' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    Array.isArray(value.allergens) &&
    value.allergens.every((allergen) => typeof allergen === 'string')
  )
}

function toMenuCategory(value: MenuCategory): MenuCategory {
  return { ...value, id: String(value.id), restaurantId: String(value.restaurantId), menuId: String(value.menuId) }
}

function toMenuProduct(value: MenuProduct): MenuProduct {
  return {
    ...value,
    id: String(value.id),
    restaurantId: String(value.restaurantId),
    categoryId: String(value.categoryId),
    isActive: typeof value.isActive === 'boolean' ? value.isActive : true,
    position: typeof value.position === 'number' ? value.position : 0,
  }
}

function compareProducts(a: MenuProduct, b: MenuProduct): number {
  return a.position - b.position || a.name.localeCompare(b.name)
}

export async function fetchMenus(restaurantId: string): Promise<Menu[]> {
  const payload = await http<unknown>('/menus')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.filter(isMenu).map(toMenu).filter((menu) => menu.restaurantId === restaurantId)
}

export async function fetchActiveMenu(restaurantId: string): Promise<Menu | null> {
  const menus = await fetchMenus(restaurantId)
  return menus.find((menu) => menu.status === 'active') ?? null
}

export async function createMenu(restaurantId: string, name: string): Promise<Menu> {
  const payload = await http<unknown>('/menus', {
    method: 'POST',
    body: { restaurantId, name, status: 'draft' },
  })

  if (!isMenu(payload)) {
    throw new Error('No se pudo crear el menú.')
  }

  return toMenu(payload)
}

async function patchMenuStatus(id: string, status: MenuStatus): Promise<Menu> {
  const payload = await http<unknown>(`/menus/${id}`, {
    method: 'PATCH',
    body: { status },
  })

  if (!isMenu(payload)) {
    throw new Error('No se pudo actualizar el estado del menú.')
  }

  return toMenu(payload)
}

/**
 * Cambia el estado de un menú. Solo puede haber un menú activo por sede:
 * al activar uno, el que estaba activo pasa a inactivo. Devuelve los menús afectados.
 */
export async function updateMenuStatus(menu: Menu, status: MenuStatus): Promise<Menu[]> {
  const changed: Menu[] = []

  if (status === 'active') {
    const others = (await fetchMenus(menu.restaurantId)).filter(
      (item) => item.id !== menu.id && item.status === 'active',
    )

    for (const other of others) {
      changed.push(await patchMenuStatus(other.id, 'inactive'))
    }
  }

  changed.push(await patchMenuStatus(menu.id, status))
  return changed
}

export async function fetchMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const payload = await http<unknown>('/menuCategories')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isMenuCategory)
    .map(toMenuCategory)
    .filter((category) => category.restaurantId === restaurantId)
    .sort((a, b) => a.position - b.position)
}

export async function fetchActiveMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const activeMenu = await fetchActiveMenu(restaurantId)

  if (!activeMenu) {
    return []
  }

  const categories = await fetchMenuCategories(restaurantId)
  return categories.filter((category) => category.menuId === activeMenu.id)
}

export async function fetchMenuProducts(restaurantId: string): Promise<MenuProduct[]> {
  const payload = await http<unknown>('/menuProducts')

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter(isMenuProduct)
    .map(toMenuProduct)
    .filter((product) => product.restaurantId === restaurantId)
    .sort(compareProducts)
}

/** Carta que ve el comensal: categorías del menú activo y solo productos activos. */
export async function fetchCustomerMenu(
  restaurantId: string,
): Promise<{ categories: MenuCategory[]; products: MenuProduct[] }> {
  const [categories, products] = await Promise.all([
    fetchActiveMenuCategories(restaurantId),
    fetchMenuProducts(restaurantId),
  ])
  const categoryIds = new Set(categories.map((category) => category.id))

  return {
    categories,
    products: products.filter((product) => product.isActive && categoryIds.has(product.categoryId)),
  }
}

export async function reorderMenuCategories(categories: MenuCategory[]): Promise<MenuCategory[]> {
  const updated: MenuCategory[] = []

  for (const [index, category] of categories.entries()) {
    const position = index + 1

    if (category.position === position) {
      updated.push(category)
      continue
    }

    const payload = await http<unknown>(`/menuCategories/${category.id}`, { method: 'PATCH', body: { position } })
    updated.push(isMenuCategory(payload) ? toMenuCategory(payload) : { ...category, position })
  }

  return updated
}

export async function reorderMenuProducts(products: MenuProduct[]): Promise<MenuProduct[]> {
  const updated: MenuProduct[] = []

  for (const [index, product] of products.entries()) {
    const position = index + 1

    if (product.position === position) {
      updated.push(product)
      continue
    }

    updated.push(await patchMenuProduct(product.id, { position }))
  }

  return updated
}

export async function createMenuCategory(
  restaurantId: string,
  menuId: string,
  draft: MenuCategoryDraft,
  position: number,
): Promise<MenuCategory> {
  const payload = await http<unknown>('/menuCategories', {
    method: 'POST',
    body: { restaurantId, menuId, position, ...draft },
  })

  if (!isMenuCategory(payload)) {
    throw new Error('No se pudo crear la categoría.')
  }

  return toMenuCategory(payload)
}

export async function updateMenuCategory(id: string, draft: MenuCategoryDraft): Promise<MenuCategory> {
  const payload = await http<unknown>(`/menuCategories/${id}`, {
    method: 'PATCH',
    body: draft,
  })

  if (!isMenuCategory(payload)) {
    throw new Error('No se pudo actualizar la categoría.')
  }

  return toMenuCategory(payload)
}

export async function deleteMenuCategory(id: string): Promise<void> {
  await http<unknown>(`/menuCategories/${id}`, { method: 'DELETE' })
}

/**
 * Texto de búsqueda sin tildes que se guarda junto al producto. json-server solo
 * compara en minúsculas; con este campo "jamon" encuentra "Jamón". En el backend
 * real esto lo resolverá la base de datos (p. ej. unaccent + ILIKE en Postgres).
 */
function productSearchText(draft: Pick<MenuProductDraft, 'name' | 'description' | 'tags'>): string {
  return normalizeSearch([draft.name, draft.description, ...draft.tags].join(' '))
}

/**
 * Sugerencias para el buscador predictivo de la carta del comensal.
 * Contrato pensado para el backend: GET /restaurants/:id/menu/suggestions?q=…&limit=…
 */
export async function searchMenuSuggestions(restaurantId: string, query: string, limit = 6): Promise<MenuProduct[]> {
  const term = normalizeSearch(query)

  if (!term) {
    return []
  }

  const where = {
    restaurantId: { eq: restaurantId },
    isActive: { eq: true },
    searchText: { contains: term },
  }
  const payload = await http<unknown>(`/menuProducts?_where=${encodeURIComponent(JSON.stringify(where))}`)

  if (!Array.isArray(payload)) {
    return []
  }

  const products = payload.filter(isMenuProduct).map(toMenuProduct)

  /* Primero los que empiezan por el término, luego los que lo contienen en el nombre, luego el resto. */
  const rank = (product: MenuProduct): number => {
    const name = normalizeSearch(product.name)
    return name.startsWith(term) ? 0 : name.includes(term) ? 1 : 2
  }

  return products.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'es')).slice(0, limit)
}

export async function createMenuProduct(
  restaurantId: string,
  draft: MenuProductDraft,
  position = 0,
): Promise<MenuProduct> {
  const payload = await http<unknown>('/menuProducts', {
    method: 'POST',
    body: {
      restaurantId,
      position,
      ...draft,
      searchText: productSearchText(draft),
      imageUrl: draft.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=480&fit=crop&auto=format&q=70',
    },
  })

  if (!isMenuProduct(payload)) {
    throw new Error('No se pudo crear el producto.')
  }

  return toMenuProduct(payload)
}

export async function patchMenuProduct(
  id: string,
  changes: Partial<MenuProductDraft & { position: number; searchText: string }>,
): Promise<MenuProduct> {
  const payload = await http<unknown>(`/menuProducts/${id}`, {
    method: 'PATCH',
    body: changes,
  })

  if (!isMenuProduct(payload)) {
    throw new Error('No se pudo actualizar el producto.')
  }

  return toMenuProduct(payload)
}

export async function updateMenuProduct(id: string, draft: MenuProductDraft): Promise<MenuProduct> {
  return patchMenuProduct(id, { ...draft, searchText: productSearchText(draft) })
}

/**
 * Convierte una imagen elegida por el usuario en un data URL reducido, para
 * guardarla directamente en db.json mientras no haya almacenamiento de archivos.
 */
export function imageFileToDataUrl(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      const image = new Image()

      image.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function deleteMenuProduct(id: string): Promise<void> {
  await http<unknown>(`/menuProducts/${id}`, { method: 'DELETE' })
}
