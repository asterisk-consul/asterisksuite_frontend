<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    const created = await DocumentsPurchasesService.create(payload)
    toast.add({ title: 'Remito de Compra creado', color: 'success' })
    router.push(`/erp/purchases/remitos/${created.id}`)
  } catch (e: any) {
    const backendMsg = e?.data?.data?.message || e?.data?.message || e?.message || 'Error desconocido'
    toast.add({
      title: 'Error al crear remito de compra',
      description: Array.isArray(backendMsg) ? backendMsg[0] : backendMsg,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Nuevo Remito de Compra"
      description="Completá los datos y agregá los productos"
    >
      <template #links>
        <UButton
          label="Guardar Remito de Compra"
          icon="i-lucide-check"
          :loading="saving"
          @click="formRef?.submit()"
        />
      </template>
    </AppPageHeader>

    <div class="mx-auto w-full max-w-screen-2xl">
      <SalesDocumentForm
        ref="formRef"
        :loading="saving"
        module-code="PURCHASES"
        category="REMITO"
        :initial-values="partyId ? { party_id: partyId } : undefined"
        @submit="handleSubmit"
      />
    </div>
  </UPage>
</template>
