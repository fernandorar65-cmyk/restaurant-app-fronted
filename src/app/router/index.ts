import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

import { landingRouteFor } from '@/app/router/landing'
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
      path: '/restaurant-owner/auth',
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
    { path: '/auth/login', redirect: (to) => ({ name: 'login', query: to.query }) },
    { path: '/auth/register', redirect: (to) => ({ name: 'register', query: to.query }) },
    {
      path: '/dashboard',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/administration/views/DashboardView.vue'),
          meta: { anyPermission: SITE_PERMISSIONS },
        },
        {
          path: '/sin-acceso',
          name: 'no-access',
          component: () => import('@/components/feedback/NoAccessView.vue'),
        },
      ],
    },
    {
      path: '/sedes/:restaurantId',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'site-dashboard',
          component: () => import('@/modules/restaurants/views/SiteDashboardView.vue'),
          meta: { permission: 'sites.manage' },
        },
        {
          path: 'pedidos',
          name: 'site-orders',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
          meta: { permission: 'orders.manage' },
        },
        {
          path: 'pedidos/:attentionId',
          name: 'site-order-detail',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
          meta: { permission: 'orders.manage' },
        },
        {
          path: 'cocina',
          name: 'site-kitchen',
          component: () => import('@/modules/orders/views/KitchenQueueView.vue'),
          meta: { permission: 'kitchen.manage' },
        },
        {
          path: 'entregas',
          name: 'site-deliveries',
          component: () => import('@/modules/orders/views/DeliveriesView.vue'),
          meta: { permission: 'delivery.manage' },
        },
        {
          path: 'menu',
          name: 'site-menu',
          component: () => import('@/modules/menus/views/SiteMenuView.vue'),
          meta: { permission: 'menu.manage' },
        },
        {
          path: 'cuentas',
          name: 'site-accounts',
          component: () => import('@/modules/orders/views/SiteAccountsView.vue'),
          meta: { permission: 'payments.manage' },
        },
        {
          path: 'cuentas/:attentionId',
          name: 'site-account-detail',
          component: () => import('@/modules/orders/views/SiteAccountsView.vue'),
          meta: { permission: 'payments.manage' },
        },
        {
          path: 'metricas',
          name: 'site-metrics',
          component: () => import('@/modules/reports/views/SiteMetricsView.vue'),
          meta: { permission: 'reports.view' },
        },
        {
          path: 'cierre',
          name: 'site-closing',
          component: () => import('@/modules/reports/views/DailyClosingView.vue'),
          meta: { permission: 'reports.view' },
        },
      ],
    },
    {
      // Perfil del dueño / personal: cualquier usuario con sesión, sin permiso específico.
      path: '/cuenta',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'staff-profile',
          component: () => import('@/modules/auth/views/StaffProfileView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-home',
          component: () => import('@/modules/administration/views/AdminHomeView.vue'),
          meta: { anyPermission: ADMIN_PERMISSIONS },
        },
        {
          path: 'empleados',
          name: 'admin-employees',
          component: () => import('@/modules/administration/views/EmployeesView.vue'),
          meta: { permission: 'staff.manage' },
        },
        {
          path: 'usuarios',
          name: 'admin-users',
          component: () => import('@/modules/administration/views/UsersView.vue'),
          meta: { permission: 'users.manage' },
        },
        {
          path: 'roles',
          name: 'admin-roles',
          component: () => import('@/modules/administration/views/RolesView.vue'),
          meta: { permission: 'users.manage' },
        },
        {
          path: 'inventario',
          name: 'admin-inventory',
          component: () => import('@/modules/administration/views/InventoryView.vue'),
          meta: { permission: 'inventory.manage' },
        },
        {
          path: 'restaurantes',
          name: 'admin-restaurants',
          component: () => import('@/modules/administration/views/RestaurantsAdminView.vue'),
          meta: { permission: 'org.manage' },
        },
        {
          path: 'configuracion',
          name: 'admin-settings',
          component: () => import('@/modules/administration/views/OrganizationSettingsView.vue'),
          meta: { permission: 'org.manage' },
        },
      ],
    },
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

router.beforeEach((to: RouteLocationNormalized) => {
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

  const restaurantId = typeof to.params.restaurantId === 'string' ? to.params.restaurantId : null

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
