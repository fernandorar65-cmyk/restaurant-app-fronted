import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

import PortalLayout from '@/layouts/PortalLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import { useSessionStore } from '@/stores/session'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
          path: 'menu',
          name: 'menu',
          component: () => import('@/modules/menus/views/MenuView.vue'),
        },
        {
          path: 'cart',
          name: 'cart',
          component: () => import('@/modules/orders/views/CartView.vue'),
        },
        {
          path: 'orders/:orderId',
          name: 'order-status',
          component: () => import('@/modules/orders/views/OrderStatusView.vue'),
        },
        {
          path: 'orders/:orderId/pay',
          name: 'order-payment',
          component: () => import('@/modules/payments/views/PaymentView.vue'),
        },
      ],
    },
    {
      path: '/auth',
      component: AuthLayout,
      meta: { guestOnly: true },
      children: [
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
    {
      path: '/dashboard',
      component: PortalLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/administration/views/DashboardView.vue'),
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
        },
        {
          path: 'pedidos',
          name: 'site-orders',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
        },
        {
          path: 'pedidos/:orderId',
          name: 'site-order-detail',
          component: () => import('@/modules/orders/views/SiteOrdersView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: PortalLayout,
      children: [
        {
          path: '',
          name: 'admin-home',
          component: () => import('@/modules/administration/views/AdminHomeView.vue'),
        },
      ],
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

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && session.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})
