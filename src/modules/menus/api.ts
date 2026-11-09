/**
 * Catálogo y carta.
 *
 * Mapeo entre el modelo del front y el API:
 * - `Menu`          ↔ `/menus` (estado en MAYÚSCULAS). Activar un menú deja inactivo al anterior
 *                     en el servidor, en la misma transacción.
 * - `MenuCategory`  ↔ sección del menú: `/menus/{menuId}/sections` (`position` = `sortOrder`).
 *                     El API no guarda descripción de sección. Reordenar = `PUT .../sections/order`.
 * - `MenuProduct`   ↔ producto del catálogo (`/products`) + su colocación en el menú
 *                     (`/menus/{id}/products`: sección, orden y visibilidad). `id` = id del producto.
 *     - `categoryId` = `menuSectionId` (`UNSECTIONED_ID` si no tiene sección).
 *     - `position`   = `sortOrder` dentro de la sección. Reordenar = `PUT .../products/order`.
 *     - `isActive`   = `isVisible` de la colocación en el menú (ocultar sin quitarlo).
 *     - `isAvailable`, precio, textos, etiquetas, foto = campos del producto (`PATCH /products/{id}`).
 *     - `ingredients` = `/products/{id}/ingredients` (solo gestión; se cargan al editar).
 *     - `allergens` y `longDescription` no existen en el API: siempre vacíos.
 * - Crear producto en la carta = `POST /products` con `menu` (lo coloca en el menú en la misma llamada).
 * - Eliminar producto de la carta = `DELETE /products/{id}` (baja lógica: deja de salir en la carta,
 *   se conserva el historial de pedidos). Los productos inactivos no se listan en la gestión.
 * - Carta del comensal = `GET /api/v1/restaurants/{id}/menu` (público) y buscador
 *   `GET /api/v1/restaurants/{id}/menu/search`.
 * - Fotos = `POST /uploads/images` (multipart) → URL pública que se guarda en `imageUrl`.
 */
import { http, httpAll } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { normalizeSearch } from '@/utils/string'
import type { Menu, MenuCategory, MenuCategoryDraft, MenuProduct, MenuProductDraft, MenuStatus } from '@/modules/menus/types'

/** `categoryId` de los productos que no tienen sección en el menú. */
export const UNSECTIONED_ID = 'sin-seccion'

/** Nombre de la categoría sintética que agrupa los productos sin sección en la carta. */
const UNSECTIONED_NAME = 'Otros'

/* ------------------------------------------------------------------ DTOs */

type ApiMenuStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

interface MenuDto {
  id: string
  restaurantId: string
  name: string
  status: ApiMenuStatus
}

interface MenuSectionDto {
  id: string
  menuId: string
  name: string
  sortOrder: number
  isActive: boolean
}

interface ProductDto {
  id: string
  restaurantId: string
  name: string
  description?: string | null
  imageUrl?: string | null
  price: number
  preparationMinutes?: number | null
  tags?: string[] | null
  portion?: string | null
  presentation?: string | null
  isAvailable: boolean
  isTakeawayAllowed?: boolean
  isDeliveryAllowed?: boolean
  status: 'ACTIVE' | 'INACTIVE'
}

interface MenuProductPlacementDto {
  menuId: string
  productId: string
  menuSectionId?: string | null
  sortOrder: number
  isVisible: boolean
}

interface MenuProductDetailDto extends MenuProductPlacementDto {
  product: ProductDto
}

interface StorefrontProductDto {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  price: number
  preparationMinutes?: number | null
  tags?: string[] | null
  portion?: string | null
  presentation?: string | null
  isAvailable: boolean
  isTakeawayAllowed?: boolean
  isDeliveryAllowed?: boolean
  menuSectionId?: string | null
}

interface StorefrontMenuDto {
  restaurantId: string
  menu: MenuDto | null
  sections: MenuSectionDto[]
  products: StorefrontProductDto[]
}

interface IngredientDto {
  id: string
  productId: string
  name: string
  sortOrder: number
  isVisible: boolean
}

interface UploadedFileDto {
  key: string
  url: string
}

/* ------------------------------------------------------------- Mapeos */

const STATUS_FROM_API: Record<ApiMenuStatus, MenuStatus> = { DRAFT: 'draft', ACTIVE: 'active', INACTIVE: 'inactive' }
const STATUS_TO_API: Record<MenuStatus, ApiMenuStatus> = { draft: 'DRAFT', active: 'ACTIVE', inactive: 'INACTIVE' }

function toMenu(dto: MenuDto): Menu {
  return { id: dto.id, restaurantId: dto.restaurantId, name: dto.name, status: STATUS_FROM_API[dto.status] ?? 'draft' }
}

function toMenuCategory(dto: MenuSectionDto): MenuCategory {
  return { id: dto.id, menuId: dto.menuId, name: dto.name, position: dto.sortOrder, isActive: dto.isActive }
}

function sectionIdFromApi(menuSectionId: string | null | undefined): string {
  return menuSectionId ?? UNSECTIONED_ID
}

function sectionIdToApi(categoryId: string): string | null {
  return categoryId && categoryId !== UNSECTIONED_ID ? categoryId : null
}

/** Campos comunes a `ProductDto` y `StorefrontProductDto`. */
function productFields(dto: ProductDto | StorefrontProductDto): Omit<
  MenuProduct,
  'id' | 'restaurantId' | 'menuId' | 'categoryId' | 'isActive' | 'position'
> {
  return {
    name: dto.name,
    description: dto.description ?? '',
    price: Number(dto.price) || 0,
    imageUrl: dto.imageUrl ?? '',
    isAvailable: dto.isAvailable,
    isTakeawayAllowed: dto.isTakeawayAllowed ?? true,
    isDeliveryAllowed: dto.isDeliveryAllowed ?? true,
    tags: Array.isArray(dto.tags) ? dto.tags : [],
    allergens: [],
    ingredients: [],
    portion: dto.portion ?? '',
    presentation: dto.presentation ?? '',
    longDescription: '',
    prepMinutes: typeof dto.preparationMinutes === 'number' && dto.preparationMinutes > 0 ? dto.preparationMinutes : null,
  }
}

/** Producto del catálogo, sin datos de menú. */
function toCatalogProduct(dto: ProductDto): MenuProduct {
  return {
    ...productFields(dto),
    id: dto.id,
    restaurantId: dto.restaurantId,
    menuId: '',
    categoryId: '',
    isActive: dto.status === 'ACTIVE',
    position: 0,
  }
}

function toPlacedProduct(product: ProductDto, placement: MenuProductPlacementDto): MenuProduct {
  return {
    ...productFields(product),
    id: product.id,
    restaurantId: product.restaurantId,
    menuId: placement.menuId,
    categoryId: sectionIdFromApi(placement.menuSectionId),
    isActive: placement.isVisible,
    position: placement.sortOrder,
  }
}

function toStorefrontProduct(dto: StorefrontProductDto, restaurantId: string, menuId: string): MenuProduct {
  return {
    ...productFields(dto),
    id: dto.id,
    restaurantId,
    menuId,
    categoryId: sectionIdFromApi(dto.menuSectionId),
    isActive: true,
    position: 0,
  }
}

function compareProducts(a: MenuProduct, b: MenuProduct): number {
  return a.position - b.position || a.name.localeCompare(b.name, 'es')
}

/* --------------------------------------------------------------- Menús */

/** GET /menus?restaurantId */
export async function fetchMenus(restaurantId: string): Promise<Menu[]> {
  const items = await httpAll<MenuDto>('/menus', { query: { restaurantId } })
  return items.map(toMenu)
}

/** POST /menus (nace en borrador). */
export async function createMenu(restaurantId: string, name: string): Promise<Menu> {
  return toMenu(await http<MenuDto>('/menus', { method: 'POST', body: { restaurantId, name } }))
}

/**
 * PATCH /menus/{id} con el estado. Solo hay un menú activo por sede: al activar uno, el servidor
 * deja inactivo al anterior. Devuelve el menú cambiado; quien llama ajusta los demás en pantalla.
 */
export async function updateMenuStatus(menu: Menu, status: MenuStatus): Promise<Menu> {
  return toMenu(await http<MenuDto>(`/menus/${menu.id}`, { method: 'PATCH', body: { status: STATUS_TO_API[status] } }))
}

/* ----------------------------------------------- Secciones (categorías) */

/** GET /menus/{menuId}/sections (incluye las ocultas, en orden). */
export async function fetchMenuCategories(menuId: string): Promise<MenuCategory[]> {
  const sections = await http<MenuSectionDto[]>(`/menus/${menuId}/sections`)
  return (Array.isArray(sections) ? sections : []).map(toMenuCategory).sort((a, b) => a.position - b.position)
}

/** POST /menus/{menuId}/sections */
export async function createMenuCategory(menuId: string, draft: MenuCategoryDraft, position: number): Promise<MenuCategory> {
  const section = await http<MenuSectionDto>(`/menus/${menuId}/sections`, {
    method: 'POST',
    body: { name: draft.name, sortOrder: position },
  })
  return toMenuCategory(section)
}

/** PATCH /menus/{menuId}/sections/{id} */
export async function updateMenuCategory(category: MenuCategory, draft: MenuCategoryDraft): Promise<MenuCategory> {
  const section = await http<MenuSectionDto>(`/menus/${category.menuId}/sections/${category.id}`, {
    method: 'PATCH',
    body: { name: draft.name },
  })
  return toMenuCategory(section)
}

/**
 * DELETE /menus/{menuId}/sections/{id} (baja lógica). Si tiene productos, el servidor exige
 * `moveProductsTo` (otra sección activa del mismo menú); sin él responde 422 SECTION_HAS_PRODUCTS.
 */
export async function deleteMenuCategory(category: MenuCategory, moveProductsTo?: string): Promise<void> {
  await http<unknown>(`/menus/${category.menuId}/sections/${category.id}`, {
    method: 'DELETE',
    query: { moveProductsTo },
  })
}

/**
 * PUT /menus/{menuId}/sections/order en una sola petición. El API exige todas las secciones
 * del menú (también las ocultas): `categories` va en el nuevo orden y las ocultas que falten
 * se agregan al final.
 */
export async function reorderMenuCategories(
  menuId: string,
  categories: MenuCategory[],
  hidden: MenuCategory[] = [],
): Promise<MenuCategory[]> {
  const ids = [...categories, ...hidden.filter((item) => !categories.some((category) => category.id === item.id))].map(
    (category) => category.id,
  )
  const sections = await http<MenuSectionDto[]>(`/menus/${menuId}/sections/order`, { method: 'PUT', body: { ids } })
  return sections.map(toMenuCategory).sort((a, b) => a.position - b.position)
}

/* ------------------------------------------------------------ Productos */

/**
 * Catálogo de productos activos de la sede (GET /products?restaurantId), sin datos de menú.
 * Ruta del panel: requiere sesión del personal.
 */
export async function fetchMenuProducts(restaurantId: string): Promise<MenuProduct[]> {
  const items = await httpAll<ProductDto>('/products', { query: { restaurantId } })
  return items
    .filter((product) => product.status === 'ACTIVE')
    .map(toCatalogProduct)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

/**
 * Productos de un menú con su sección, orden y visibilidad (GET /menus/{id}/products).
 * Omite los productos dados de baja.
 */
export async function fetchMenuProductsByMenu(menuId: string): Promise<MenuProduct[]> {
  const entries = await http<MenuProductDetailDto[]>(`/menus/${menuId}/products`)
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry.product.status === 'ACTIVE')
    .map((entry) => toPlacedProduct(entry.product, entry))
    .sort(compareProducts)
}

/** Ingredientes del producto, en orden (GET /products/{id}/ingredients). Solo gestión. */
export async function fetchProductIngredients(productId: string): Promise<string[]> {
  const items = await fetchIngredientRecords(productId)
  return items.map((item) => item.name)
}

async function fetchIngredientRecords(productId: string): Promise<IngredientDto[]> {
  const items = await http<IngredientDto[]>(`/products/${productId}/ingredients`)
  return (Array.isArray(items) ? items : []).sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Deja los ingredientes del producto iguales a `names` (en ese orden): reutiliza los que ya
 * existen con el mismo nombre, crea los nuevos y elimina los que sobran. El API no tiene
 * un reemplazo en bloque, así que son varias peticiones (solo cuando la lista cambió).
 */
async function syncIngredients(productId: string, names: string[], current: IngredientDto[]): Promise<void> {
  const pending = [...current]

  for (const [sortOrder, name] of names.entries()) {
    const index = pending.findIndex((item) => normalizeSearch(item.name) === normalizeSearch(name))

    if (index >= 0) {
      const [existing] = pending.splice(index, 1)

      if (existing && (existing.sortOrder !== sortOrder || existing.name !== name)) {
        await http<IngredientDto>(`/products/${productId}/ingredients/${existing.id}`, {
          method: 'PATCH',
          body: { name, sortOrder },
        })
      }
      continue
    }

    await http<IngredientDto>(`/products/${productId}/ingredients`, { method: 'POST', body: { name, sortOrder } })
  }

  for (const leftover of pending) {
    await http<unknown>(`/products/${productId}/ingredients/${leftover.id}`, { method: 'DELETE' })
  }
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

/** Código interno obligatorio y único por sede. La UI no lo pide: se genera a partir del nombre. */
function generateProductCode(name: string): string {
  const base = normalizeSearch(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base || 'PROD'}-${suffix}`
}

/** Campos del producto que viajan en POST/PATCH /products. */
function productBody(draft: MenuProductDraft): Record<string, unknown> {
  return {
    name: draft.name,
    description: draft.description,
    price: draft.price,
    imageUrl: draft.imageUrl || undefined,
    isAvailable: draft.isAvailable,
    tags: draft.tags,
    portion: draft.portion || null,
    presentation: draft.presentation || null,
    preparationMinutes: draft.prepMinutes ?? undefined,
  }
}

/**
 * Crea el producto y lo coloca en el menú en una sola llamada (POST /products con `menu`).
 * Si el producto debe quedar oculto o tiene ingredientes, se completan después.
 */
export async function createMenuProduct(
  restaurantId: string,
  menuId: string,
  draft: MenuProductDraft,
  position = 0,
): Promise<MenuProduct> {
  const menuSectionId = sectionIdToApi(draft.categoryId)
  const product = await http<ProductDto>('/products', {
    method: 'POST',
    body: {
      ...productBody(draft),
      restaurantId,
      code: generateProductCode(draft.name),
      menu: { menuId, menuSectionId, sortOrder: position },
    },
  })

  if (!draft.isActive) {
    await http<MenuProductPlacementDto>(`/menus/${menuId}/products/${product.id}`, {
      method: 'PATCH',
      body: { isVisible: false },
    })
  }

  if (draft.ingredients.length > 0) {
    await syncIngredients(product.id, draft.ingredients, [])
  }

  return {
    ...toPlacedProduct(product, { menuId, productId: product.id, menuSectionId, sortOrder: position, isVisible: draft.isActive }),
    ingredients: [...draft.ingredients],
  }
}

/**
 * Guarda el formulario del producto: PATCH /products/{id} con sus datos y, si cambió la sección
 * o la visibilidad, PATCH /menus/{menuId}/products/{id}. Los ingredientes se sincronizan
 * solo si cambiaron respecto de `current.ingredients` (cargados al abrir el formulario).
 */
export async function updateMenuProduct(current: MenuProduct, draft: MenuProductDraft): Promise<MenuProduct> {
  const product = await http<ProductDto>(`/products/${current.id}`, { method: 'PATCH', body: productBody(draft) })
  let placement: MenuProductPlacementDto = {
    menuId: current.menuId,
    productId: current.id,
    menuSectionId: sectionIdToApi(current.categoryId),
    sortOrder: current.position,
    isVisible: current.isActive,
  }

  const sectionChanged = draft.categoryId !== current.categoryId
  if (current.menuId && (sectionChanged || draft.isActive !== current.isActive)) {
    placement = await http<MenuProductPlacementDto>(`/menus/${current.menuId}/products/${current.id}`, {
      method: 'PATCH',
      body: {
        ...(sectionChanged ? { menuSectionId: sectionIdToApi(draft.categoryId) } : {}),
        isVisible: draft.isActive,
      },
    })
  }

  if (!sameList(draft.ingredients, current.ingredients)) {
    await syncIngredients(current.id, draft.ingredients, await fetchIngredientRecords(current.id))
  }

  return { ...toPlacedProduct(product, placement), ingredients: [...draft.ingredients] }
}

/** Disponible / agotado (PATCH /products/{id}). */
export async function setMenuProductAvailability(product: MenuProduct, isAvailable: boolean): Promise<MenuProduct> {
  const updated = await http<ProductDto>(`/products/${product.id}`, { method: 'PATCH', body: { isAvailable } })
  return { ...product, ...productFields(updated), ingredients: product.ingredients }
}

/** Visible / oculto en la carta (PATCH /menus/{menuId}/products/{id}). */
export async function setMenuProductVisibility(product: MenuProduct, isVisible: boolean): Promise<MenuProduct> {
  const placement = await http<MenuProductPlacementDto>(`/menus/${product.menuId}/products/${product.id}`, {
    method: 'PATCH',
    body: { isVisible },
  })
  return { ...product, isActive: placement.isVisible, position: placement.sortOrder }
}

/**
 * PUT /menus/{menuId}/products/order en una sola petición. `products` deben ser todos los
 * productos de una misma sección del menú, en el nuevo orden.
 */
export async function reorderMenuProducts(menuId: string, products: MenuProduct[]): Promise<MenuProduct[]> {
  const first = products[0]

  if (!first) {
    return []
  }

  const placements = await http<MenuProductPlacementDto[]>(`/menus/${menuId}/products/order`, {
    method: 'PUT',
    body: { menuSectionId: sectionIdToApi(first.categoryId), productIds: products.map((product) => product.id) },
  })
  const order = new Map((Array.isArray(placements) ? placements : []).map((item) => [item.productId, item.sortOrder]))

  return products.map((product, index) => ({ ...product, position: order.get(product.id) ?? index }))
}

/** Baja lógica del producto (DELETE /products/{id}): deja de salir en la carta. */
export async function deleteMenuProduct(id: string): Promise<void> {
  await http<unknown>(`/products/${id}`, { method: 'DELETE' })
}

/* ------------------------------------------------------- Carta pública */

/**
 * Carta que ve el comensal (GET /api/v1/restaurants/{id}/menu, público): secciones activas del
 * menú vigente y sus productos visibles. Los productos sin sección van en una categoría "Otros".
 */
export async function fetchCustomerMenu(
  restaurantId: string,
): Promise<{ categories: MenuCategory[]; products: MenuProduct[] }> {
  const data = await http<StorefrontMenuDto>(`/api/v1/restaurants/${restaurantId}/menu`, { auth: 'none' })

  if (!data?.menu) {
    return { categories: [], products: [] }
  }

  const menuId = data.menu.id
  const categories = data.sections.map(toMenuCategory)
  const products = data.products.map((dto, index) => ({
    ...toStorefrontProduct(dto, restaurantId, menuId),
    position: index,
  }))

  if (products.some((product) => product.categoryId === UNSECTIONED_ID)) {
    categories.push({
      id: UNSECTIONED_ID,
      menuId,
      name: UNSECTIONED_NAME,
      position: Number.MAX_SAFE_INTEGER,
      isActive: true,
    })
  }

  return { categories, products }
}

/**
 * Sugerencias del buscador predictivo de la carta del comensal
 * (GET /api/v1/restaurants/{id}/menu/search?q&limit). El servidor ignora tildes y mayúsculas
 * y ordena primero las coincidencias por inicio del nombre.
 */
export async function searchMenuSuggestions(restaurantId: string, query: string, limit = 6): Promise<MenuProduct[]> {
  const q = query.trim()

  if (!q) {
    return []
  }

  const items = await http<StorefrontProductDto[]>(`/api/v1/restaurants/${restaurantId}/menu/search`, {
    auth: 'none',
    query: { q, limit },
  })

  return (Array.isArray(items) ? items : []).map((dto, index) => ({
    ...toStorefrontProduct(dto, restaurantId, ''),
    position: index,
  }))
}

/* -------------------------------------------------------------- Imágenes */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Sube una imagen de la sede (POST /uploads/images?restaurantId, multipart con el campo `file`)
 * y devuelve su URL pública para guardarla en el registro (p. ej. `imageUrl` del producto).
 * Sin `restaurantId` usa la sede activa del personal. Requiere `catalog.manage`.
 */
export async function uploadImage(file: File, restaurantId?: string): Promise<string> {
  const siteId = restaurantId ?? useSessionStore().restaurantId

  if (!siteId) {
    throw new Error('No hay una sede seleccionada para subir la imagen.')
  }

  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('Elige una imagen JPG, PNG, WebP o AVIF.')
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen pesa más de 5 MB.')
  }

  const body = new FormData()
  body.append('file', file)

  const uploaded = await http<UploadedFileDto>('/uploads/images', {
    method: 'POST',
    query: { restaurantId: siteId },
    body,
  })

  return uploaded.url
}
