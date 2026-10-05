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
}
