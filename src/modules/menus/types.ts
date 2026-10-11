export type MenuStatus = 'draft' | 'active' | 'inactive'

export interface Menu {
  id: string
  restaurantId: string
  name: string
  status: MenuStatus
}

export interface MenuCategory {
  id: string
  restaurantId: string
  menuId: string
  name: string
  description: string
  position: number
}

export interface MenuProduct {
  id: string
  restaurantId: string
  categoryId: string
  name: string
  description: string
  price: number
  imageUrl: string
  /** Se muestra en la carta. Un producto inactivo no aparece para el comensal. */
  isActive: boolean
  /** Se puede pedir. Un producto activo pero no disponible se muestra como "Agotado". */
  isAvailable: boolean
  position: number
  tags: string[]
  allergens: string[]
  /** Ingredientes principales, en el orden en que se quieren mostrar. */
  ingredients: string[]
  /** Tamaño de la porción: "6 unidades", "Para compartir · 400 g". Vacío = no se muestra. */
  portion: string
  /** Cómo llega a la mesa (emplatado, acompañamientos, recomendaciones). Vacío = no se muestra. */
  presentation: string
  /** Texto largo para el detalle del plato; la descripción corta queda para la tarjeta de la carta. */
  longDescription: string
  /** Tiempo aproximado de preparación en minutos. null = no se muestra. */
  prepMinutes: number | null
}

export interface MenuCategoryDraft {
  name: string
  description: string
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
  allergens: string[]
  ingredients: string[]
  portion: string
  presentation: string
  longDescription: string
  prepMinutes: number | null
}
