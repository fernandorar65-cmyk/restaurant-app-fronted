<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import SitePageHeader from '@/components/base/SitePageHeader.vue'

import { usePageTitle } from '@/composables/usePageTitle'
import {
  createMenu,
  createMenuCategory,
  createMenuProduct,
  deleteMenuCategory,
  deleteMenuProduct,
  fetchMenuCategories,
  fetchMenuProducts,
  fetchMenus,
  patchMenuProduct,
  reorderMenuCategories,
  reorderMenuProducts,
  updateMenuCategory,
  updateMenuProduct,
  updateMenuStatus,
} from '@/modules/menus/api'
import MenuCategoryDialog from '@/modules/menus/components/MenuCategoryDialog.vue'
import MenuPreviewDialog from '@/modules/menus/components/MenuPreviewDialog.vue'
import MenuProductDialog from '@/modules/menus/components/MenuProductDialog.vue'
import type { Menu, MenuCategory, MenuProduct, MenuProductDraft, MenuStatus } from '@/modules/menus/types'
import { fetchRestaurantById } from '@/modules/restaurants/api'
import type { RestaurantSite } from '@/modules/restaurants/types'
import { HttpError } from '@/services/http'
import { useSessionStore } from '@/stores/session'
import { formatMoney } from '@/utils/money'

usePageTitle('Gestión de menú')

const MENU_STATUS_LABELS: Record<MenuStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  inactive: 'Inactivo',
}

const route = useRoute()
const session = useSessionStore()

const restaurant = ref<RestaurantSite | null>(null)
const menus = ref<Menu[]>([])
const selectedMenuId = ref<string | null>(null)
const categories = ref<MenuCategory[]>([])
const products = ref<MenuProduct[]>([])
const loadError = ref<string | null>(null)
const isLoading = ref(true)
const activeCategoryId = ref<string | null>(null)
const newMenuName = ref('')

const editingCategory = ref<MenuCategory | null>(null)
const isCategoryDialogOpen = ref(false)
const editingProduct = ref<MenuProduct | null>(null)
const isProductDialogOpen = ref(false)
const isPreviewOpen = ref(false)

const currency = computed(() => restaurant.value?.currency ?? 'EUR')
const selectedMenu = computed(() => menus.value.find((menu) => menu.id === selectedMenuId.value) ?? null)
const hasActiveMenu = computed(() => menus.value.some((menu) => menu.status === 'active'))

const restaurantId = computed(() => {
  const value = route.params.restaurantId
  return typeof value === 'string' ? value : null
})

const visibleCategories = computed(() => {
  return categories.value.filter((category) => category.menuId === selectedMenuId.value)
})

const visibleProducts = computed(() => {
  const categoryIds = new Set(visibleCategories.value.map((category) => category.id))
  const menuProducts = products.value.filter((product) => categoryIds.has(product.categoryId))

  if (!activeCategoryId.value) {
    return menuProducts
  }

  return menuProducts.filter((product) => product.categoryId === activeCategoryId.value)
})

function categoryName(categoryId: string): string {
  return categories.value.find((category) => category.id === categoryId)?.name ?? 'Sin categoría'
}

async function loadMenu(): Promise<void> {
  const id = restaurantId.value
  isLoading.value = true
  loadError.value = null

  if (!id) {
    loadError.value = 'No se indicó una sede.'
    isLoading.value = false
    return
  }

  session.setRestaurant(id)

  try {
    const [site, menuList, categoryList, productList] = await Promise.all([
      fetchRestaurantById(id),
      fetchMenus(id),
      fetchMenuCategories(id),
      fetchMenuProducts(id),
    ])
    restaurant.value = site
    menus.value = menuList
    categories.value = categoryList
    products.value = productList
    selectedMenuId.value = menuList.find((menu) => menu.status === 'active')?.id ?? menuList[0]?.id ?? null

    if (!site) {
      loadError.value = 'La sede no existe.'
    }
  } catch (error) {
    loadError.value = error instanceof HttpError ? error.message : 'No se pudo cargar el menú.'
  } finally {
    isLoading.value = false
  }
}

async function createMenuHandler(): Promise<void> {
  const id = restaurantId.value
  if (!id || !newMenuName.value.trim()) {
    return
  }

  const created = await createMenu(id, newMenuName.value.trim())
  menus.value = [...menus.value, created]
  selectedMenuId.value = created.id
  newMenuName.value = ''
}

async function changeMenuStatus(menu: Menu, status: MenuStatus): Promise<void> {
  const changed = await updateMenuStatus(menu, status)
  menus.value = menus.value.map((item) => changed.find((updated) => updated.id === item.id) ?? item)
}

/** Cambio rápido desde la tarjeta, sin abrir el formulario. */
async function toggleProductFlag(product: MenuProduct, flag: 'isAvailable' | 'isActive'): Promise<void> {
  try {
    const updated = await patchMenuProduct(product.id, { [flag]: !product[flag] })
    products.value = products.value.map((item) => (item.id === updated.id ? updated : item))
  } catch {
    loadError.value = 'No se pudo actualizar el producto.'
  }
}

async function moveCategory(category: MenuCategory, delta: -1 | 1): Promise<void> {
  const ordered = [...visibleCategories.value]
  const index = ordered.findIndex((item) => item.id === category.id)
  const target = index + delta

  if (index < 0 || target < 0 || target >= ordered.length) {
    return
  }

  ;[ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!]
  const updated = await reorderMenuCategories(ordered)
  categories.value = categories.value
    .map((item) => updated.find((changed) => changed.id === item.id) ?? item)
    .sort((a, b) => a.position - b.position)
}

async function moveProduct(product: MenuProduct, delta: -1 | 1): Promise<void> {
  const ordered = products.value.filter((item) => item.categoryId === product.categoryId)
  const index = ordered.findIndex((item) => item.id === product.id)
  const target = index + delta

  if (index < 0 || target < 0 || target >= ordered.length) {
    return
  }

  ;[ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!]
  const updated = await reorderMenuProducts(ordered)
  products.value = products.value
    .map((item) => updated.find((changed) => changed.id === item.id) ?? item)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

function openNewCategory(): void {
  editingCategory.value = null
  isCategoryDialogOpen.value = true
}

function openEditCategory(category: MenuCategory): void {
  editingCategory.value = category
  isCategoryDialogOpen.value = true
}

async function saveCategory(draft: { name: string; description: string }): Promise<void> {
  const id = restaurantId.value
  const menuId = selectedMenuId.value
  if (!id || !menuId) {
    return
  }

  if (editingCategory.value) {
    const updated = await updateMenuCategory(editingCategory.value.id, draft)
    categories.value = categories.value.map((category) => (category.id === updated.id ? updated : category))
  } else {
    const created = await createMenuCategory(id, menuId, draft, visibleCategories.value.length + 1)
    categories.value = [...categories.value, created]
  }

  isCategoryDialogOpen.value = false
}

async function removeCategory(category: MenuCategory): Promise<void> {
  const hasProducts = products.value.some((product) => product.categoryId === category.id)

  if (hasProducts) {
    loadError.value = `No se puede eliminar "${category.name}" porque tiene productos asociados.`
    return
  }

  await deleteMenuCategory(category.id)
  categories.value = categories.value.filter((item) => item.id !== category.id)

  if (activeCategoryId.value === category.id) {
    activeCategoryId.value = null
  }
}

function openNewProduct(): void {
  editingProduct.value = null
  isProductDialogOpen.value = true
}

function openEditProduct(product: MenuProduct): void {
  editingProduct.value = product
  isProductDialogOpen.value = true
}

async function saveProduct(draft: MenuProductDraft): Promise<void> {
  const id = restaurantId.value
  if (!id) {
    return
  }

  if (editingProduct.value) {
    const updated = await updateMenuProduct(editingProduct.value.id, draft)
    products.value = products.value.map((product) => (product.id === updated.id ? updated : product))
  } else {
    const position = products.value.filter((product) => product.categoryId === draft.categoryId).length + 1
    const created = await createMenuProduct(id, draft, position)
    products.value = [...products.value, created]
  }

  isProductDialogOpen.value = false
}

async function removeProduct(product: MenuProduct): Promise<void> {
  if (!window.confirm(`¿Eliminar "${product.name}"? Si solo quieres ocultarlo, desactívalo.`)) {
    return
  }

  await deleteMenuProduct(product.id)
  products.value = products.value.filter((item) => item.id !== product.id)
}

watch(restaurantId, () => void loadMenu(), { immediate: true })
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6 px-6 py-8 lg:px-12">
    <p v-if="isLoading" class="text-sm text-on-surface-variant">Cargando menú…</p>
    <p
      v-else-if="loadError && !restaurant"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant">
      <SitePageHeader
        :restaurant="restaurant"
        section="Menú"
        title="Gestión de menú"
        :description="`Organiza menús, categorías y productos de la carta de ${restaurant.name}.`"
      >
        <template #actions>
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            :disabled="!selectedMenu"
            @click="isPreviewOpen = true"
          >
            Vista previa
          </button>
          <button
            type="button"
            class="font-label rounded-xl bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
            @click="openNewCategory"
          >
            + Categoría
          </button>
          <button
            type="button"
            class="font-label rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary-container"
            @click="openNewProduct"
          >
            + Producto
          </button>
        </template>
      </SitePageHeader>

      <p v-if="!hasActiveMenu" class="rounded-lg bg-tertiary-fixed px-3 py-2 text-sm text-on-tertiary-container" role="alert">
        Esta sede no tiene ningún menú activo: los comensales verán la carta vacía.
      </p>

      <p
        v-if="loadError"
        class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
        role="alert"
      >
        {{ loadError }}
      </p>

      <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-sm sm:flex-row sm:items-center">
        <label class="flex items-center gap-2">
          <span class="font-label text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Menú</span>
          <select
            v-model="selectedMenuId"
            class="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          >
            <option v-for="menu in menus" :key="menu.id" :value="menu.id">
              {{ menu.name }} ({{ MENU_STATUS_LABELS[menu.status] }})
            </option>
          </select>
        </label>
        <select
          v-if="selectedMenuId"
          class="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent focus:ring-primary"
          :value="menus.find((menu) => menu.id === selectedMenuId)?.status"
          @change="
            changeMenuStatus(
              menus.find((menu) => menu.id === selectedMenuId)!,
              ($event.target as HTMLSelectElement).value as MenuStatus,
            )
          "
        >
          <option v-for="(label, key) in MENU_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <form class="flex items-center gap-2 sm:ml-auto" @submit.prevent="createMenuHandler">
          <input
            v-model="newMenuName"
            class="w-full rounded-lg bg-surface px-3 py-2 text-sm text-on-surface shadow-inner outline-none ring-1 ring-transparent placeholder:text-on-surface-variant/60 focus:ring-primary sm:w-56"
            placeholder="Nombre del nuevo menú..."
            type="text"
          />
          <button
            type="submit"
            class="font-label shrink-0 rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
          >
            + Menú
          </button>
        </form>
      </div>
      <p class="text-xs text-on-surface-variant">
        El comensal solo ve el menú <strong>Activo</strong> (uno por sede: al activar otro, el anterior pasa a inactivo).
      </p>

      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
        <button
          type="button"
          class="font-label rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase"
          :class="
            activeCategoryId === null
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          "
          @click="activeCategoryId = null"
        >
          Todas ({{ visibleProducts.length }})
        </button>
        <div v-for="category in visibleCategories" :key="category.id" class="flex items-center gap-1">
          <button
            type="button"
            class="font-label rounded-lg px-2.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase"
            :class="
              activeCategoryId === category.id
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            "
            @click="activeCategoryId = category.id"
          >
            {{ category.name }} ({{ products.filter((product) => product.categoryId === category.id).length }})
          </button>
          <button
            type="button"
            class="rounded-lg px-1 py-1 text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Mover antes"
            :aria-label="`Mover ${category.name} antes`"
            @click="moveCategory(category, -1)"
          >
            ←
          </button>
          <button
            type="button"
            class="rounded-lg px-1 py-1 text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Mover después"
            :aria-label="`Mover ${category.name} después`"
            @click="moveCategory(category, 1)"
          >
            →
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Editar categoría"
            @click="openEditCategory(category)"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="rounded-lg p-1.5 text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
            title="Eliminar categoría"
            @click="removeCategory(category)"
          >
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="product in visibleProducts"
          :key="product.id"
          class="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm"
          :class="{ 'opacity-60': !product.isActive }"
        >
          <img :src="product.imageUrl" :alt="product.name" class="h-28 w-full rounded-xl object-cover" loading="lazy" />
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-label text-[10px] font-semibold tracking-wide text-tertiary uppercase">
                {{ categoryName(product.categoryId) }}
              </p>
              <h3 class="font-headline text-sm font-semibold text-on-surface">{{ product.name }}</h3>
            </div>
            <span class="font-label shrink-0 text-sm font-bold text-primary">{{ formatMoney(product.price, currency) }}</span>
          </div>
          <p class="line-clamp-2 text-xs text-on-surface-variant">{{ product.description }}</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in product.tags"
              :key="tag"
              class="font-label rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
            >
              {{ tag }}
            </span>
            <span
              v-if="!product.isActive"
              class="font-label rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant uppercase"
            >
              Oculto
            </span>
            <span
              v-else-if="!product.isAvailable"
              class="font-label rounded bg-error-container px-1.5 py-0.5 text-[10px] font-semibold text-on-error-container uppercase"
            >
              Agotado
            </span>
          </div>
          <div class="flex flex-wrap gap-3 text-xs">
            <label class="flex items-center gap-1.5">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="product.isActive"
                @change="toggleProductFlag(product, 'isActive')"
              />
              Activo
            </label>
            <label class="flex items-center gap-1.5">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="product.isAvailable"
                @change="toggleProductFlag(product, 'isAvailable')"
              />
              Disponible
            </label>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-outline-variant/50 pt-3">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container"
              :aria-label="`Subir ${product.name}`"
              title="Subir en la categoría"
              @click="moveProduct(product, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="mr-auto rounded-lg px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container"
              :aria-label="`Bajar ${product.name}`"
              title="Bajar en la categoría"
              @click="moveProduct(product, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-surface-container px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:bg-surface-container-high"
              @click="openEditProduct(product)"
            >
              Editar
            </button>
            <button
              type="button"
              class="font-label rounded-lg bg-error-container px-3 py-1.5 text-[11px] font-semibold text-on-error-container hover:bg-error/20"
              @click="removeProduct(product)"
            >
              Eliminar
            </button>
          </div>
        </article>
        <p v-if="visibleProducts.length === 0" class="text-sm text-on-surface-variant">No hay productos en esta categoría.</p>
      </div>

      <MenuCategoryDialog
        v-if="isCategoryDialogOpen"
        :category="editingCategory"
        @close="isCategoryDialogOpen = false"
        @save="saveCategory"
      />
      <MenuProductDialog
        v-if="isProductDialogOpen"
        :categories="visibleCategories"
        :default-category-id="activeCategoryId"
        :product="editingProduct"
        :currency="currency"
        @close="isProductDialogOpen = false"
        @save="saveProduct"
      />
      <MenuPreviewDialog
        v-if="isPreviewOpen && selectedMenu"
        :menu-name="`${selectedMenu.name} (${MENU_STATUS_LABELS[selectedMenu.status]})`"
        :categories="visibleCategories"
        :products="products"
        :currency="currency"
        @close="isPreviewOpen = false"
      />
    </template>
  </div>
</template>
