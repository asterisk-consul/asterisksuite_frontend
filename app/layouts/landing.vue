<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#0a0a0a' }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: { lang: 'es' }
})

useSeoMeta({
  title: 'Asterisk Suite — ERP para pymes argentinas',
  description: 'Gestión empresarial completa. Ventas, compras, logística, stock, contabilidad y RRHH en una sola plataforma multi-tenant.',
  ogTitle: 'Asterisk Suite',
  ogDescription: 'Tu ERP, tu regla. Plataforma ERP/Logística para pymes argentinas.',
  ogType: 'website'
})

const route = useRoute()
const isScrolled = ref(false)
const mobileOpen = ref(false)

function onScroll() {
  isScrolled.value = window.scrollY > 20
}

function closeMobile() {
  mobileOpen.value = false
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

const navLinks = [
  { label: 'Módulos', to: '#modulos' },
  { label: 'Costos', to: '#costos' },
  { label: 'Diferenciadores', to: '#diferenciadores' },
  { label: 'Stack', to: '#stack' },
  { label: 'Seguridad', to: '#seguridad' }
]
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <!-- NAVBAR -->
    <header
      class="fixed top-0 right-0 left-0 z-50 transition-all duration-500"
      :class="isScrolled ? 'border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl' : 'bg-transparent'"
    >
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2.5 group">
          <div class="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 transition-shadow group-hover:shadow-orange-500/40">
            <UIcon name="i-lucide-building-2" class="text-lg text-white" />
          </div>
          <span class="font-display text-xl font-bold tracking-tight text-white">Asterisk Suite</span>
        </NuxtLink>

        <!-- Links (desktop) -->
        <div class="hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            {{ link.label }}
          </NuxtLink>
        </div>

        <!-- CTA desktop -->
        <div class="hidden items-center gap-3 md:flex">
          <UButton
            to="/login"
            variant="ghost"
            color="neutral"
            label="Ingresar"
            size="sm"
          />
          <UButton
            to="/register"
            color="primary"
            label="Crear empresa"
            size="sm"
            class="shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/40 hover:-translate-y-0.5"
          />
        </div>

        <!-- Mobile toggle -->
        <button
          class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          @click="mobileOpen = !mobileOpen"
          :aria-label="mobileOpen ? 'Cerrar menú' : 'Abrir menú'"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
        </button>
      </nav>

      <!-- Mobile menu -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="mobileOpen"
          class="border-b border-white/10 bg-[#0a0a0a]/95 px-6 py-4 backdrop-blur-xl md:hidden"
        >
          <div class="flex flex-col gap-1">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              @click="closeMobile"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
          <div class="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <UButton
              to="/login"
              variant="outline"
              color="neutral"
              label="Iniciar sesión"
              size="sm"
              block
              @click="closeMobile"
            />
            <UButton
              to="/register"
              color="primary"
              label="Crear empresa"
              size="sm"
              block
              @click="closeMobile"
            />
          </div>
        </div>
      </Transition>
    </header>

    <!-- CONTENT -->
    <main>
      <slot />
    </main>

    <!-- FOOTER -->
    <footer class="border-t border-white/10 bg-[#0a0a0a]">
      <div class="mx-auto max-w-7xl px-6 py-16">
        <div class="grid gap-12 md:grid-cols-4">
          <!-- Brand -->
          <div class="md:col-span-2">
            <div class="flex items-center gap-2.5">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                <UIcon name="i-lucide-building-2" class="text-white" />
              </div>
              <span class="font-display text-xl font-bold text-white">Asterisk Suite</span>
            </div>
            <p class="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
              ERP/Logística multi-tenant para pymes argentinas. Gestión integral de tu negocio con aislamiento real de datos.
            </p>
            <div class="mt-6 flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener" class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-500 transition-all hover:bg-white/10 hover:text-white" aria-label="GitHub">
                <UIcon name="i-lucide-github" class="size-4" />
              </a>
            </div>
          </div>

          <!-- Producto -->
          <div>
            <h4 class="font-display text-sm font-semibold uppercase tracking-wider text-white">Producto</h4>
            <ul class="mt-4 space-y-3">
              <li><NuxtLink to="#modulos" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Módulos</NuxtLink></li>
              <li><NuxtLink to="#diferenciadores" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Diferenciadores</NuxtLink></li>
              <li><NuxtLink to="#stack" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Stack tecnológico</NuxtLink></li>
              <li><NuxtLink to="#seguridad" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Seguridad</NuxtLink></li>
            </ul>
          </div>

          <!-- Acceso -->
          <div>
            <h4 class="font-display text-sm font-semibold uppercase tracking-wider text-white">Acceso</h4>
            <ul class="mt-4 space-y-3">
              <li><NuxtLink to="/login" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Iniciar sesión</NuxtLink></li>
              <li><NuxtLink to="/register" class="text-sm text-gray-500 transition-colors hover:text-orange-400">Crear cuenta</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p class="text-xs text-gray-600">
            &copy; {{ new Date().getFullYear() }} Asterisk Suite. Todos los derechos reservados.
          </p>
          <p class="text-xs text-gray-600">
            Hecho con Nuxt, Prisma y PostgreSQL
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
