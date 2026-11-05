<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { schema } from './schema/login.schema'
import type { Schema } from './schema/login.schema'
import { fields } from './fields'

definePageMeta({
  layout: 'public',
  auth: false
})

const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()

const errorMessage = ref('')
const showError = ref(false)
const isSubmitting = ref(false)

const authFormUi = {
  root: 'min-w-0 space-y-0',
  header: 'mb-6 space-y-2',
  leading: 'mb-1 flex size-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10',
  leadingIcon: 'size-5 text-orange-300',
  title: 'font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]',
  description: 'text-sm leading-6 text-slate-400',
  body: 'space-y-5',
  form: 'space-y-4',
  footer: 'mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400'
}

const tenantSubdomain = computed(() => auth.getCurrentTenantSubdomain())

function formatSubdomainAsName(subdomain: string) {
  return subdomain
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase('es-AR')}${part.slice(1)}`)
    .join(' ')
}

const tenantCompanyName = computed(() => {
  const subdomain = tenantSubdomain.value
  if (!subdomain) return auth.selectedCompany?.name ?? null

  const membership = auth.companies.find((company) => company.subdomain.toLowerCase() === subdomain)
  if (membership?.name) return membership.name
  if (auth.selectedCompany?.subdomain.toLowerCase() === subdomain) return auth.selectedCompany.name

  return formatSubdomainAsName(subdomain)
})

useHead({
  title: 'Iniciar sesión',
  meta: [{ name: 'description', content: 'Ingresá a tu espacio de trabajo en Asterisk Suite.' }]
})

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    showError.value = false

    await auth.login(payload.data.username, payload.data.password)

    toast.add({
      title: 'Ingreso exitoso',
      description: `Bienvenido ${auth.user?.name}`,
      color: 'success'
    })

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : ''

    if (safeRedirect) {
      await navigateTo(safeRedirect)
    } else if (auth.companies.length === 0) {
      await navigateTo('/create-company')
    } else if (auth.needsCompanySelection) {
      await navigateTo('/select-company')
    } else {
      await navigateTo('/')
    }
  } catch (err: any) {
    errorMessage.value = err?.message || err?.data?.message || 'Usuario o contraseña incorrectos'

    showError.value = true
  } finally {
    isSubmitting.value = false
  }
}

function closeAlert() {
  showError.value = false
}
</script>

<template>
  <div class="dark relative isolate min-h-dvh overflow-x-clip bg-[#090b11] text-white">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-40 -top-48 size-[30rem] rounded-full bg-orange-500/15 blur-[120px]" />
      <div class="absolute -bottom-48 right-[-8rem] size-[32rem] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
      <div class="absolute inset-0 bg-gradient-to-b from-[#090b11]/15 via-[#090b11]/50 to-[#090b11]" />
    </div>

    <main class="relative mx-auto flex min-h-dvh w-full max-w-7xl flex-col justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <div class="grid w-full items-center gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(27rem,0.82fr)] lg:gap-16 xl:gap-24">
        <section class="mx-auto w-full max-w-xl lg:mx-0">
          <NuxtLink to="/" class="inline-flex max-w-full items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400" aria-label="Asterisk Suite, ir al inicio">
            <img src="/branding/logo-dark.svg" alt="Asterisk Suite" class="h-auto w-48 max-w-full sm:w-56 lg:w-60">
          </NuxtLink>

          <div class="mt-4 lg:mt-12">
            <div class="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300 lg:flex">
              <span class="size-1.5 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.9)]" />
              Plataforma de gestión empresarial
            </div>
            <h1 class="mt-5 max-w-xl font-display text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl xl:text-5xl">
              Tu negocio,<br>
              <span class="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-200 bg-clip-text text-transparent">conectado en un solo lugar.</span>
            </h1>
            <p class="mt-4 max-w-lg text-sm leading-6 text-slate-400 lg:text-base lg:leading-7">
              Ingresá a Asterisk Suite y continuá tu trabajo desde un solo lugar.
            </p>
          </div>

          <div v-if="tenantCompanyName" class="mt-7 min-w-0 sm:mt-9">
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ingresando a</p>
            <p class="mt-1 truncate font-display text-lg font-semibold text-slate-100 sm:text-xl">{{ tenantCompanyName }}</p>
            <p v-if="tenantSubdomain" class="mt-0.5 truncate text-xs text-slate-500">{{ tenantSubdomain }}</p>
          </div>
        </section>

        <section class="mx-auto w-full max-w-md">
          <div class="mb-3 flex items-center justify-between px-1 sm:mb-4">
            <span class="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Acceso a tu espacio</span>
            <span class="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <UIcon name="i-lucide-shield-check" class="size-4 text-emerald-400" />
              Acceso seguro
            </span>
          </div>

          <div class="rounded-[1.75rem] border border-white/10 bg-[#11141d]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
            <UAuthForm
              :schema="schema"
              :fields="fields"
              :ui="authFormUi"
              :loading="isSubmitting"
              title="Iniciá sesión"
              description="Ingresá con las credenciales de tu cuenta."
              icon="i-lucide-sparkles"
              @submit="onSubmit"
            >
              <template #description>
                <div class="space-y-1.5">
                  <p>Ingresá con las credenciales de tu cuenta.</p>
                  <p class="text-sm text-slate-400">
                    ¿Todavía no tenés una cuenta?
                    <ULink to="/register" class="font-semibold text-orange-300 underline-offset-4 hover:text-orange-200 hover:underline">Crear cuenta</ULink>
                  </p>
                </div>
              </template>

              <template #password-hint>
                <ULink to="/change-password" class="font-medium text-orange-300 underline-offset-4 hover:text-orange-200 hover:underline" tabindex="-1">¿Olvidaste tu contraseña?</ULink>
              </template>

              <template #validation>
                <UAlert
                  v-if="showError"
                  :title="errorMessage"
                  color="error"
                  variant="subtle"
                  icon="i-lucide-circle-alert"
                  class="mt-1"
                  dismissible
                  @close="closeAlert"
                />
              </template>

              <template #submit="{ loading }">
                <UButton
                  label="Ingresar a Asterisk Suite"
                  icon="i-lucide-arrow-right"
                  trailing
                  type="submit"
                  block
                  size="xl"
                  color="primary"
                  :loading="loading"
                  class="min-h-12 rounded-xl bg-orange-500 font-semibold text-white shadow-lg shadow-orange-950/35 transition hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-orange-900/40 focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11141d]"
                />
              </template>

              <template #footer>
                <div class="flex items-start justify-center gap-2 text-center">
                  <UIcon name="i-lucide-lock-keyhole" class="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                  <span>Tu acceso te lleva al espacio de trabajo de tu empresa.</span>
                </div>
              </template>
            </UAuthForm>
          </div>

          <p class="mt-4 px-2 text-center text-xs leading-5 text-slate-500">
            ¿Tenés problemas para ingresar? Contactá al administrador de tu empresa.
          </p>
        </section>
      </div>

      <footer class="mt-8 text-center text-[11px] text-slate-600 lg:mt-10">
        © {{ new Date().getFullYear() }} Asterisk Suite · Gestión para avanzar.
      </footer>
    </main>
  </div>
</template>
