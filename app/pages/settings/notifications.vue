<script setup lang="ts">
const loading = ref(true)
const saving = ref(false)
const pageError = ref('')
const contact = reactive({ phone_e164: '', opted_in: false, consent_at: null as string | null })
const toast = useToast()

definePageMeta({
  middleware: ['auth']
})

async function loadContact() {
  loading.value = true
  pageError.value = ''
  try {
    const result = await $fetch<{ phone_e164: string; opted_in: boolean; consent_at: string | null }>('/api/backend/notifications/whatsapp/contact')
    contact.phone_e164 = result.phone_e164 ?? ''
    contact.opted_in = Boolean(result.opted_in)
    contact.consent_at = result.consent_at ?? null
  } catch (error: any) {
    pageError.value = error?.data?.message ?? error.message ?? 'No se pudieron cargar tus preferencias.'
  } finally {
    loading.value = false
  }
}

async function saveContact() {
  saving.value = true
  try {
    const result = await $fetch<{ phone_e164: string; opted_in: boolean; consent_at: string | null }>('/api/backend/notifications/whatsapp/contact', {
      method: 'PUT',
      body: { phone_e164: contact.phone_e164, opted_in: contact.opted_in }
    })
    contact.phone_e164 = result.phone_e164 ?? ''
    contact.opted_in = Boolean(result.opted_in)
    contact.consent_at = result.consent_at ?? null
    toast.add({ title: 'Preferencias guardadas', description: contact.opted_in ? 'Ya podés recibir los avisos que te correspondan.' : 'Se desactivaron los avisos de WhatsApp.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudieron guardar', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(loadContact)
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4">
    <UAlert v-if="pageError" color="error" variant="subtle" title="No se pudieron cargar las preferencias" :description="pageError" />

    <UPageCard
      title="Avisos dentro de Asterisk Suite"
      description="Las asignaciones dirigidas a vos y las alertas operativas de tu empresa aparecen en la campana de la barra superior."
      variant="subtle"
    >
      <div class="flex items-start gap-3 text-sm text-muted">
        <UIcon name="i-lucide-bell" class="mt-0.5 size-5 shrink-0 text-primary" />
        <p>Al abrir la campana se actualizan las asignaciones, vencimientos fiscales y avisos de Tesorería disponibles para tus permisos.</p>
      </div>
    </UPageCard>

    <UPageCard
      title="Avisos por WhatsApp"
      description="Usamos este número solo para las notificaciones operativas que tengas habilitadas en tu empresa."
      variant="subtle"
    >
      <div v-if="loading" class="space-y-3">
        <USkeleton class="h-5 w-48" />
        <USkeleton class="h-10 w-full" />
      </div>
      <div v-else class="flex flex-col gap-4">
        <UFormField label="Número de WhatsApp" description="Formato internacional, con + y código de país. Ejemplo: +54911XXXXXXXX." required>
          <UInput v-model="contact.phone_e164" type="tel" autocomplete="tel" placeholder="+54911XXXXXXXX" class="w-full" />
        </UFormField>
        <div class="flex flex-col gap-3 rounded-lg border border-default p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-medium">Acepto recibir avisos operativos</p>
            <p class="text-sm text-muted">Podés desactivarlos o cambiar el número cuando quieras.</p>
          </div>
          <USwitch v-model="contact.opted_in" aria-label="Aceptar avisos de WhatsApp" />
        </div>
        <div class="flex justify-end">
          <UButton label="Guardar preferencias" icon="i-lucide-save" :loading="saving" @click="saveContact" />
        </div>
      </div>
    </UPageCard>
  </div>
</template>
