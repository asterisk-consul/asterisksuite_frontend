<script setup lang="ts">
definePageMeta({
  layout: 'erp',
  middleware: ['auth']
})

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

const { mainCollapsed } = useSidebarState()
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
    toast.add({ title: 'Factura creada', color: 'success' })
    router.push(`/erp/purchases/purchases-documents/${created.id}`)
  } catch (e: any) {
    toast.add({
      title: 'Error al crear factura',
      description: e?.data?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Nueva Factura">
        <template #leading>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            @click="mainCollapsed = !mainCollapsed"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageHeader
          title="Crear Factura"
          description="Completá los datos y agregá los productos"
          :links="[
            {
              label: 'Guardar Factura',
              icon: 'i-lucide-check',
              loading: saving,
              onClick: () => formRef?.submit()
            }
          ]"
        />

        <UPageBody>
          <SalesDocumentForm ref="formRef" :loading="saving" module-code="PURCHASES" :initial-values="partyId ? { party_id: partyId } : undefined" @submit="handleSubmit" />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
