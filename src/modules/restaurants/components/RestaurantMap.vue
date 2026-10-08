<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { RestaurantSite } from '@/modules/restaurants/types'

export interface MapPoint {
  lat: number
  lng: number
}

const props = defineProps<{
  restaurants: RestaurantSite[]
  selectedId: string | null
  userLocation: MapPoint | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const container = ref<HTMLElement | null>(null)

let map: L.Map | null = null
let markersLayer: L.LayerGroup | null = null
let userMarker: L.Marker | null = null

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

/* Pin con el nombre de la sede; el seleccionado se destaca en color primario. */
function restaurantIcon(site: RestaurantSite, isSelected: boolean): L.DivIcon {
  const tone = isSelected
    ? 'bg-primary text-on-primary ring-4 ring-primary/25 scale-110'
    : 'bg-surface-container-lowest text-on-surface ring-1 ring-outline-variant'

  return L.divIcon({
    className: '',
    iconSize: [0, 0],
    html: `
      <div class="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center transition-transform ${isSelected ? 'z-10' : ''}">
        <span class="font-label flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold shadow-md transition ${tone}">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12" />
          </svg>
          ${escapeHtml(site.name)}
        </span>
        <span class="-mt-1 h-2.5 w-2.5 rotate-45 shadow-md ${isSelected ? 'bg-primary' : 'bg-surface-container-lowest'}"></span>
      </div>`,
  })
}

const userIcon = L.divIcon({
  className: '',
  iconSize: [0, 0],
  html: `
    <span class="absolute -left-2.5 -top-2.5 flex h-5 w-5">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40"></span>
      <span class="relative inline-flex h-5 w-5 rounded-full border-[3px] border-white bg-primary shadow-md"></span>
    </span>`,
})

function locatedRestaurants(): Array<RestaurantSite & MapPoint> {
  return props.restaurants.filter(
    (site): site is RestaurantSite & MapPoint => typeof site.lat === 'number' && typeof site.lng === 'number',
  )
}

function renderMarkers(): void {
  if (!map || !markersLayer) {
    return
  }

  markersLayer.clearLayers()

  for (const site of locatedRestaurants()) {
    const isSelected = site.id === props.selectedId
    L.marker([site.lat, site.lng], {
      icon: restaurantIcon(site, isSelected),
      title: site.name,
      keyboard: true,
      zIndexOffset: isSelected ? 1000 : 0,
    })
      .on('click', () => emit('select', site.id))
      .addTo(markersLayer)
  }
}

function renderUser(): void {
  if (!map) {
    return
  }

  userMarker?.remove()
  userMarker = props.userLocation
    ? L.marker([props.userLocation.lat, props.userLocation.lng], { icon: userIcon, interactive: false }).addTo(map)
    : null
}

/** Encuadra todas las sedes (y al comensal, si compartió su ubicación). */
function fitAll(): void {
  if (!map) {
    return
  }

  const points: L.LatLngExpression[] = locatedRestaurants().map((site) => [site.lat, site.lng])

  if (props.userLocation) {
    points.push([props.userLocation.lat, props.userLocation.lng])
  }

  if (points.length === 1) {
    map.setView(points[0]!, 14)
  } else if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [70, 80], paddingBottomRight: [70, 40], maxZoom: 14 })
  }
}

function flyToSelected(): void {
  const site = locatedRestaurants().find((item) => item.id === props.selectedId)

  if (map && site) {
    map.flyTo([site.lat, site.lng], Math.max(map.getZoom(), 13), { duration: 0.8 })
  }
}

onMounted(() => {
  if (!container.value) {
    return
  }

  map = L.map(container.value, { zoomControl: false, attributionControl: true, zoomSnap: 0.25 }).setView([40.4168, -3.7038], 6)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
  renderMarkers()
  renderUser()
  fitAll()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

watch(
  () => props.restaurants,
  () => {
    renderMarkers()
    fitAll()
  },
)

watch(
  () => props.selectedId,
  () => {
    renderMarkers()
    flyToSelected()
  },
)

watch(
  () => props.userLocation,
  () => {
    renderUser()
    fitAll()
  },
)

defineExpose({ fitAll })
</script>

<template>
  <!-- isolate: los paneles de Leaflet usan z-index altos y no deben tapar la barra superior. -->
  <div ref="container" class="isolate h-full w-full bg-surface-container" role="application" aria-label="Mapa de restaurantes" />
</template>
