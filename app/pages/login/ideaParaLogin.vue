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
const toast = useToast()
const auth = useAuthStore()

const errorMessage = ref('')
const showError = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    showError.value = false

    await auth.login(payload.data.username, payload.data.password)

    toast.add({
      title: 'Ingreso exitoso',
      description: `Bienvenido ${auth.user?.name}`,
      color: 'success'
    })

    if (auth.needsCompanySelection) {
      await navigateTo('/select-company')
    } else {
      await navigateTo('/')
    }
  } catch (err: any) {
    errorMessage.value = err?.message || err?.data?.message || 'Usuario o contraseña incorrectos'

    showError.value = true
  }
}

function closeAlert() {
  showError.value = false
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-neutral-950">
    <!-- Fondo -->
    <div class="absolute inset-0">
      <!-- Gradiente -->
      <div class="absolute -top-40 left-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />

      <div class="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-3xl" />

      <!-- Grid -->
      <div
        class="absolute inset-0 opacity-10"
        style="
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 40px 40px;
        "
      />
    </div>

    <!-- Contenido -->
    <div class="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-between px-8">
      <!-- Lado izquierdo -->
      <div class="hidden w-1/2 lg:block">
        <h1 class="text-6xl font-black text-white">Asterisk</h1>

        <p class="mt-6 max-w-xl text-xl leading-9 text-gray-300">
          Gestiona clientes, ventas, logística, stock y contabilidad desde una única plataforma.
        </p>

        <div class="mt-10 space-y-4">
          <div class="flex items-center gap-3 text-white">
            <UIcon name="i-lucide-check-circle" class="text-orange-400" />
            Facturación electrónica
          </div>

          <div class="flex items-center gap-3 text-white">
            <UIcon name="i-lucide-check-circle" class="text-orange-400" />
            Control de Stock
          </div>

          <div class="flex items-center gap-3 text-white">
            <UIcon name="i-lucide-check-circle" class="text-orange-400" />
            CRM
          </div>

          <div class="flex items-center gap-3 text-white">
            <UIcon name="i-lucide-check-circle" class="text-orange-400" />
            Logística
          </div>

          <div class="flex items-center gap-3 text-white">
            <UIcon name="i-lucide-check-circle" class="text-orange-400" />
            Contabilidad
          </div>
        </div>
      </div>

      <!-- Login -->
      <UPageCard class="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
            <UIcon name="i-lucide-building-2" class="text-3xl text-white" />
          </div>

          <h2 class="text-3xl font-bold text-white">Bienvenido</h2>

          <p class="mt-2 text-gray-400">Ingresa para acceder a tu espacio de trabajo.</p>
        </div>

        <UAuthForm :schema="schema" :fields="fields" @submit="onSubmit">
          <template #description>
            ¿No tienes cuenta?

            <ULink to="/register" class="font-semibold text-orange-400">Crear cuenta</ULink>
          </template>

          <template #password-hint>
            <ULink to="/change-password" class="font-medium text-orange-400">¿Olvidaste tu contraseña?</ULink>
          </template>

          <template #validation>
            <UAlert v-if="showError" color="error" :title="errorMessage" icon="i-lucide-circle-alert" variant="soft" />
          </template>

          <template #submit>
            <UButton block size="xl" color="primary" label="Ingresar" />
          </template>
        </UAuthForm>
      </UPageCard>
    </div>
  </div>
</template>
<style scoped>
:deep(.btn-primary) {
  transition: 0.25s;
}

:deep(.btn-primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(249, 115, 22, 0.35);
}
</style>
