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

export type TableTagTone = 'critical' | 'neutral' | 'alert'

export type TableFloorStatus = 'occupied' | 'available' | 'reserved' | 'cleaning'

export type StaffArea = 'kitchen' | 'floor' | 'support'

export type StaffShiftStatus = 'on-shift' | 'break' | 'absent'

export interface LiveTable {
  number: string
  seats: number
  occupiedSeats: number
  floorStatus: TableFloorStatus
  guests: number
  tagLabel: string
  tagTone: TableTagTone
  location: string
  staff: string
  statusLabel: string
  courseLabel: string
  dish: string
  note: string
}

export interface SiteStaffMember {
  id: string
  name: string
  role: string
  area: StaffArea
  status: StaffShiftStatus
}

export interface KitchenStation {
  name: string
  chef: string
  progressLabel: string
  progressPercent: number
  detail: string
}

export interface SiteAlert {
  title: string
  status: string
  description: string
}

export interface SiteOperation {
  id: string
  restaurantId: string
  shiftLabel: string
  kpis: {
    revenue: string
    revenueHint: string
    ticket: string
    margin: string
    occupancyCurrent: number
    occupancyMax: number
    occupancyDetail: string
    occupancyVip: string
    cadence: string
    cadenceHint: string
    cadenceDetail: string
    cellar: string
    cellarShare: string
    cellarDetail: string
  }
  tables: LiveTable[]
  staff: SiteStaffMember[]
  quality: {
    chef: string
    title: string
    description: string
    imageUrl: string
    extra: string
  }
  stations: KitchenStation[]
  alerts: SiteAlert[]
  cellar: {
    sommelier: string
    champagnes: number
    reds: number
    whites: number
    pairingPercent: number
  }
  brigade: {
    present: number
    total: number
    kitchen: string
    floor: string
    support: string
    headChef: string
  }
}
