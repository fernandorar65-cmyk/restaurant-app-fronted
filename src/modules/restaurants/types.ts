export type RestaurantCategory = 'fine-dining' | 'bistro' | 'lab'

export type RestaurantBadgeTone = 'amber' | 'emerald' | 'wine' | 'blue'

export interface Organization {
  id: string
  name: string
  code: string
}

export interface RestaurantKpis {
  revenueLabel: string
  revenueHint: string
  marginLabel: string
  stockLabel: string
  stockHint: string
  stockNote: string
  occupancyLabel: string
  occupancyHint: string
  occupancyPercent: number
}

export interface RestaurantSite {
  id: string
  code: string
  name: string
  city: string
  address: string
  imageUrl: string
  category: RestaurantCategory
  categoryLabel: string
  cuisine: string
  statusLabel: string
  badgeLabel: string
  badgeTone: RestaurantBadgeTone
  capacityLabel: string
  roleLabel: string
  kpis: RestaurantKpis
}
