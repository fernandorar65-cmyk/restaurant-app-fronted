export type MenuStatus = 'draft' | 'active' | 'inactive'

export interface Menu {
  id: string
  restaurantId: string
  name: string
  status: MenuStatus
}

/**
 * Sección del menú (en el API: `MenuSection`). En la UI se llama "categoría".
 * No tiene descripción: el API no la guarda.
 */
export interface MenuCategory {
  id: string
  menuId: string
  name: string
  position: number
  /** false = sección oculta (o dada de baja). La gestión solo muestra las activas. */
  isActive: boolean
}

/**
 * Producto del catálogo (`/products`) junto con su lugar en un menú (`/menus/{id}/products`).
 * `id` es el id del producto: es el que se usa en las órdenes.
 */
export interface MenuProduct {
  id: string
  restaurantId: string
  /** Menú en el que está colocado. Vacío cuando viene del catálogo sin menú (p. ej. `fetchMenuProducts`). */
  menuId: string
  /** Sección del menú. `UNSECTIONED_ID` = sin sección; vacío = sin datos de menú. */
  categoryId: string
  name: string
  description: string
  /** Precio que se cobra en el pedido (precio del producto). */
  price: number
  imageUrl: string
  /** Se muestra en la carta (visibilidad en el menú). Un producto inactivo no aparece para el comensal. */
  isActive: boolean
  /** Se puede pedir. Un producto activo pero no disponible se muestra como "Agotado". */
  isAvailable: boolean
  /** Se puede pedir para recojo. */
  isTakeawayAllowed: boolean
  /** Se puede pedir por delivery. */
  isDeliveryAllowed: boolean
  /** Orden dentro de su sección. */
  position: number
  tags: string[]
  /** El API no guarda alérgenos: siempre vacío. */
  allergens: string[]
  /**
   * Ingredientes principales, en orden. Solo los carga la gestión al editar el producto
   * (`/products/{id}/ingredients` exige ser miembro); la carta pública no los trae.
   */
  ingredients: string[]
  /** Tamaño de la porción: "6 unidades", "Para compartir · 400 g". Vacío = no se muestra. */
  portion: string
  /** Cómo llega a la mesa (emplatado, acompañamientos, recomendaciones). Vacío = no se muestra. */
  presentation: string
  /** El API no guarda una descripción larga: siempre vacío (el detalle usa `description`). */
  longDescription: string
  /** Tiempo aproximado de preparación en minutos. null = no se muestra. */
  prepMinutes: number | null
}

export interface MenuCategoryDraft {
  name: string
}

export interface MenuProductDraft {
  categoryId: string
  name: string
  description: string
  price: number
  imageUrl: string
  isActive: boolean
  isAvailable: boolean
  tags: string[]
  ingredients: string[]
  portion: string
  presentation: string
  prepMinutes: number | null
}
