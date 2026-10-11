import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
import { ensureSiteDirectory, findSite } from '@/app/router/site-directory'
import PortalLayout from '@/layouts/PortalLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { ADMIN_PERMISSIONS, SITE_PERMISSIONS } from '@/modules/auth/permissions'
import { useDinerStore } from '@/stores/diner'
import { useSessionStore } from '@/stores/session'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── COMENSAL ──────────────────────────────────────────────────────
    // Público. Entra escaneando el QR de su mesa (o elige una sede solo
    // para consultar la carta), confirma la mesa, pide, sigue su pedido y
    // consulta la cuenta. Puede usar una cuenta de comensal opcional.
    {
      path: '/',
      component: CustomerLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/modules/restaurants/views/RestaurantSelectView.vue'),
        },
        {
          path: 'table/:tableId',
          name: 'table-entry',
          component: () => import('@/modules/restaurants/views/TableEntryView.vue'),
        },
        {
          path: ':restaurantSlug/menu',
          name: 'menu',
          component: () => import('@/modules/menus/views/MenuView.vue'),
        },
        {
          // Ruta antigua: lleva a la carta de la sede actual del comensal.
          path: 'menu',
          redirect: () => useDinerStore().menuRoute,
        },
        {
          path: 'cart',
          name: 'cart',
          component: () => import('@/modules/orders/views/CartView.vue'),
        },
        {
          path: 'pedido/entrega',
          name: 'checkout-fulfillment',
          component: () => import('@/modules/payments/views/FulfillmentView.vue'),
        },
        {
          path: 'pago',
          name: 'checkout',
          component: () => import('@/modules/payments/views/CheckoutView.vue'),
        },
        {
          path: 'pago/listo',
          name: 'checkout-result',
          component: () => import('@/modules/payments/views/CheckoutResultView.vue'),
        },
        {
          path: 'pago/:method',
          name: 'checkout-method',
          component: () => import('@/modules/payments/views/PaymentMethodView.vue'),
        },
        {
          path: 'orders/:attentionId',
          name: 'order-status',
          component: () => import('@/modules/orders/views/OrderStatusView.vue'),
        },
        {
          path: 'orders/:attentionId/cuenta',
          name: 'order-account',
          component: () => import('@/modules/payments/views/CustomerAccountView.vue'),
        },
        {
          path: 'orders/:attentionId/pay',
          redirect: (to) => ({ name: 'order-account', params: to.params }),
        },
        {
          // Elegir tipo de cuenta antes de iniciar sesión o registrarse (?modo=registro).
          path: 'acceso',
          name: 'access',
          component: () => import('@/modules/auth/views/AccessView.vue'),
        },
        {
          path: 'perfil',
          name: 'diner-profile',
          component: () => import('@/modules/diners/views/DinerProfileView.vue'),
        },
        {
          path: 'mis-visitas',
          name: 'diner-visits',
          component: () => import('@/modules/diners/views/DinerVisitsView.vue'),
        },
      ],
    },
    // ── PERSONAL DEL RESTAURANTE ──────────────────────────────────────
    // Requiere login. Cada ruta pide un permiso; el rol del usuario decide
    // qué ve (cocina, mozo, caja, gerente, propietario…).
    // ── ACCESO ────────────────────────────────────────────────────────
    // La ruta depende del tipo de cuenta elegido; ambos usan el mismo diseño.
    {
      path: '/customer/auth',
      component: AuthLayout,
      children: [
        { path: '', redirect: { name: 'diner-auth' } },
        {
          path: 'login',
          name: 'diner-auth',
          component: () => import('@/modules/diners/views/DinerAuthView.vue'),
        },
        {
          path: 'register',
          name: 'diner-register',
          component: () => import('@/modules/diners/views/DinerAuthView.vue'),
        },
      ],
    },
    {
      path: '/owner/auth',
      component: AuthLayout,
      meta: { guestOnly: true },
      children: [
        { path: '', redirect: { name: 'login' } },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/modules/auth/views/LoginView.vue'),
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/modules/auth/views/RegisterView.vue'),
        },
      ],
    },
    // Rutas antiguas: redirigen a las nuevas conservando ?redirect y demás parámetros.
    {
      path: '/ingresar',
      redirect: (to) => {
        const { modo, ...query } = to.query
        return { name: modo === 'registro' ? 'diner-register' : 'diner-auth', query }
      },
    },
    { path: '/auth', redirect: { name: 'login' } },
    { path: '/restaurant-owner/auth/:rest(.*)*', redirect: (to) => to.fullPath.replace('/restaurant-owner', '/owner') },
    { path: '/auth/login', redirect: (to) => ({ name: 'login', query: to.query }) },
    { path: '/auth/register', redirect: (to) => ({ name: 'register', query: to.query }) },
    // ── RESTAURANTE (dueño y personal) ────────────────────────────────
    // Todo el portal vive bajo /owner. Requiere login; cada ruta pide un permiso.
    {
      path: '/owner',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'dashboard' } },
        {
          // URL antigua con el id de la sede: se traduce al nombre del local.
          path: 'sedes/:legacyId/:rest(.*)*',
          component: () => import('@/components/feedback/NotFoundView.vue'),
          beforeEnter: async (to) => {
            const { ensureSiteDirectory, siteSlugFor } = await import('@/app/router/site-directory')
            await ensureSiteDirectory()
            const rest = Array.isArray(to.params.rest) ? to.params.rest.join('/') : ''
            return { path: `/owner/sede/${siteSlugFor(String(to.params.legacyId))}${rest ? `/${rest}` : ''}`, query: to.query }
          },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/modules/administration/views/DashboardView.vue'),
          meta: { anyPermission: SITE_PERMISSIONS },
        },
        {
          path: 'sin-acceso',
          name: 'no-access',
          component: () => import('@/components/feedback/NoAccessView.vue'),
        },
        {
          path: 'finanzas',
          name: 'finance',
          component: () => import('@/modules/finance/views/FinanceView.vue'),
          meta: { permission: 'reports.view' },
        },
        {
          // Detalle de ingresos y gastos de un local. La guarda verifica el acceso a la sede.
          path: 'finanzas/:restaurantId',
          name: 'finance-site',
          component: () => import('@/modules/finance/views/FinanceSiteView.vue'),
          meta: { permission: 'reports.view' },
        },
        {
          path: 'sede/:siteSlug',
          name: 'site-dashboard',
          component: () => import('@/modules/restaurants/views/SiteDashboardView.vue'),
          meta: { permission: 'sites.manage' },
        },
        {
          path: 'sede/:siteSlug/pedidos',
          name: 'site-orders',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
          meta: { permission: 'orders.manage' },
        },
        {
          path: 'sede/:siteSlug/pedidos/:attentionId',
          name: 'site-order-detail',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
          meta: { permission: 'orders.manage' },
        },
        {
          path: 'sede/:siteSlug/cocina',
          name: 'site-kitchen',
          component: () => import('@/modules/orders/views/KitchenQueueView.vue'),
          meta: { permission: 'kitchen.manage' },
        },
        {
          path: 'sede/:siteSlug/entregas',
          name: 'site-deliveries',
          component: () => import('@/modules/orders/views/DeliveriesView.vue'),
          meta: { permission: 'delivery.manage' },
        },
        {
          path: 'sede/:siteSlug/menu',
          name: 'site-menu',
          component: () => import('@/modules/menus/views/SiteMenuView.vue'),
          meta: { permission: 'menu.manage' },
        },
        {
          path: 'sede/:siteSlug/cuentas',
          name: 'site-accounts',
          component: () => import('@/modules/orders/views/SiteAccountsView.vue'),
          meta: { permission: 'payments.manage' },
        },
        {
          path: 'sede/:siteSlug/cuentas/:attentionId',
          name: 'site-account-detail',
          component: () => import('@/modules/orders/views/SiteAccountsView.vue'),
          meta: { permission: 'payments.manage' },
        },
        {
          path: 'sede/:siteSlug/metricas',
          name: 'site-metrics',
          component: () => import('@/modules/reports/views/SiteMetricsView.vue'),
          meta: { permission: 'reports.view' },
        },
        {
          path: 'sede/:siteSlug/cierre',
          name: 'site-closing',
          component: () => import('@/modules/reports/views/DailyClosingView.vue'),
          meta: { permission: 'reports.view' },
        },
        {
          path: 'cuenta',
          name: 'staff-profile',
          component: () => import('@/modules/auth/views/StaffProfileView.vue'),
        },
        {
          path: 'admin',
          name: 'admin-home',
          component: () => import('@/modules/administration/views/AdminHomeView.vue'),
          meta: { anyPermission: ADMIN_PERMISSIONS },
        },
        {
          path: 'admin/empleados',
          name: 'admin-employees',
          component: () => import('@/modules/administration/views/EmployeesView.vue'),
          meta: { permission: 'staff.manage' },
        },
        {
          path: 'admin/usuarios',
          name: 'admin-users',
          component: () => import('@/modules/administration/views/UsersView.vue'),
          meta: { permission: 'users.manage' },
        },
        {
          path: 'admin/roles',
          name: 'admin-roles',
          component: () => import('@/modules/administration/views/RolesView.vue'),
          meta: { permission: 'users.manage' },
        },
        {
          path: 'admin/inventario',
          name: 'admin-inventory',
          component: () => import('@/modules/administration/views/InventoryView.vue'),
          meta: { permission: 'inventory.manage' },
        },
        {
          path: 'admin/restaurantes',
          name: 'admin-restaurants',
          component: () => import('@/modules/administration/views/RestaurantsAdminView.vue'),
          meta: { permission: 'org.manage' },
        },
        {
          path: 'admin/configuracion',
          name: 'admin-settings',
          component: () => import('@/modules/administration/views/OrganizationSettingsView.vue'),
          meta: { permission: 'org.manage' },
        },
      ],
    },
    // Rutas antiguas del portal: redirigen a /owner conservando la ruta y los parámetros.
    ...['dashboard', 'sin-acceso', 'finanzas', 'sedes', 'cuenta', 'admin'].map(
      (prefix): RouteRecordRaw => ({ path: `/${prefix}/:rest(.*)*`, redirect: (to) => `/owner${to.fullPath}` }),
    ),
    {
      // Landing comercial para dueños de restaurante. Pública y sin layout propio.
      path: '/para-restaurantes',
      name: 'restaurant-landing',
      component: () => import('@/modules/landing/views/RestaurantLandingView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/components/feedback/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to: RouteLocationNormalized) => {
  const session = useSessionStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && session.isAuthenticated) {
    return landingRouteFor(session.user)
  }

  if (!requiresAuth || to.name === 'no-access') {
    return true
  }

  await ensureSiteDirectory()

  let restaurantId = typeof to.params.restaurantId === 'string' ? to.params.restaurantId : null

  // Rutas de sede (/owner/sede/:siteSlug): el slug se traduce al id de la sede, que
  // queda en route.meta.siteId para las vistas, los permisos y la API.
  if (typeof to.params.siteSlug === 'string') {
    const site = await findSite(to.params.siteSlug)

    if (!site) {
      return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }
    }

    // Si llegó con el id (o un slug viejo), se corrige la URL al nombre del local.
    if (site.slug !== to.params.siteSlug) {
      return { name: to.name ?? undefined, params: { ...to.params, siteSlug: site.slug }, query: to.query, hash: to.hash, replace: true }
    }

    restaurantId = site.id
    to.meta.siteId = restaurantId
  }

  if (restaurantId && !session.canAccessRestaurant(restaurantId)) {
    return { name: 'no-access', query: { motivo: 'sede' } }
  }

  const { permission, anyPermission } = to.meta

  if (permission && !session.can(permission)) {
    return { name: 'no-access', query: { motivo: 'permiso' } }
  }

  if (anyPermission && !anyPermission.some((item) => session.can(item))) {
    const landing = landingRouteFor(session.user)
    return typeof landing === 'object' && 'name' in landing && landing.name === to.name
      ? { name: 'no-access' }
      : landing
  }

  return true
})
