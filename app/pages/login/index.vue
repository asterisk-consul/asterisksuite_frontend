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
  <div class="relative flex flex-col items-center justify-center mx-auto h-screen overflow-hidden bg-black">
    <!-- Fondo tipo "aurora" -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-emerald-500/30 blur-[120px]" />
      <div class="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-purple-600/30 blur-[120px]" />
      <div class="absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full bg-orange-500/20 blur-[130px]" />
      <div class="absolute inset-0 bg-black/40" />
    </div>

    <UPageCard class="relative z-10 w-full max-w-md backdrop-blur-sm bg-white/5 border border-white/10">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Bienvenido"
        description="Ingresa usuario y contraseña"
        icon="i-lucide-user"
        @submit="onSubmit"
      >
        <template #description>
          No tienes una cuenta?
          <ULink to="/register" class="text-primary font-medium">Registrate</ULink>
          .
        </template>
        <template #password-hint>
          <ULink to="/change-password" class="text-primary font-medium" tabindex="-1">Olvidaste tu contraseña?</ULink>
        </template>

        <!-- Error dinámico -->
        <template #validation>
          <UAlert
            v-if="showError"
            :title="errorMessage"
            color="error"
            icon="i-lucide-info"
            dismissible
            @close="closeAlert"
          />
        </template>
        <template #submit>
          <UButton label="Ingresar" type="submit" class="w-full flex justify-center" />
        </template>

        <template #footer>
          Al ingresar, aceptas nuestros
          <ULink to="#" class="text-primary font-medium">Términos de uso</ULink>
          .
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
