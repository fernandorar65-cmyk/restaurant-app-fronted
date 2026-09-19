import { createRouter, createWebHistory } from 'vue-router'

import AdminLayout from '@/layouts/AdminLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'

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
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/modules/auth/views/LoginView.vue'),
        },
      ],
    },
    {
      path: '/admin',
      component: AdminLayout,
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
