/** Perfil del cliente (comensal). Independiente del perfil del personal del restaurante. */
export interface CustomerProfile {
  id: string
  name: string
  email: string
  phone: string | null
  /** Fecha YYYY-MM-DD, opcional. */
  birthday: string | null
  /** Ej: Vegetariano, Sin gluten. Sirve para recomendar platos más adelante. */
  dietaryPreferences: string[]
  /** Alergias declaradas; la carta podrá avisar de los productos que las contienen. */
  allergens: string[]
  /** Acepta recibir promociones y novedades. */
  marketingOptIn: boolean
  createdAt: string | null
}

export type CustomerProfileDraft = Pick<
  CustomerProfile,
  'name' | 'phone' | 'birthday' | 'dietaryPreferences' | 'allergens' | 'marketingOptIn'
>

export const DIETARY_PREFERENCES = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Halal', 'Kosher'] as const

export const ALLERGEN_OPTIONS = [
  'Gluten',
  'Lácteos',
  'Huevo',
  'Frutos secos',
  'Marisco',
  'Pescado',
  'Soja',
  'Sésamo',
] as const
