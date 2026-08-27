<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import OrdenCompraForm from '~/modulos/erp/documents/orden-compra/OrdenCompraForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const extensionRef = ref<InstanceType<typeof OrdenCompraForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    const extension = extensionRef.value?.getFormData()
    const created = await DocumentsPurchasesService.create({ ...payload, ...extension })
    toast.add({ title: 'Orden de Compra creada', color: 'success' })
    router.push(`/erp/purchases/orders/${created.id}`)
  } catch (e: any) {
    const backendMsg = e?.data?.data?.message || e?.data?.message || e?.message || 'Error desconocido'
    toast.add({
      title: 'Error al crear orden de compra',
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
      title="Nueva Orden de Compra"
      description="Completá los datos y agregá los productos"
    >
      <template #links>
        <UButton
          label="Guardar Orden de Compra"
          icon="i-lucide-check"
          :loading="saving"
          @click="formRef?.submit()"
        />
      </template>
    </AppPageHeader>

    <div class="mx-auto w-full max-w-screen-2xl space-y-5">
      <SalesDocumentForm
        ref="formRef"
        :loading="saving"
        module-code="PURCHASES"
        category="ORDER"
        :initial-values="partyId ? { party_id: partyId } : undefined"
        @submit="handleSubmit"
      />
      <OrdenCompraForm ref="extensionRef" />
    </div>
  </UPage>
</template>
