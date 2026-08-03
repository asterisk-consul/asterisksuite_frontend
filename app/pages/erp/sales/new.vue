<script setup lang="ts">
definePageMeta({
  layout: 'erp',
  middleware: ['auth']
})

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'

const { mainCollapsed } = useSidebarState()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)

const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    QUOTE: 'Presupuesto',
    ORDER: 'Orden de Venta',
    REMITO: 'Remito',
    INVOICE: 'Factura',
  }
  return labels[category.value ?? ''] ?? 'Documento de Venta'
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    const created = await DocumentsSalesService.create(payload)
    toast.add({ title: `${pageTitle.value} creado`, color: 'success' })
    router.push(`/erp/sales/${created.id}`)
  } catch (e: any) {
    toast.add({
      title: `Error al crear ${pageTitle.value.toLowerCase()}`,
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
      <UDashboardNavbar :title="`Nuevo ${pageTitle}`">
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
          :title="`Crear ${pageTitle}`"
          description="Completá los datos y agregá los productos"
          :links="[
            {
              label: `Guardar ${pageTitle}`,
              icon: 'i-lucide-check',
              loading: saving,
              onClick: () => formRef?.submit()
            }
          ]"
        />

        <UPageBody>
          <SalesDocumentForm ref="formRef" :loading="saving" module-code="SALES" :initial-values="partyId ? { party_id: partyId } : undefined" @submit="handleSubmit" />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
