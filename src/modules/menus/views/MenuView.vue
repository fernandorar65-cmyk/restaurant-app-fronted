<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import SkeletonBlock from '@/components/base/SkeletonBlock.vue'
import DinerNotice from '@/components/feedback/DinerNotice.vue'
import type { DinerNoticeKind } from '@/components/feedback/DinerNotice.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { fetchCustomerMenu } from '@/modules/menus/api'
import MenuProductCard from '@/modules/menus/components/MenuProductCard.vue'
import MenuProductDetailDialog from '@/modules/menus/components/MenuProductDetailDialog.vue'
import type { MenuCategory, MenuProduct } from '@/modules/menus/types'
import { fetchRestaurantById, isRestaurantOpen } from '@/modules/restaurants/api'
import { useCartStore } from '@/stores/cart'
import { useDinerStore } from '@/stores/diner'
import { formatMoney } from '@/utils/money'

usePageTitle('Menú')

const diner = useDinerStore()
const cart = useCartStore()

const categories = ref<MenuCategory[]>([])
const products = ref<MenuProduct[]>([])
const notice = ref<DinerNoticeKind | null>(null)
const isLoading = ref(true)
const activeCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const detailProduct = ref<MenuProduct | null>(null)

/** Solo se puede pedir con una mesa confirmada (entrada por QR). */
const canOrder = computed(() => diner.isReadyToOrder)

const productsByCategory = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

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

        return product.name.toLowerCase().includes(query) || product.description.toLowerCase().includes(query)
      }),
    }))
    .filter((group) => group.items.length > 0 || !searchQuery.value.trim())
})

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
  const restaurantId = diner.restaurantId
  isLoading.value = true
  notice.value = null
  categories.value = []
  products.value = []

  if (!restaurantId) {
    isLoading.value = false
    return
  }

  cart.ensureRestaurant(restaurantId)

  try {
    const [site, menu] = await Promise.all([fetchRestaurantById(restaurantId), fetchCustomerMenu(restaurantId)])

    if (!site || !isRestaurantOpen(site)) {
      notice.value = 'restaurant-closed'
      return
    }

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

watch(() => diner.restaurantId, () => void loadMenu())

onMounted(() => {
  void loadMenu()
})
</script>

<template>
  <div class="space-y-5 pb-24">
    <DinerNotice v-if="!diner.restaurantId" kind="no-table">
      <RouterLink
        class="font-label rounded-xl bg-surface-container px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high"
        :to="{ name: 'home' }"
      >
        Ver cartas de las sedes
      </RouterLink>
    </DinerNotice>

    <SkeletonBlock v-else-if="isLoading" variant="list" :rows="5" />

    <DinerNotice v-else-if="notice" :kind="notice" @retry="loadMenu" />

    <template v-else>
      <div
        v-if="!canOrder"
        class="flex items-start gap-3 rounded-2xl bg-primary-fixed px-4 py-3 text-on-primary-fixed"
        role="note"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z"
          />
        </svg>
        <p class="text-sm"><strong>Estás viendo la carta.</strong> Para pedir, escanea el código QR de tu mesa.</p>
      </div>

      <label class="block">
        <span class="sr-only">Buscar producto</span>
        <input
          v-model="searchQuery"
          class="min-h-12 w-full rounded-2xl bg-surface-container-lowest px-4 text-base text-on-surface shadow-sm outline-none ring-1 ring-outline-variant/40 placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary"
          placeholder="Buscar en la carta…"
          type="search"
        />
      </label>

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
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
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
        <div>
          <h2 class="font-headline text-xl font-semibold text-on-surface">{{ group.category.name }}</h2>
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
            :currency="diner.currency"
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
        :currency="diner.currency"
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
        <span>{{ formatMoney(cart.subtotal, diner.currency) }}</span>
      </RouterLink>
    </template>
  </div>
</template>
