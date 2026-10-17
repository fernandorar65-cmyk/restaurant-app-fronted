<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import BasePagination from "@/components/base/BasePagination.vue";
import StatusBadge from "@/components/base/StatusBadge.vue";
import SkeletonBlock from "@/components/base/SkeletonBlock.vue";
import SitePageHeader from "@/components/base/SitePageHeader.vue";
import { useNow } from "@/composables/useNow";
import { usePageTitle } from "@/composables/usePageTitle";
import { useSiteContext } from "@/composables/useSiteContext";
import ExpensesPanel from "@/modules/expenses/components/ExpensesPanel.vue";
import {
  errorMessage,
  fetchAllStatusHistory,
  fetchAttentionsWithProductsBySite,
  isAttentionActive,
} from "@/modules/orders/api";
import AccountDialog from "@/modules/orders/components/AccountDialog.vue";
import {
  attentionStatusLabel,
  attentionStatusTone,
} from "@/modules/orders/order-status-labels";
import type { AttentionWithProducts } from "@/modules/orders/types";
import { computeAccount } from "@/modules/payments/account";
import type { AccountSummary } from "@/modules/payments/account";
import { fetchAllPayments } from "@/modules/payments/api";
import type { Payment } from "@/modules/payments/types";
import type { RestaurantSite } from "@/modules/restaurants/types";
import { useSiteActivityStore } from "@/stores/site-activity";
import { formatMoney } from "@/utils/money";
import { formatElapsed } from "@/utils/time";

usePageTitle("Cuentas de sede");

interface AccountRow {
  attention: AttentionWithProducts;
  account: AccountSummary;
  /** Momento en que el comensal pidió la cuenta. */
  requestedAt: string | null;
}

const route = useRoute();
const router = useRouter();
const activity = useSiteActivityStore();
const now = useNow(30000);

const attentions = ref<AttentionWithProducts[]>([]);
const payments = ref<Payment[]>([]);
const requestedAtById = ref<Map<string, string>>(new Map());
const actionError = ref<string | null>(null);

/** Pestaña activa: cobros de mesas o gastos de la sede (?vista=gastos). */
const tab = computed<"cobros" | "gastos">(() =>
  route.query.vista === "gastos" ? "gastos" : "cobros",
);

function selectTab(next: "cobros" | "gastos"): void {
  void router.replace({
    query: { ...route.query, vista: next === "gastos" ? "gastos" : undefined },
  });
}

const { restaurant, restaurantId, currency, isLoading, loadError } =
  useSiteContext(loadAccounts);

async function loadAccounts(site?: RestaurantSite): Promise<void> {
  const id = site?.id ?? restaurantId.value;

  if (!id) {
    return;
  }

  const [siteAttentions, allPayments, history] = await Promise.all([
    fetchAttentionsWithProductsBySite(id),
    fetchAllPayments(),
    fetchAllStatusHistory(),
  ]);
  const ids = new Set(siteAttentions.map((attention) => attention.id));
  const requested = new Map<string, string>();

  for (const entry of history) {
    if (
      entry.entityType === "attention" &&
      entry.toStatus === "account-requested" &&
      ids.has(entry.entityId)
    ) {
      requested.set(entry.entityId, entry.changedAt);
    }
  }

  attentions.value = siteAttentions;
  payments.value = allPayments.filter((payment) =>
    ids.has(payment.attentionId),
  );
  requestedAtById.value = requested;
}

async function reload(): Promise<void> {
  try {
    await loadAccounts();
  } catch (error) {
    actionError.value = errorMessage(
      error,
      "No se pudieron actualizar las cuentas.",
    );
  }
}

const rows = computed<AccountRow[]>(() =>
  attentions.value.map((attention) => ({
    attention,
    account: computeAccount(
      attention.products,
      payments.value.filter((payment) => payment.attentionId === attention.id),
    ),
    requestedAt: requestedAtById.value.get(attention.id) ?? null,
  })),
);

/** Filtro de la tabla de cobros. */
type AccountFilter = "active" | "requested" | "closed" | "all";
const filter = ref<AccountFilter>("active");
const search = ref("");

const counts = computed(() => ({
  active: rows.value.filter((row) => isAttentionActive(row.attention)).length,
  requested: rows.value.filter(
    (row) => row.attention.status === "account-requested",
  ).length,
  closed: rows.value.filter((row) => !isAttentionActive(row.attention)).length,
  all: rows.value.length,
}));

const FILTERS: Array<{ id: AccountFilter; label: string }> = [
  { id: "active", label: "Activas" },
  { id: "requested", label: "Pidieron la cuenta" },
  { id: "closed", label: "Cerradas y canceladas" },
  { id: "all", label: "Todas" },
];

/** Primero las que pidieron la cuenta (la más antigua arriba), luego abiertas y al final las cerradas recientes. */
function sortRank(row: AccountRow): number {
  if (row.attention.status === "account-requested") return 0;
  return row.attention.status === "open" ? 1 : 2;
}

const tableRows = computed(() => {
  const term = search.value.trim().toLowerCase();
  return rows.value
    .filter((row) => {
      if (filter.value === "active") return isAttentionActive(row.attention);
      if (filter.value === "requested")
        return row.attention.status === "account-requested";
      if (filter.value === "closed") return !isAttentionActive(row.attention);
      return true;
    })
    .filter(
      (row) =>
        !term ||
        `mesa ${row.attention.tableNumber} ${row.attention.guestName ?? ""}`
          .toLowerCase()
          .includes(term),
    )
    .sort((a, b) => {
      const rank = sortRank(a) - sortRank(b);
      if (rank !== 0) return rank;
      if (sortRank(a) === 0)
        return (a.requestedAt ?? "") < (b.requestedAt ?? "") ? -1 : 1;
      if (sortRank(a) === 1)
        return a.attention.openedAt < b.attention.openedAt ? -1 : 1;
      return (a.attention.closedAt ?? a.attention.openedAt) <
        (b.attention.closedAt ?? b.attention.openedAt)
        ? 1
        : -1;
    });
});

function formatClosedAt(iso: string): string {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: restaurant.value?.timezone,
  }).format(new Date(iso));
}

const page = ref(1);
const pageSize = ref(15);
watch([filter, search], () => (page.value = 1));
const pagedRows = computed(() =>
  tableRows.value.slice(
    (page.value - 1) * pageSize.value,
    page.value * pageSize.value,
  ),
);

const openTotal = computed(() =>
  rows.value
    .filter((row) => isAttentionActive(row.attention))
    .reduce((sum, row) => sum + row.account.remaining, 0),
);

const selectedAttention = computed(() => {
  const id = route.params.attentionId;
  return typeof id === "string"
    ? (attentions.value.find((attention) => attention.id === id) ?? null)
    : null;
});

async function openAccount(attention: AttentionWithProducts): Promise<void> {
  if (restaurantId.value) {
    await router.push({
      name: "site-account-detail",
      params: { siteSlug: route.params.siteSlug, attentionId: attention.id },
    });
  }
}

async function closeAccountDialog(): Promise<void> {
  if (restaurantId.value) {
    await router.push({
      name: "site-accounts",
      params: { siteSlug: route.params.siteSlug },
    });
  }
}

async function handleChanged(): Promise<void> {
  await reload();
  void activity.refresh();
}

watch(
  () => activity.revision,
  () => void reload(),
);
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
    <SkeletonBlock v-if="isLoading" variant="page" />
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-on-error-container"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else-if="restaurant">
      <SitePageHeader
        :restaurant="restaurant"
        section="Cuentas"
        :title="tab === 'gastos' ? 'Gastos de la sede' : 'Cuentas y cobros'"
        :description="
          tab === 'gastos'
            ? 'Registra insumos, sueldos, alquiler, servicios y demás gastos del local, mes a mes.'
            : 'Las mesas que pidieron la cuenta aparecen primero. Registra uno o varios pagos; la cuenta se cierra sola cuando el saldo llega a cero.'
        "
      >
        <template v-if="tab === 'cobros'" #actions>
          <div
            class="rounded-xl bg-surface-container-lowest px-4 py-2.5 shadow-sm"
          >
            <span
              class="font-label block text-xs font-semibold tracking-wider text-on-surface-variant uppercase"
            >
              Pendiente por cobrar
            </span>
            <span class="font-headline text-lg font-semibold text-on-surface">{{
              formatMoney(openTotal, currency)
            }}</span>
          </div>
        </template>
      </SitePageHeader>

      <div
        class="inline-flex gap-1 rounded-xl bg-surface-container p-1"
        role="tablist"
        aria-label="Secciones de cuentas"
      >
        <button
          v-for="option in [
            ['cobros', 'Cobros'],
            ['gastos', 'Gastos'],
          ] as const"
          :key="option[0]"
          type="button"
          role="tab"
          :aria-selected="tab === option[0]"
          class="font-label min-h-9 rounded-lg px-4 text-sm font-semibold transition-colors"
          :class="
            tab === option[0]
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          @click="selectTab(option[0])"
        >
          {{ option[1] }}
        </button>
      </div>

      <ExpensesPanel
        v-if="tab === 'gastos' && restaurantId"
        :restaurant-id="restaurantId"
        :currency="currency"
      />

      <template v-else>
        <p
          v-if="actionError"
          class="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
          role="alert"
        >
          {{ actionError }}
        </p>

        <section class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="option in FILTERS"
              :key="option.id"
              type="button"
              class="font-label inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold"
              :class="
                filter === option.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              "
              @click="filter = option.id"
            >
              {{ option.label }}
              <span
                class="rounded-full px-1.5 text-xs tabular-nums"
                :class="
                  option.id === 'requested' && counts.requested > 0
                    ? 'bg-error text-on-error'
                    : filter === option.id
                      ? 'bg-on-primary-container/15'
                      : 'bg-surface-container-lowest/70'
                "
                >{{ counts[option.id] }}</span
              >
            </button>
            <input
              v-model="search"
              type="search"
              placeholder="Buscar mesa"
              aria-label="Buscar mesa"
              class="min-h-10 w-full rounded-xl bg-surface-container-lowest px-3 text-sm text-on-surface shadow-sm ring-1 ring-outline-variant/40 outline-none placeholder:text-outline focus:ring-2 focus:ring-primary sm:ml-auto sm:w-56"
            />
          </div>

          <p
            v-if="tableRows.length === 0"
            class="rounded-2xl bg-surface-container-lowest p-6 text-center text-sm text-on-surface-variant shadow-sm"
          >
            {{
              filter === "requested"
                ? "Ninguna mesa está esperando la cuenta."
                : "No hay cuentas que coincidan."
            }}
          </p>

          <div
            v-else
            class="md:overflow-x-auto md:rounded-2xl md:bg-surface-container-lowest md:shadow-sm"
          >
            <table
              class="responsive-table w-full text-left text-sm md:min-w-[860px]"
            >
              <thead class="bg-surface-container-low text-on-surface-variant">
                <tr>
                  <th
                    class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                  >
                    Mesa
                  </th>
                  <th
                    class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                  >
                    Estado
                  </th>
                  <th
                    class="font-label px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                  >
                    Tiempo
                  </th>
                  <th
                    class="font-label px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase"
                  >
                    Productos
                  </th>
                  <th
                    class="font-label px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase"
                  >
                    Total
                  </th>
                  <th
                    class="font-label px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase"
                  >
                    Pagado
                  </th>
                  <th
                    class="font-label px-4 py-3 text-right text-xs font-semibold tracking-wide uppercase"
                  >
                    Pendiente
                  </th>
                  <th class="px-4 py-3">
                    <span class="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr
                  v-for="row in pagedRows"
                  :key="row.attention.id"
                  class="cursor-pointer transition-colors hover:bg-surface-container-low"
                  :class="
                    row.attention.status === 'account-requested'
                      ? 'md:bg-tertiary-fixed/25 ring-2 ring-tertiary-container md:ring-0'
                      : ''
                  "
                  @click="openAccount(row.attention)"
                >
                  <td class="cell-main px-4 py-3">
                    <span
                      class="font-headline text-base font-semibold text-on-surface"
                      >Mesa {{ row.attention.tableNumber }}</span
                    >
                    <span
                      v-if="row.attention.guestName"
                      class="block text-xs text-on-surface-variant"
                      >{{ row.attention.guestName }}</span
                    >
                  </td>
                  <td class="px-4 py-3" data-label="Estado">
                    <StatusBadge
                      :tone="attentionStatusTone[row.attention.status]"
                      :label="attentionStatusLabel[row.attention.status]"
                    />
                  </td>
                  <td
                    class="px-4 py-3 text-on-surface-variant"
                    data-label="Tiempo"
                  >
                    <span
                      v-if="
                        row.attention.status === 'account-requested' &&
                        row.requestedAt
                      "
                      class="font-semibold text-on-tertiary-container"
                      >Pidió {{ formatElapsed(row.requestedAt, now) }}</span
                    >
                    <span v-else-if="isAttentionActive(row.attention)"
                      >Abierta
                      {{ formatElapsed(row.attention.openedAt, now) }}</span
                    >
                    <span v-else-if="row.attention.closedAt"
                      >Cerró {{ formatClosedAt(row.attention.closedAt) }}</span
                    >
                    <span v-else>—</span>
                  </td>
                  <td
                    class="px-4 py-3 tabular-nums md:text-right"
                    data-label="Productos"
                  >
                    {{ row.attention.products.length }}
                  </td>
                  <td
                    class="px-4 py-3 tabular-nums md:text-right"
                    data-label="Total"
                  >
                    {{ formatMoney(row.account.total, currency) }}
                  </td>
                  <td
                    class="px-4 py-3 tabular-nums md:text-right"
                    :class="
                      row.account.paid > 0
                        ? 'text-success'
                        : 'text-on-surface-variant'
                    "
                    data-label="Pagado"
                  >
                    {{ formatMoney(row.account.paid, currency) }}
                  </td>
                  <td
                    class="px-4 py-3 font-semibold tabular-nums md:text-right"
                    :class="
                      row.account.remaining > 0
                        ? 'text-on-surface'
                        : 'text-on-surface-variant'
                    "
                    data-label="Pendiente"
                  >
                    {{ formatMoney(row.account.remaining, currency) }}
                  </td>
                  <td class="cell-actions px-4 py-3 md:text-right">
                    <button
                      type="button"
                      class="font-label min-h-9 rounded-lg px-3 text-sm font-semibold whitespace-nowrap"
                      :class="
                        row.attention.status === 'account-requested'
                          ? 'bg-primary text-on-primary hover:bg-primary-container'
                          : 'text-primary hover:bg-surface-container'
                      "
                      @click.stop="openAccount(row.attention)"
                    >
                      {{
                        row.attention.status === "account-requested"
                          ? "Cobrar →"
                          : isAttentionActive(row.attention)
                            ? "Ver cuenta"
                            : "Detalle"
                      }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <BasePagination
            v-if="tableRows.length > 0"
            v-model:page="page"
            v-model:page-size="pageSize"
            :total="tableRows.length"
            item-label="cuentas"
          />
        </section>
      </template>

      <AccountDialog
        v-if="selectedAttention"
        :key="selectedAttention.id"
        :attention="selectedAttention"
        :products="selectedAttention.products"
        :currency="currency"
        :timezone="restaurant.timezone"
        @close="closeAccountDialog"
        @changed="handleChanged"
      />
    </template>
  </div>
</template>
