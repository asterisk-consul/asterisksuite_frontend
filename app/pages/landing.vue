<script setup lang="ts">
import { useMouseInElement } from '@vueuse/core'

definePageMeta({
  layout: 'landing',
  auth: false
})

const heroRef = ref<HTMLElement | null>(null)
const { elementX, elementY, elementWidth, elementHeight } = useMouseInElement(heroRef)

const mouseXPercent = computed(() => elementWidth.value ? (elementX.value / elementWidth.value) * 100 : 50)
const mouseYPercent = computed(() => elementHeight.value ? (elementY.value / elementHeight.value) * 100 : 50)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  )
  nextTick(() => {
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
  })
  onUnmounted(() => observer.disconnect())
})

const particles = ref<{ id: number; x: number; delay: number; size: number }[]>([])
let particleId = 0
function spawnParticles() {
  for (let i = 0; i < 8; i++) {
    particles.value.push({
      id: particleId++,
      x: 20 + Math.random() * 60,
      delay: Math.random() * 0.3,
      size: 4 + Math.random() * 4
    })
  }
  setTimeout(() => { particles.value = [] }, 1000)
}

const painPoints = [
  { icon: 'i-lucide-alert-triangle', title: 'No sabés cuánto stock tenés', sub: 'en cada depósito' },
  { icon: 'i-lucide-phone-missed', title: 'Los viajes se pierden', sub: 'entre planillas y llamadas' },
  { icon: 'i-lucide-file-warning', title: 'La facturación es un infierno', sub: 'de copy-paste y errores' },
  { icon: 'i-lucide-eye-off', title: 'No tenés visibilidad', sub: 'de cuentas corrientes ni pagos' }
]

const modules = [
  { icon: 'i-lucide-shopping-cart', title: 'ERP Ventas y Compras', description: 'Facturación electrónica, órdenes de compra, remitos, presupuestos. Todo el ciclo comercial.', color: 'orange', featured: true },
  { icon: 'i-lucide-wallet', title: 'Tesorería', description: 'Cajas, cheques, cuentas corrientes, pagos. Control total de tu flujo.', color: 'cyan' },
  { icon: 'i-lucide-truck', title: 'Logística', description: 'Viajes, choferes, vehículos, rutas, picking.', color: 'violet' },
  { icon: 'i-lucide-package', title: 'Inventario', description: 'Stock por depósito, BOM, costos, categorías.', color: 'green' },
  { icon: 'i-lucide-users', title: 'RRHH', description: 'Empleados, socios, vales, reportes.', color: 'blue' },
  { icon: 'i-lucide-calculator', title: 'Contabilidad', description: 'Plan de cuentas, asientos, balances.', color: 'amber' }
]

const differentiators = [
  { icon: 'i-lucide-database', title: 'Multi-tenant real', description: 'Cada empresa tiene su propia base de datos PostgreSQL. Aislamiento real, no un flag en una tabla.', gradient: 'from-orange-500/20 to-cyan-500/20' },
  { icon: 'i-lucide-shield-check', title: 'Seguridad de verdad', description: 'JWT con refresh rotation, bcrypt, auditoría automática, soft-delete. Protegido desde el día uno.', gradient: 'from-cyan-500/20 to-violet-500/20' },
  { icon: 'i-lucide-key-round', title: 'Control de acceso granular', description: 'Roles por defecto + permisos por módulo + overrides por usuario. RBAC completo.', gradient: 'from-violet-500/20 to-orange-500/20' },
  { icon: 'i-lucide-code-2', title: 'Open source, moderno', description: 'NestJS + Prisma + PostgreSQL + Nuxt 3. TypeScript en todo, sin deuda técnica.', gradient: 'from-green-500/20 to-cyan-500/20' }
]

const techStack = {
  backend: [
    { name: 'NestJS 11', desc: 'Framework Node.js empresarial' },
    { name: 'Prisma 7', desc: 'ORM type-safe y migraciones' },
    { name: 'PostgreSQL', desc: 'Base de datos robusta' },
    { name: 'JWT + bcrypt', desc: 'Autenticación segura' }
  ],
  frontend: [
    { name: 'Nuxt 4', desc: 'Framework Vue 3 con SSR' },
    { name: 'Nuxt UI 4', desc: 'Componentes UI modernos' },
    { name: 'Tailwind CSS', desc: 'Estilos utility-first' },
    { name: 'Pinia', desc: 'State management' }
  ]
}

const securityFeatures = [
  { icon: 'i-lucide-key', title: 'Autenticación', items: ['JWT access tokens (24h) + refresh tokens (7d)', 'Refresh rotation con ventana de gracia', 'SHA-256 hashing de tokens', 'Cambio de contraseña revoca sesiones'] },
  { icon: 'i-lucide-shield', title: 'Autorización', items: ['Guard chain: Tenant, Access, JWT, Permissions', 'DENY > ALLOW > role > default deny', 'OWNER bypass completo'] },
  { icon: 'i-lucide-eye', title: 'Auditoría', items: ['Logs automáticos con old/new data', 'userId e IP en cada operación', 'Schemas separados público/tenant'] }
]

const costingFeatures = [
  { icon: 'i-lucide-git-branch', title: 'Árbol BOM recursivo', description: 'Recorré la estructura completa de tu producto hoja por hoja. Cada componente resolve su costo real y se agrega hacia arriba.', color: 'orange' },
  { icon: 'i-lucide-ruler', title: 'Estructura de Ingeniería', description: 'Cálculo físico por superficie, volumen o lineal. Densidad, desperdicio y dimensiones reales de cada pieza.', color: 'cyan' },
  { icon: 'i-lucide-settings', title: 'Drivers de Costo', description: 'Plantillas con capas: Material → Mano de obra → Overhead → Otro. Porcentaje o fijo por unidad.', color: 'violet' },
  { icon: 'i-lucide-bar-chart-3', title: 'Análisis Pareto', description: 'Identificá los componentes que más impactan tu costo. El 20% de los materiales representa el 80% del costo total.', color: 'green' }
]

function moduleColor(c: string) {
  const map: Record<string, { bg: string; text: string }> = {
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' }
  }
  return map[c] || map.orange
}
</script>

<template>
  <div>
    <!-- HERO -->
    <section ref="heroRef" class="relative overflow-hidden pb-24 pt-36 sm:pt-44">
      <div class="pointer-events-none absolute inset-0 transition-all duration-[2000ms] ease-out" :style="{ background: `radial-gradient(ellipse 600px 400px at ${mouseXPercent}% ${mouseYPercent}%, rgba(249,115,22,0.18) 0%, transparent 70%)` }" />
      <div class="pointer-events-none absolute inset-0 transition-all duration-[3000ms] ease-out" :style="{ background: `radial-gradient(ellipse 500px 500px at ${100 - mouseXPercent}% ${100 - mouseYPercent}%, rgba(34,211,238,0.1) 0%, transparent 70%)` }" />

      <div class="relative z-10 mx-auto max-w-6xl px-6 text-center">
        <div class="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm font-medium text-orange-400" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) forwards;">
          <UIcon name="i-lucide-sparkles" class="size-4" />
          ERP Multi-tenant para pymes argentinas
        </div>

        <h1 class="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both;">
          Tu ERP, tu
          <span class="text-orange-500">regla.</span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both;">
          Gestión empresarial completa para pymes argentinas. Ventas, compras, logística, stock, contabilidad y RRHH en una sola plataforma.
        </p>

        <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s both;">
          <UButton to="/register" color="primary" size="xl" label="Crear mi empresa" icon="i-lucide-arrow-right" :trailing="true" class="glow-orange rounded-xl px-8 font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(249,115,22,0.35)]" />
          <UButton to="/login" variant="outline" color="neutral" size="xl" label="Ver demo" icon="i-lucide-play" class="rounded-xl px-8 font-semibold transition-all duration-300 hover:-translate-y-1 hover:border-white/20" />
        </div>

        <div class="mx-auto mt-16 flex max-w-lg flex-wrap items-center justify-center gap-8 sm:gap-12" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both;">
          <div class="text-center">
            <p class="font-display text-2xl font-bold text-white">7+</p>
            <p class="text-xs text-gray-500">Módulos</p>
          </div>
          <div class="h-8 w-px bg-white/10" />
          <div class="text-center">
            <p class="font-display text-2xl font-bold text-white">100%</p>
            <p class="text-xs text-gray-500">Open source</p>
          </div>
          <div class="h-8 w-px bg-white/10" />
          <div class="text-center">
            <p class="font-display text-2xl font-bold text-white">Real</p>
            <p class="text-xs text-gray-500">Multi-tenant</p>
          </div>
        </div>

        <div class="mt-16 flex flex-col items-center gap-2 text-gray-600" style="animation: fade-in-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s both;">
          <span class="text-xs tracking-widest uppercase">Scroll</span>
          <div style="animation: scroll-indicator 2s ease-in-out infinite;">
            <UIcon name="i-lucide-chevron-down" class="size-5" />
          </div>
        </div>
      </div>
    </section>

    <!-- PROBLEMA / SOLUCION -->
    <section class="relative border-y border-white/5 py-24">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent" />
      <div class="relative mx-auto max-w-6xl px-6">
        <div class="grid gap-16 lg:grid-cols-2 lg:items-start">
          <div class="lg:sticky lg:top-32">
            <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-orange-400 reveal">El problema</p>
            <h2 class="font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl reveal">
              Tu negocio merece más que planillas
            </h2>
            <p class="mt-6 text-lg leading-relaxed text-gray-400 reveal">
              Las pymes argentinas crecen con Excel, WhatsApp y llamadas. Pero llega un punto donde las herramientas no dan más.
            </p>
            <div class="mt-8 flex items-center gap-3 reveal">
              <div class="h-px flex-1 bg-gradient-to-r from-orange-500/50 to-transparent" />
              <span class="text-sm font-medium text-gray-500">No es un problema de gente</span>
              <div class="h-px flex-1 bg-gradient-to-l from-orange-500/50 to-transparent" />
            </div>
            <p class="mt-4 text-center text-lg font-semibold text-white reveal">
              Es un problema de <span class="text-orange-400">herramientas</span>.
            </p>
          </div>
          <div class="space-y-4 stagger-children">
            <div v-for="(pain, i) in painPoints" :key="i" class="reveal group flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-orange-500/20 hover:bg-orange-500/[0.04]">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition-colors group-hover:bg-orange-500/10 group-hover:text-orange-400">
                <UIcon :name="pain.icon" class="size-5" />
              </div>
              <div>
                <p class="font-semibold text-white">{{ pain.title }}</p>
                <p class="text-sm text-gray-500">{{ pain.sub }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-24 text-center reveal">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-cyan-400">La solución</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl">
            Asterisk Suite: un ERP que se adapta a <span class="text-orange-400">vos</span>
          </h2>
          <p class="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Plataforma ERP/Logística multi-tenant. Cada empresa tiene su propia base de datos aislada, con control total sobre ventas, compras, inventario, logística y más.
          </p>
          <p class="mt-4 font-display text-xl font-semibold text-white">
            Una plataforma. Todo conectado. Sin excusas.
          </p>
        </div>
      </div>
    </section>

    <!-- MODULOS -->
    <section id="modulos" class="relative py-24">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent" />
      <div class="relative mx-auto max-w-7xl px-6">
        <div class="mb-16 text-center">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-orange-400 reveal">Plataforma</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl reveal">Módulos</h2>
          <p class="mt-3 text-gray-400 reveal">Todo lo que necesitás, integrado en una sola plataforma.</p>
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          <div
            v-for="mod in modules"
            :key="mod.title"
            class="reveal group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-500 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-xl"
            :class="[mod.featured ? 'sm:col-span-2 lg:col-span-2 lg:row-span-1' : '']"
          >
            <div class="absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" :class="moduleColor(mod.color).bg" />
            <div class="relative">
              <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" :class="[moduleColor(mod.color).bg, moduleColor(mod.color).text]">
                <UIcon :name="mod.icon" class="size-6" />
              </div>
              <h3 class="font-display text-lg font-semibold text-white">{{ mod.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-gray-400">{{ mod.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- COSTOS -->
    <section id="costos" class="relative border-y border-white/5 py-24">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent" />
      <div class="relative mx-auto max-w-7xl px-6">
        <div class="mb-16 text-center">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400 reveal">Manufactura</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl reveal">Motor de Costos</h2>
          <p class="mt-3 text-gray-400 reveal">Calculá el costo real de cada producto desde la materia prima hasta el producto terminado.</p>
        </div>

        <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
          <!-- Left: BOM tree visualization -->
          <div class="reveal">
            <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div class="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <UIcon name="i-lucide-git-branch" class="size-4" />
                <span>Árbol de costos — Producto terminado</span>
              </div>
              <div class="space-y-3 font-mono text-sm">
                <!-- Root -->
                <div class="flex items-center gap-3 rounded-xl bg-orange-500/10 px-4 py-3">
                  <UIcon name="i-lucide-box" class="size-4 text-orange-400" />
                  <span class="flex-1 font-semibold text-white">Producto Final</span>
                  <span class="font-display font-bold text-orange-400">$12.500</span>
                </div>
                <!-- Level 1 -->
                <div class="ml-6 space-y-2 border-l-2 border-white/10 pl-4">
                  <div class="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <UIcon name="i-lucide-layers" class="size-3.5 text-orange-400" />
                    <span class="flex-1 text-gray-300">Material A</span>
                    <span class="text-orange-400">$4.200</span>
                  </div>
                  <div class="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <UIcon name="i-lucide-layers" class="size-3.5 text-orange-400" />
                    <span class="flex-1 text-gray-300">Ensamble B</span>
                    <span class="text-orange-400">$5.800</span>
                  </div>
                  <!-- Level 2 -->
                  <div class="ml-5 space-y-1.5 border-l-2 border-white/10 pl-4">
                    <div class="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-1.5 text-xs">
                      <UIcon name="i-lucide-circle" class="size-2 text-gray-600" />
                      <span class="flex-1 text-gray-400">Componente C</span>
                      <span class="text-gray-500">$2.100</span>
                    </div>
                    <div class="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-1.5 text-xs">
                      <UIcon name="i-lucide-circle" class="size-2 text-gray-600" />
                      <span class="flex-1 text-gray-400">Componente D</span>
                      <span class="text-gray-500">$3.700</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <UIcon name="i-lucide-settings" class="size-3.5 text-violet-400" />
                    <span class="flex-1 text-gray-300">Overhead (labor + indirecto)</span>
                    <span class="text-violet-400">$2.500</span>
                  </div>
                </div>
                <!-- Total bar -->
                <div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 mt-4">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Costo total</span>
                  <span class="font-display text-lg font-bold text-white">$12.500</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: features -->
          <div class="space-y-5 stagger-children">
            <div v-for="feat in costingFeatures" :key="feat.title" class="reveal group flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all duration-300 hover:border-amber-500/20 hover:bg-amber-500/[0.04]">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110" :class="[moduleColor(feat.color).bg, moduleColor(feat.color).text]">
                <UIcon :name="feat.icon" class="size-5" />
              </div>
              <div>
                <p class="font-display font-semibold text-white">{{ feat.title }}</p>
                <p class="mt-1 text-sm leading-relaxed text-gray-400">{{ feat.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIFERENCIADORES -->
    <section id="diferenciadores" class="relative border-y border-white/5 py-24">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent" />
      <div class="relative mx-auto max-w-7xl px-6">
        <div class="mb-16 text-center">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-cyan-400 reveal">Por qué nosotros</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl reveal">Diferenciadores</h2>
          <p class="mt-3 text-gray-400 reveal">Lo que nos hace diferentes a otros ERPs.</p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 stagger-children">
          <div
            v-for="diff in differentiators"
            :key="diff.title"
            class="reveal gradient-border group rounded-2xl bg-white/[0.02] p-8 transition-all duration-500 hover:bg-white/[0.04]"
          >
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110" :class="diff.gradient">
              <UIcon :name="diff.icon" class="size-6 text-white" />
            </div>
            <h3 class="font-display text-xl font-semibold text-white">{{ diff.title }}</h3>
            <p class="mt-3 leading-relaxed text-gray-400">{{ diff.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- STACK TECNOLOGICO -->
    <section id="stack" class="relative py-24">
      <div class="relative mx-auto max-w-5xl px-6">
        <div class="mb-16 text-center">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-violet-400 reveal">Tecnología</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl reveal">Stack Tecnológico</h2>
          <p class="mt-3 text-gray-400 reveal">Construido con las mejores tecnologías del mercado.</p>
        </div>
        <div class="grid gap-8 md:grid-cols-2 stagger-children">
          <div class="reveal rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <div class="mb-6 flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <UIcon name="i-lucide-server" class="size-5" />
              </div>
              <h3 class="font-display text-xl font-semibold text-white">Backend</h3>
            </div>
            <div class="space-y-4">
              <div v-for="tech in techStack.backend" :key="tech.name" class="flex items-start gap-3">
                <UIcon name="i-lucide-check-circle" class="mt-0.5 size-5 shrink-0 text-green-400" />
                <div>
                  <p class="font-medium text-white">{{ tech.name }}</p>
                  <p class="text-sm text-gray-500">{{ tech.desc }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="reveal rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <div class="mb-6 flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <UIcon name="i-lucide-monitor" class="size-5" />
              </div>
              <h3 class="font-display text-xl font-semibold text-white">Frontend</h3>
            </div>
            <div class="space-y-4">
              <div v-for="tech in techStack.frontend" :key="tech.name" class="flex items-start gap-3">
                <UIcon name="i-lucide-check-circle" class="mt-0.5 size-5 shrink-0 text-green-400" />
                <div>
                  <p class="font-medium text-white">{{ tech.name }}</p>
                  <p class="text-sm text-gray-500">{{ tech.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SEGURIDAD -->
    <section id="seguridad" class="relative border-y border-white/5 py-24">
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-green-500/[0.02] to-transparent" />
      <div class="relative mx-auto max-w-7xl px-6">
        <div class="mb-16 text-center">
          <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-green-400 reveal">Protección</p>
          <h2 class="font-display text-3xl font-bold text-white sm:text-4xl reveal">Seguridad</h2>
          <p class="mt-3 text-gray-400 reveal">Protección en cada capa de la plataforma.</p>
        </div>
        <div class="grid gap-6 md:grid-cols-3 stagger-children">
          <div v-for="feature in securityFeatures" :key="feature.title" class="reveal group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-500 hover:border-green-500/20 hover:bg-green-500/[0.02]">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400 transition-transform duration-300 group-hover:scale-110">
              <UIcon :name="feature.icon" class="size-6" />
            </div>
            <h3 class="mb-4 font-display text-xl font-semibold text-white">{{ feature.title }}</h3>
            <ul class="space-y-3">
              <li v-for="item in feature.items" :key="item" class="flex items-start gap-2 text-sm text-gray-400">
                <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-green-400" />
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA FINAL -->
    <section ref="ctaRef" class="relative overflow-hidden py-24">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/15 blur-[120px]" />
        <div class="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <!-- Particles -->
      <div v-for="p in particles" :key="p.id" class="pointer-events-none absolute rounded-full bg-orange-400" :style="{ left: p.x + '%', bottom: '40%', width: p.size + 'px', height: p.size + 'px', animation: `particle-float 0.8s ${p.delay}s ease-out forwards` }" />

      <div class="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h2 class="font-display text-3xl font-bold text-white sm:text-5xl reveal">
          ¿Listo para dejar de trabar con planillas?
        </h2>
        <p class="mt-6 text-lg text-gray-400 reveal">
          Creá tu empresa en minutos. Sin compromisos. Sin tarjeta de crédito.
        </p>
        <div class="mt-10 reveal">
          <div class="relative inline-block" @mouseenter="spawnParticles">
            <UButton
              to="/register"
              color="primary"
              size="xl"
              label="Crear mi empresa"
              icon="i-lucide-arrow-right"
              :trailing="true"
              class="glow-orange rounded-xl px-10 text-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(249,115,22,0.4)]"
            />
          </div>
          <p class="mt-4 text-sm text-gray-500">Setup en menos de 5 minutos</p>
        </div>
      </div>
    </section>
  </div>
</template>
