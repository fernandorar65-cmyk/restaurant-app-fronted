<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import DinerNotice from '@/components/feedback/DinerNotice.vue'
import type { DinerNoticeKind } from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchCustomerMenu } from '@/modules/menus/api'
import MenuProductCard from '@/modules/menus/components/MenuProductCard.vue'
import MenuProductDetailDialog from '@/modules/menus/components/MenuProductDetailDialog.vue'
import MenuSearch from '@/modules/menus/components/MenuSearch.vue'
import type { MenuCategory, MenuProduct } from '@/modules/menus/types'
import { fetchRestaurantBySlug, isRestaurantOpen } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'
import { normalizeSearch } from '@/utils/string'

usePageTitle('Menú')

const route = useRoute()
const diner = useDinerStore()
const cart = useCartStore()

/** Sede de la URL (/:restaurantSlug/menu). */
const site = ref<RestaurantSite | null>(null)
const currency = computed(() => site.value?.currency ?? diner.currency)

const categories = ref<MenuCategory[]>([])
const products = ref<MenuProduct[]>([])
const notice = ref<DinerNoticeKind | null>(null)
const isLoading = ref(true)
const activeCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const detailProduct = ref<MenuProduct | null>(null)

/**
 * Se puede agregar a la orden en la sede actual del comensal, tenga mesa o no.
 * Si tiene mesa en otra sede, esta carta es solo de consulta para no mezclar carritos.
 */
const canOrder = computed(() => site.value !== null && diner.restaurantId === site.value.id)

/** Tiene mesa en otra sede y está mirando esta carta: se muestra sin tocar su mesa. */
const tableElsewhere = computed(() => diner.isReadyToOrder && site.value !== null && diner.restaurantId !== site.value.id)

const productsByCategory = computed(() => {
  const query = normalizeSearch(searchQuery.value)

  return categories.value
    .map((category) => ({
      category,
      items: products.value.filter((product) => {
        if (product.categoryId !== category.id) {
          return false
        }

        if (!query) {
          return true
        }

        return normalizeSearch(`${product.name} ${product.description}`).includes(query)
      }),
    }))
    .filter((group) => group.items.length > 0 || !searchQuery.value.trim())
})

/** Producto elegido en el buscador: se abre su detalle con los datos ya cargados de la carta. */
function openProduct(product: MenuProduct): void {
  detailProduct.value = products.value.find((item) => item.id === product.id) ?? product
}

function cartQuantity(productId: string): number {
  return cart.items.find((item) => item.productId === productId)?.quantity ?? 0
}

function increase(product: MenuProduct): void {
  if (canOrder.value && product.isAvailable) {
    cart.addItem({ productId: product.id, name: product.name, price: product.price }, 1)
  }
}

function decrease(product: MenuProduct): void {
  cart.setQuantity(product.id, cartQuantity(product.id) - 1)
}

async function loadMenu(): Promise<void> {
  const slug = String(route.params.restaurantSlug ?? '')
  isLoading.value = true
  notice.value = null
  site.value = null
  categories.value = []
  products.value = []

  try {
    const found = await fetchRestaurantBySlug(slug)

    if (!found) {
      notice.value = 'restaurant-not-found'
      return
    }

    if (!isRestaurantOpen(found)) {
      notice.value = 'restaurant-closed'
      return
    }

    site.value = found

    /* Sin mesa activa, abrir la carta de una sede la convierte en la sede actual (modo consulta). */
    if (!diner.isReadyToOrder && diner.restaurantId !== found.id) {
      diner.browse({ restaurantId: found.id, restaurantSlug: found.slug, restaurantName: found.name, currency: found.currency })
    }

    if (diner.restaurantId === found.id) {
      cart.ensureRestaurant(found.id)
    }

    const menu = await fetchCustomerMenu(found.id)

    if (menu.products.length === 0) {
      notice.value = 'empty-menu'
      return
    }

    categories.value = menu.categories.filter((category) =>
      menu.products.some((product) => product.categoryId === category.id),
    )
    products.value = menu.products
    activeCategoryId.value = categories.value[0]?.id ?? null
  } catch {
    notice.value = 'connection'
  } finally {
    isLoading.value = false
  }
}

const tabsEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let isProgrammaticScroll = false

function revealActiveTab(): void {
  tabsEl.value
    ?.querySelector<HTMLElement>(`[data-category="${activeCategoryId.value}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

function scrollToCategory(categoryId: string): void {
  activeCategoryId.value = categoryId
  isProgrammaticScroll = true
  document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  revealActiveTab()
  window.setTimeout(() => {
    isProgrammaticScroll = false
  }, 700)
}

/** La pestaña activa sigue a la categoría que se está viendo al hacer scroll. */
async function observeSections(): Promise<void> {
  observer?.disconnect()
  await nextTick()

  observer = new IntersectionObserver(
    (entries) => {
      if (isProgrammaticScroll) {
        return
      }

      const visible = entries.filter((entry) => entry.isIntersecting)
      const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const id = top?.target.id.replace('category-', '')

      if (id && id !== activeCategoryId.value) {
        activeCategoryId.value = id
        revealActiveTab()
      }
    },
    { rootMargin: '-140px 0px -55% 0px' },
  )

  document.querySelectorAll('section[id^="category-"]').forEach((section) => observer?.observe(section))
}

watch(productsByCategory, () => void observeSections())

onUnmounted(() => observer?.disconnect())

watch(() => route.params.restaurantSlug, () => void loadMenu())

onMounted(() => {
  void loadMenu()
})
</script>

<template>
  <div class="space-y-5 pb-24">
    <SkeletonBlock v-if="isLoading" variant="list" :rows="5" />

    <DinerNotice v-else-if="notice" :kind="notice" @retry="loadMenu">
      <RouterLink
        v-if="notice !== 'connection'"
        class="font-label rounded-xl bg-surface-container px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        :to="{ name: 'home' }"
      >
        Ver otras sedes
      </RouterLink>
    </DinerNotice>

    <template v-else>
      <header v-if="site" class="space-y-1 pt-1">
        <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">{{ site.cuisine }}</p>
        <h1 class="font-headline text-3xl font-semibold tracking-tight text-on-surface">La carta</h1>
        <p class="flex items-center gap-1.5 text-sm text-on-surface-variant">
          <svg class="h-4 w-4 shrink-0 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span class="truncate">{{ site.address }}</span>
        </p>
      </header>

      <div
        v-if="tableElsewhere"
        class="flex items-center gap-3 rounded-2xl bg-surface-container-low px-4 py-3 text-on-surface-variant ring-1 ring-outline-variant/40"
        role="note"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed" aria-hidden="true">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z"
          />
        </svg>
        </span>
        <p class="text-sm">
          <strong class="text-on-surface">Estás viendo la carta de {{ site?.name }}.</strong> Tu mesa está en {{ diner.restaurantName }}.
          <RouterLink class="font-semibold underline underline-offset-2" :to="diner.menuRoute">Volver a tu mesa</RouterLink>
        </p>
      </div>

      <MenuSearch
        v-if="site"
        v-model="searchQuery"
        :restaurant-id="site.id"
        :categories="categories"
        :products="products"
        :currency="currency"
        @select-product="openProduct"
        @select-category="scrollToCategory"
      />

      <div
        ref="tabsEl"
        class="sticky top-14 z-20 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur-sm [scrollbar-width:none]"
        role="tablist"
        aria-label="Categorías de la carta"
      >
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          role="tab"
          :data-category="category.id"
          :aria-selected="activeCategoryId === category.id"
          class="font-label min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors"
          :class="
            activeCategoryId === category.id
              ? 'bg-on-surface text-surface'
              : 'bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant/60 hover:bg-surface-container-low'
          "
          @click="scrollToCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>

      <section
        v-for="group in productsByCategory"
        :id="`category-${group.category.id}`"
        :key="group.category.id"
        class="scroll-mt-32 space-y-3"
      >
        <div class="border-b border-outline-variant/50 pb-2">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="font-headline text-xl font-semibold text-on-surface">{{ group.category.name }}</h2>
            <span class="font-label shrink-0 text-xs text-outline">
              {{ group.items.length }} {{ group.items.length === 1 ? 'opción' : 'opciones' }}
            </span>
          </div>
          <p v-if="group.category.description" class="text-sm text-on-surface-variant">
            {{ group.category.description }}
          </p>
        </div>
        <div class="space-y-3">
          <MenuProductCard
            v-for="product in group.items"
            :key="product.id"
            :product="product"
            :quantity="cartQuantity(product.id)"
            :currency="currency"
            :orderable="canOrder"
            @increase="increase(product)"
            @decrease="decrease(product)"
            @detail="detailProduct = product"
          />
        </div>
      </section>
      <p v-if="productsByCategory.every((group) => group.items.length === 0)" class="text-center text-sm text-on-surface-variant">
        No encontramos productos con esa búsqueda.
      </p>

      <MenuProductDetailDialog
        v-if="detailProduct"
        :key="detailProduct.id"
        :product="detailProduct"
        :quantity="cartQuantity(detailProduct.id)"
        :currency="currency"
        :orderable="canOrder"
        @close="detailProduct = null"
        @increase="increase(detailProduct)"
        @decrease="decrease(detailProduct)"
      />

      <RouterLink
        v-if="canOrder && cart.itemCount > 0"
        class="font-label fixed inset-x-4 bottom-20 z-20 mx-auto flex min-h-14 max-w-md items-center justify-between rounded-2xl bg-primary px-5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-container"
        :to="{ name: 'cart' }"
      >
        <span class="flex items-center gap-2">
          <span class="flex h-7 min-w-7 items-center justify-center rounded-full bg-on-primary/20 px-2 text-sm">{{ cart.itemCount }}</span>
          Ver carrito
        </span>
        <span>{{ formatMoney(cart.subtotal, currency) }}</span>
      </RouterLink>
    </template>
  </div>
</template>
