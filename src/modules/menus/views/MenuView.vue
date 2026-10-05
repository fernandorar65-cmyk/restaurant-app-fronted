<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

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

function scrollToCategory(categoryId: string): void {
  activeCategoryId.value = categoryId
  document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

    <p v-else-if="isLoading" class="text-sm text-on-surface-variant">Cargando menú…</p>

    <DinerNotice v-else-if="notice" :kind="notice" @retry="loadMenu" />

    <template v-else>
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
        :class="canOrder ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface'"
      >
        <div>
          <p class="font-label text-[10px] font-bold tracking-widest uppercase opacity-80">{{ diner.restaurantName }}</p>
          <p class="font-headline text-base font-semibold">
            {{ canOrder ? `Mesa ${diner.tableNumber}` : 'Solo consulta' }}
          </p>
          <p v-if="!canOrder" class="text-xs text-on-surface-variant">Escanea el QR de tu mesa para hacer un pedido.</p>
        </div>
        <RouterLink
          v-if="canOrder && diner.attentionId"
          class="font-label rounded-xl bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface shadow-sm"
          :to="{ name: 'order-status', params: { attentionId: diner.attentionId } }"
        >
          Mi pedido
        </RouterLink>
      </div>

      <label class="block">
        <span class="sr-only">Buscar producto</span>
        <input
          v-model="searchQuery"
          class="w-full rounded-xl bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface shadow-sm outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary"
          placeholder="Buscar un producto..."
          type="search"
        />
      </label>

      <div class="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur-sm">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="font-label shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors"
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
        class="space-y-3 scroll-mt-16"
      >
        <div>
          <h2 class="font-headline text-lg font-semibold text-on-surface">{{ group.category.name }}</h2>
          <p v-if="group.category.description" class="text-xs text-on-surface-variant">
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
        class="font-label fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-md items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-lg"
        :to="{ name: 'cart' }"
      >
        <span>{{ cart.itemCount }} {{ cart.itemCount === 1 ? 'producto' : 'productos' }}</span>
        <span>Ver carrito · {{ formatMoney(cart.subtotal, diner.currency) }}</span>
      </RouterLink>
    </template>
  </div>
</template>
