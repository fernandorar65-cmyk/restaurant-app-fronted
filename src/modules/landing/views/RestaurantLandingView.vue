<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Directive } from 'vue'
import { RouterLink } from 'vue-router'

import ThemeMenu from '@/components/navigation/ThemeMenu.vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { AUTH_SHOWCASE_IMAGE_URL } from '@/modules/auth/brand'

usePageTitle('RentaSol para restaurantes')

const NAV = [
  { id: 'funciones', label: 'Funciones' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'clientes', label: 'Para tus clientes' },
  { id: 'preguntas', label: 'Preguntas' },
]

/** Lo que el sistema ya incluye hoy, agrupado como lo vería un dueño. */
const FEATURES = [
  {
    title: 'Carta digital y QR por mesa',
    description: 'Publica tu carta con fotos, ingredientes, alérgenos y tiempos. Cada mesa tiene su QR para pedir sin esperar.',
    icon: 'M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z',
  },
  {
    title: 'Pedidos y cocina en tiempo real',
    description: 'Los pedidos llegan al instante a sala y a la cola de cocina, con estados claros desde que se piden hasta que se sirven.',
    icon: 'M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z',
  },
  {
    title: 'Delivery y pedido anticipado',
    description: 'Tus clientes piden para llevar o para tenerlo listo al llegar. Define radio de entrega, costo de envío y pedido mínimo.',
    icon: 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
  },
  {
    title: 'Cuentas y cobros',
    description: 'Cuentas por mesa y opciones de pago con tarjeta, Yape, Plin y transferencia, todo en un mismo lugar.',
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  },
  {
    title: 'Métricas y cierre del día',
    description: 'Ventas, ticket promedio y ocupación de cada sede. Cierra la caja del día con un resumen listo para revisar.',
    icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  },
  {
    title: 'Varias sedes, roles y personal',
    description: 'Gestiona todas tus sedes desde una cuenta. Cocina, sala y caja ven solo lo que necesitan según su rol.',
    icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  },
  {
    title: 'Sala y mesas',
    description: 'Plano de sala con el estado de cada mesa: libre, ocupada, reservada o en limpieza. Imprime los QR en un clic.',
    icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  },
  {
    title: 'Inventario',
    description: 'Controla tus insumos y recibe avisos cuando algo se está acabando, antes de que afecte al servicio.',
    icon: 'm20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z',
  },
]

const STEPS = [
  { title: 'Registra tu restaurante', description: 'Crea tu cuenta de dueño y agrega tus sedes con su dirección y horarios.' },
  { title: 'Sube tu carta e imprime los QR', description: 'Carga tus platos con fotos y precios. Genera el QR de cada mesa y colócalo.' },
  { title: 'Recibe pedidos', description: 'Tus clientes piden desde su celular; sala, cocina y caja trabajan coordinados.' },
]

const DINER_POINTS = [
  'Encuentran tu restaurante en un mapa con los locales más cercanos.',
  'Buscan platos al escribir, por nombre o ingrediente, aunque no pongan tildes.',
  'Ven ingredientes, presentación, porción y tiempo de cada plato antes de pedir.',
  'Guardan sus alergias y preferencias en su perfil.',
  'Eligen comer en mesa, recoger al llegar o delivery, y pagan desde el celular.',
]

const FAQS = [
  {
    question: '¿Necesito comprar equipos especiales?',
    answer: 'No. Funciona en el navegador de cualquier celular, tablet o computadora. Para la cocina basta una pantalla con internet.',
  },
  {
    question: '¿Mis clientes tienen que descargar una app?',
    answer: 'No. Escanean el QR de la mesa o entran desde el enlace de tu restaurante y piden desde el navegador.',
  },
  {
    question: '¿Puedo gestionar varios locales?',
    answer: 'Sí. Desde una sola cuenta administras todas tus sedes, cada una con su carta, sus mesas y su personal.',
  },
  {
    question: '¿Puedo limitar lo que ve cada empleado?',
    answer: 'Sí. Cada rol tiene sus permisos: cocina ve la cola de pedidos, caja ve las cuentas y la gerencia ve las métricas.',
  },
  {
    question: '¿Puedo ofrecer delivery solo en algunas sedes?',
    answer: 'Sí. En cada sede eliges si atiende en mesa, pedido anticipado o delivery, con su propio radio de entrega y costo de envío.',
  },
]

const openFaq = ref<number | null>(0)

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* Aparición al hacer scroll: v-reveal o v-reveal="retrasoEnMs" para escalonar. */
let revealObserver: IntersectionObserver | null = null

function getRevealObserver(): IntersectionObserver {
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          revealObserver?.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )
  return revealObserver
}

const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    el.style.setProperty('--reveal-delay', `${binding.value ?? 0}ms`)

    if (prefersReducedMotion) {
      el.classList.add('is-visible')
    } else {
      getRevealObserver().observe(el)
    }
  },
  unmounted(el) {
    revealObserver?.unobserve(el)
  },
}

/* Tarjetas "en vivo" de la portada: rotan pedidos, pagos y la cola de cocina. */
const LIVE_ORDERS = [
  { title: 'Mesa 4 · 3 platos', detail: 'Croquetas, rabo de toro, manzanilla' },
  { title: 'Delivery D-2041 · 2 platos', detail: 'Risotto de setas, soufflé' },
  { title: 'Recoge 13:30 · 4 platos', detail: 'Jamón ibérico, pescaíto frito…' },
  { title: 'Mesa 9 · 2 platos', detail: 'Vieira a la brasa, copa de champán' },
]
const LIVE_PAYMENTS = ['Yape · Mesa 12', 'Tarjeta · Mesa 3', 'Plin · R-1042', 'Transferencia · D-2041']
const LIVE_KITCHEN = [5, 6, 4, 7]
const liveIndex = ref(0)
let liveTimer: number | undefined

/* El encabezado gana sombra al desplazarse. */
const isScrolled = ref(false)

function onScroll(): void {
  isScrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  if (!prefersReducedMotion) {
    liveTimer = window.setInterval(() => {
      liveIndex.value = (liveIndex.value + 1) % LIVE_ORDERS.length
    }, 3200)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.clearInterval(liveTimer)
  revealObserver?.disconnect()
})
</script>

<template>
  <div class="min-h-dvh bg-background text-on-surface">
    <!-- Encabezado -->
    <header
      class="sticky top-0 z-40 border-b bg-surface/90 backdrop-blur-xl transition-[box-shadow,border-color] duration-300"
      :class="isScrolled ? 'border-outline-variant/50 shadow-[0_4px_24px_rgba(15,23,42,0.08)]' : 'border-transparent'"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <RouterLink :to="{ name: 'home' }" class="flex items-center gap-2.5" aria-label="RentaSol, ir al inicio">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary" aria-hidden="true">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </span>
          <span class="font-headline text-lg font-semibold">RentaSol</span>
        </RouterLink>
        <nav class="ml-6 hidden items-center gap-1 md:flex" aria-label="Secciones">
          <a
            v-for="item in NAV"
            :key="item.id"
            :href="`#${item.id}`"
            class="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            {{ item.label }}
          </a>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <ThemeMenu />
          <RouterLink
            :to="{ name: 'login' }"
            class="font-label hidden min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-on-surface hover:bg-surface-container sm:flex"
          >
            Iniciar sesión
          </RouterLink>
          <RouterLink
            :to="{ name: 'register' }"
            class="font-label flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold whitespace-nowrap text-on-primary shadow-sm hover:bg-primary-container"
          >
            <span class="sm:hidden">Registrarme</span>
            <span class="hidden sm:inline">Registrar mi restaurante</span>
          </RouterLink>
        </div>
      </div>
    </header>

    <main>
      <!-- Hero -->
      <section class="relative overflow-hidden">
        <div class="blob pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary-fixed opacity-50 blur-3xl" aria-hidden="true" />
        <div class="blob blob-b pointer-events-none absolute -bottom-48 -left-40 h-[26rem] w-[26rem] rounded-full bg-tertiary-fixed opacity-30 blur-3xl" aria-hidden="true" />
        <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div class="space-y-6">
            <p style="--d: 0ms" class="hero-in font-label inline-flex items-center gap-2 rounded-full bg-tertiary-fixed/60 px-3 py-1 text-xs font-semibold tracking-wider text-on-tertiary-container uppercase">
              <span class="h-1.5 w-1.5 rounded-full bg-tertiary" aria-hidden="true" />
              Para restaurantes
            </p>
            <h1 style="--d: 90ms" class="hero-in font-headline text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Tu restaurante conectado, <em class="text-primary italic">de la mesa a la cocina</em>.
            </h1>
            <p style="--d: 180ms" class="hero-in max-w-xl text-lg leading-relaxed text-on-surface-variant">
              RentaSol reúne tu carta digital, los pedidos por QR, la cocina, los cobros, el delivery y las métricas de todas tus
              sedes en un solo lugar.
            </p>
            <div style="--d: 270ms" class="hero-in flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RouterLink
                :to="{ name: 'register' }"
                class="font-label group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold whitespace-nowrap text-on-primary shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-lg"
              >
                Registrar mi restaurante
                <span aria-hidden="true" class="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </RouterLink>
              <RouterLink
                :to="{ name: 'home' }"
                class="font-label inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-semibold whitespace-nowrap text-on-surface ring-1 ring-outline-variant hover:bg-surface-container-low"
              >
                Ver cómo lo usan los clientes
              </RouterLink>
            </div>
            <ul style="--d: 360ms" class="hero-in flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-surface-variant">
              <li v-for="item in ['Sin apps que instalar', 'Funciona en cualquier dispositivo', 'Varias sedes en una cuenta']" :key="item" class="flex items-center gap-2">
                <svg class="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Visual: foto con tarjetas "en vivo" que rotan -->
          <div class="hero-visual relative mx-auto w-full max-w-lg" aria-hidden="true">
            <div class="overflow-hidden rounded-3xl shadow-2xl">
              <img :src="AUTH_SHOWCASE_IMAGE_URL" alt="" class="ken-burns aspect-[4/5] w-full object-cover sm:aspect-[4/4.2]" />
            </div>

            <div style="--d: 650ms" class="hero-pop absolute top-6 left-3 w-60 sm:-left-10">
              <div class="float-a rounded-2xl bg-surface-container-lowest p-4 shadow-xl ring-1 ring-outline-variant/40">
                <p class="font-label flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
                  <span class="relative flex h-2 w-2">
                    <span class="live-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span class="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Nuevo pedido
                </p>
                <Transition name="swap" mode="out-in">
                  <div :key="liveIndex">
                    <p class="mt-1 font-semibold">{{ LIVE_ORDERS[liveIndex]!.title }}</p>
                    <p class="truncate text-xs text-on-surface-variant">{{ LIVE_ORDERS[liveIndex]!.detail }}</p>
                  </div>
                </Transition>
              </div>
            </div>

            <div style="--d: 850ms" class="hero-pop absolute right-3 bottom-24 w-52 sm:-right-8">
              <div class="float-b rounded-2xl bg-surface-container-lowest p-4 shadow-xl ring-1 ring-outline-variant/40">
                <p class="flex items-center gap-2 text-sm font-semibold">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-success-container text-success">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </span>
                  Pago recibido
                </p>
                <Transition name="swap" mode="out-in">
                  <p :key="liveIndex" class="mt-1 text-xs text-on-surface-variant">{{ LIVE_PAYMENTS[liveIndex] }}</p>
                </Transition>
              </div>
            </div>

            <div style="--d: 1050ms" class="hero-pop absolute bottom-5 left-5">
              <div class="rounded-2xl bg-surface-container-lowest/95 px-4 py-3 shadow-xl ring-1 ring-outline-variant/40 backdrop-blur">
                <p class="text-xs text-on-surface-variant">Cola de cocina</p>
                <p class="font-headline flex items-baseline gap-1.5 text-2xl font-semibold">
                  <Transition name="swap" mode="out-in">
                    <span :key="liveIndex" class="inline-block tabular-nums">{{ LIVE_KITCHEN[liveIndex] }}</span>
                  </Transition>
                  en preparación
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Funciones -->
      <section id="funciones" class="scroll-mt-20 border-t border-outline-variant/50 bg-surface-container-lowest">
        <div class="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 lg:py-20">
          <div v-reveal class="max-w-2xl space-y-3">
            <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Qué incluye</p>
            <h2 class="font-headline text-3xl font-semibold tracking-tight sm:text-4xl">Todo lo que necesita tu servicio</h2>
            <p class="text-on-surface-variant">Desde que el cliente abre la carta hasta que cierras la caja del día.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article
              v-for="(feature, index) in FEATURES"
              :key="feature.title"
              v-reveal="(index % 4) * 80"
              class="group space-y-3 rounded-2xl bg-background p-5 ring-1 ring-outline-variant/40 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-outline-variant"
            >
              <span
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed transition-[transform,background-color,color] duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary"
                aria-hidden="true"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="feature.icon" />
                </svg>
              </span>
              <h3 class="font-semibold">{{ feature.title }}</h3>
              <p class="text-sm leading-relaxed text-on-surface-variant">{{ feature.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- Cómo funciona -->
      <section id="como-funciona" class="scroll-mt-20">
        <div class="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6 lg:py-20">
          <div v-reveal class="max-w-2xl space-y-3">
            <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Cómo funciona</p>
            <h2 class="font-headline text-3xl font-semibold tracking-tight sm:text-4xl">Empieza en tres pasos</h2>
          </div>
          <ol class="relative grid gap-4 md:grid-cols-3">
            <!-- Línea que une los pasos (escritorio) -->
            <span v-reveal="200" class="step-line pointer-events-none absolute top-11 right-[16%] left-[16%] hidden h-0.5 bg-primary-fixed md:block" aria-hidden="true" />
            <li
              v-for="(step, index) in STEPS"
              :key="step.title"
              v-reveal="index * 140"
              class="relative space-y-3 rounded-2xl bg-surface-container-lowest p-6 ring-1 ring-outline-variant/40 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <span class="font-headline flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-on-primary">
                {{ index + 1 }}
              </span>
              <h3 class="text-lg font-semibold">{{ step.title }}</h3>
              <p class="text-sm leading-relaxed text-on-surface-variant">{{ step.description }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Para tus clientes -->
      <section id="clientes" class="scroll-mt-20 border-y border-outline-variant/50 bg-surface-container-lowest">
        <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div v-reveal class="space-y-5">
            <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Para tus clientes</p>
            <h2 class="font-headline text-3xl font-semibold tracking-tight sm:text-4xl">Una experiencia que dan ganas de repetir</h2>
            <ul class="space-y-3">
              <li v-for="(point, index) in DINER_POINTS" :key="point" v-reveal="150 + index * 70" class="flex gap-3 text-on-surface-variant">
                <svg class="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {{ point }}
              </li>
            </ul>
            <RouterLink :to="{ name: 'home' }" class="font-label inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Probar la experiencia del cliente <span aria-hidden="true">→</span>
            </RouterLink>
          </div>
          <!-- Maqueta de un plato en la app -->
          <div v-reveal="150" class="mx-auto w-full max-w-sm" aria-hidden="true">
          <div class="float-a rounded-[2rem] bg-background p-3 shadow-2xl ring-1 ring-outline-variant/50">
            <div class="overflow-hidden rounded-[1.5rem] bg-surface-container-lowest">
              <div class="relative">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/2/29/Croquetas_caseras_de_jam%C3%B3n_en_Salamanca.jpg"
                  alt=""
                  class="aspect-[4/3] w-full object-cover"
                />
                <div class="absolute bottom-3 left-3 flex gap-1.5">
                  <span class="rounded-full bg-surface-container-lowest/95 px-2.5 py-1 text-xs font-semibold">10 min</span>
                  <span class="rounded-full bg-surface-container-lowest/95 px-2.5 py-1 text-xs font-semibold">6 unidades</span>
                </div>
              </div>
              <div class="space-y-3 p-4">
                <p class="font-headline text-xl font-semibold">Croquetas de jamón ibérico</p>
                <p class="text-sm text-on-surface-variant">Bechamel lenta de leche entera y jamón ibérico, crujientes por fuera y cremosas por dentro.</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="item in ['Jamón ibérico', 'Leche entera', 'Pan rallado']" :key="item" class="rounded-lg bg-surface-container-low px-2 py-0.5 text-xs ring-1 ring-outline-variant/40">
                    {{ item }}
                  </span>
                </div>
                <div class="flex min-h-11 items-center justify-between rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary">
                  <span>+ Agregar a la orden</span>
                  <span>11,00 €</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      <!-- Preguntas -->
      <section id="preguntas" class="scroll-mt-20">
        <div class="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6 lg:py-20">
          <div v-reveal class="space-y-3 text-center">
            <p class="font-label text-xs font-semibold tracking-widest text-tertiary uppercase">Preguntas frecuentes</p>
            <h2 class="font-headline text-3xl font-semibold tracking-tight sm:text-4xl">Lo que suelen preguntarnos</h2>
          </div>
          <div v-reveal="100" class="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/40">
            <div v-for="(faq, index) in FAQS" :key="faq.question">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold transition-colors hover:text-primary"
                :aria-expanded="openFaq === index"
                @click="openFaq = openFaq === index ? null : index"
              >
                {{ faq.question }}
                <svg
                  class="h-5 w-5 shrink-0 text-outline transition-transform duration-300"
                  :class="{ 'rotate-180': openFaq === index }"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <!-- Apertura suave: la fila del grid pasa de 0fr a 1fr -->
              <div
                class="grid transition-[grid-template-rows] duration-300 ease-out"
                :class="openFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
              >
                <div class="overflow-hidden">
                  <p class="px-5 pb-4 text-sm leading-relaxed text-on-surface-variant">{{ faq.answer }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Llamado final -->
      <section class="px-4 pb-16 sm:px-6">
        <div v-reveal class="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#0F172A] px-6 py-14 text-center text-white sm:px-12">
          <img :src="AUTH_SHOWCASE_IMAGE_URL" alt="" class="ken-burns absolute inset-0 h-full w-full object-cover opacity-25" aria-hidden="true" />
          <div class="relative mx-auto max-w-2xl space-y-5">
            <h2 class="font-headline text-3xl font-semibold tracking-tight sm:text-4xl">Lleva tu restaurante a RentaSol</h2>
            <p class="text-lg text-white/80">Crea tu cuenta, sube tu carta y empieza a recibir pedidos.</p>
            <div class="flex flex-col justify-center gap-3 sm:flex-row">
              <RouterLink
                :to="{ name: 'register' }"
                class="font-label inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-base font-semibold text-[#0F172A] hover:bg-white/90"
              >
                Registrar mi restaurante
              </RouterLink>
              <RouterLink
                :to="{ name: 'login' }"
                class="font-label inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-semibold text-white ring-1 ring-white/40 hover:bg-white/10"
              >
                Ya tengo cuenta
              </RouterLink>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-outline-variant/50">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-on-surface-variant sm:flex-row sm:px-6">
        <p>© {{ new Date().getFullYear() }} RentaSol</p>
        <div class="flex gap-4">
          <RouterLink :to="{ name: 'home' }" class="hover:text-on-surface">Para clientes</RouterLink>
          <RouterLink :to="{ name: 'login' }" class="hover:text-on-surface">Acceso del personal</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Curva "ease-out-expo": arranca rápido y frena suave, típica de interfaces de producto. */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  /* translate y box-shadow conservan el efecto al pasar el mouse (hover:-translate-y-1). */
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0ms),
    translate 0.3s ease,
    box-shadow 0.3s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: none;
}

/* La línea entre pasos se dibuja de izquierda a derecha. */
.step-line.reveal {
  transform: scaleX(0);
  transform-origin: left;
}

.step-line.reveal.is-visible {
  transform: scaleX(1);
}

.hero-in {
  opacity: 0;
  animation: hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0ms) forwards;
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero-visual {
  animation: hero-visual 1s cubic-bezier(0.16, 1, 0.3, 1) 150ms both;
}

@keyframes hero-visual {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero-pop {
  animation: hero-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) var(--d, 0ms) both;
}

@keyframes hero-pop {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.float-a {
  animation: float 6s ease-in-out infinite;
}

.float-b {
  animation: float 7s ease-in-out 1.2s infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.live-ping {
  animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
}

.ken-burns {
  animation: ken-burns 24s ease-in-out infinite alternate;
}

@keyframes ken-burns {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
}

.blob {
  animation: blob 18s ease-in-out infinite alternate;
}

.blob-b {
  animation-duration: 22s;
  animation-direction: alternate-reverse;
}

@keyframes blob {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(-40px, 30px) scale(1.1);
  }
}

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Quien pidió menos movimiento en su sistema ve todo estático. */
@media (prefers-reduced-motion: reduce) {
  .reveal,
  .hero-in,
  .hero-visual,
  .hero-pop,
  .step-line.reveal {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
    transition: none !important;
  }

  .float-a,
  .float-b,
  .live-ping,
  .ken-burns,
  .blob {
    animation: none;
  }

  .swap-enter-active,
  .swap-leave-active {
    transition: none;
  }
}
</style>
