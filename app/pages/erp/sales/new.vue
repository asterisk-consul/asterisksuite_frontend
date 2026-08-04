<script setup lang="ts">
definePageMeta({
  layout: 'erp',
  middleware: ['auth']
})

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import PresupuestoForm from '~/modulos/erp/documents/presupuesto/PresupuestoForm.vue'
import OrdenVentaForm from '~/modulos/erp/documents/orden-venta/OrdenVentaForm.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'

const { mainCollapsed } = useSidebarState()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const presupuestoRef = ref<InstanceType<typeof PresupuestoForm> | null>(null)
const ordenVentaRef = ref<InstanceType<typeof OrdenVentaForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)

const isQuote = computed(() => category.value === 'QUOTE')
const isOrder = computed(() => category.value === 'ORDER')

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

    // Combinar payload base con campos de extensión
    let extensionData = {}
    if (isQuote.value && presupuestoRef.value) {
      extensionData = presupuestoRef.value.getFormData()
    } else if (isOrder.value && ordenVentaRef.value) {
      extensionData = ordenVentaRef.value.getFormData()
    }

    const fullPayload = { ...payload, ...extensionData }
    const created = await DocumentsSalesService.create(fullPayload)
    toast.add({ title: `${pageTitle.value} creado`, color: 'success' })
    router.push(`/erp/sales/${created.id}`)
  } catch (e: any) {
    const backendMsg = e?.data?.data?.message || e?.data?.message || e?.message || 'Error desconocido'
    toast.add({
      title: `Error al crear ${pageTitle.value.toLowerCase()}`,
      description: Array.isArray(backendMsg) ? backendMsg[0] : backendMsg,
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

        <UPageBody class="space-y-6">
          <!-- Form principal (genérico) -->
          <SalesDocumentForm ref="formRef" :loading="saving" module-code="SALES" :category="category" :initial-values="partyId ? { party_id: partyId } : undefined" @submit="handleSubmit" />

          <!-- Extensión: Presupuesto -->
          <PresupuestoForm v-if="isQuote" ref="presupuestoRef" />

          <!-- Extensión: Orden de Venta -->
          <OrdenVentaForm v-if="isOrder" ref="ordenVentaRef" />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
