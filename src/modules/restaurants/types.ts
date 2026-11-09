export type RestaurantOperationalStatus = 'active' | 'inactive' | 'suspended'

export interface Organization {
  id: string
  name: string
  legalName: string
  /** RUC u otro identificador fiscal. */
  taxIdentifier: string
  /** Código ISO 4217 por defecto de las sedes nuevas. */
  currency: string
  /** Zona horaria IANA por defecto de las sedes nuevas. */
  timezone: string
  status: RestaurantOperationalStatus
}

/** Cómo puede pedir el comensal en esta sede y condiciones del delivery. */
export interface SiteFulfillment {
  dineIn: boolean
  /** Pedido anticipado: lo deja listo para cuando llegue (comer allí o para llevar). */
  pickup: boolean
  delivery: boolean
  /** El API no maneja radio de reparto: siempre 0 (sin límite informado). */
  deliveryRadiusKm: number
  deliveryFee: number
  /** Importe mínimo del pedido para delivery. 0 = sin mínimo. */
  minOrder: number
}

export interface RestaurantSite {
  id: string
  /** Organización dueña; null en los datos públicos (vista del comensal). */
  organizationId: string | null
  /** Código interno de la sede; vacío en los datos públicos. */
  code: string
  /** Identificador legible para la URL pública de la sede (/sabores-miraflores/menu). */
  slug: string
  name: string
  /** Descripción libre de la sede (tipo de cocina, propuesta…). */
  description: string
  /** Alias de `description` que usan las vistas del comensal. */
  cuisine: string
  /** El API no tiene ciudad: se toma el último tramo de la dirección ("Av. Larco 123, Miraflores"). */
  city: string
  address: string
  phone: string
  email: string
  /** El API no guarda imagen de la sede: vacío (las vistas muestran un respaldo). */
  imageUrl: string
  status: RestaurantOperationalStatus
  statusLabel: string
  /** Código ISO 4217 (PEN, USD…). */
  currency: string
  /** Zona horaria IANA (America/Lima…). */
  timezone: string
  /** Ubicación para el mapa del comensal; sin coordenadas la sede no aparece en el mapa. */
  lat?: number
  lng?: number
  fulfillment: SiteFulfillment
}

/** Cifras de hoy de una sede (GET /reports/restaurants-overview). */
export interface RestaurantOverview {
  restaurantId: string
  businessDate: string
  activeAttentions: number
  netSales: number
  profit: number
  averageTicket: number
  closedAttentions: number
}

/** Estado de sala visible en el plano. */
export type TableFloorStatus = 'occupied' | 'available' | 'reserved' | 'cleaning'

/** Estado operativo de la mesa: solo una mesa `active` puede abrir una atención. */
export type TableStatus = 'active' | 'inactive' | 'maintenance'

/** Estado de servicio que fija el personal (la ocupación la calcula el API con las atenciones). */
export type TableServiceStatus = 'available' | 'reserved' | 'cleaning'

/** Piso o planta de una sede (planta baja, primer piso, terraza…). */
export interface SiteFloor {
  id: string
  name: string
  sortOrder: number
}

/** Atención activa de una mesa, según el plano del salón. */
export interface TableAttentionSummary {
  id: string
  attentionNumber: string
  billRequested: boolean
  openedAt: string
  total: number
  paid: number
  balance: number
}

export interface LiveTable {
  id: string
  /** Número visible ("12"): el nombre del API sin el prefijo "Mesa ". */
  number: string
  /** Nombre completo en el API ("Mesa 12"). */
  name: string
  /** Piso donde está la mesa (id de SiteFloor). */
  floorId: string
  code: string
  status: TableStatus
  serviceStatus: TableServiceStatus
  /** Capacidad (sillas); 0 si no está informada. */
  seats: number
  /** Sillas ocupadas: toda la capacidad si la mesa tiene una atención activa. */
  occupiedSeats: number
  floorStatus: TableFloorStatus
  /** Hay un QR vigente para la mesa. */
  qrActive: boolean
  /** Versión del QR vigente (aumenta en cada regeneración). */
  qrVersion: number | null
  positionX: number | null
  positionY: number | null
  /** Atención activa (solo en el plano del salón). */
  attention: TableAttentionSummary | null
}

/** Indicadores del plano del salón. */
export interface FloorPlanKpis {
  tables: number
  availableTables: number
  occupiedTables: number
  occupiedCapacity: number
  activeAttentions: number
  billRequested: number
  balance: number
}

/** Plano del salón de una sede (GET /floor-plan). */
export interface SiteOperation {
  restaurantId: string
  /** Pisos activos de la sede, en orden. */
  floors: SiteFloor[]
  tables: LiveTable[]
  kpis: FloorPlanKpis
}

/** QR recién generado: el token solo llega en esa respuesta. */
export interface GeneratedTableQr {
  table: LiveTable
  token: string
  /** URL que se codifica en la imagen del QR. */
  url: string
}
