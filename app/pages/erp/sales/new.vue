<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

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
const parentOrderId = computed(() => (route.query.parent_order_id as string) || undefined)

const isQuote = computed(() => category.value === 'QUOTE')
const isOrder = computed(() => category.value === 'ORDER')

const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    QUOTE: 'Presupuesto',
    ORDER: 'Orden de Venta',
    REMITO: 'Remito',
    INVOICE: 'Factura',
    CREDIT_NOTE: 'Nota de Crédito',
    DEBIT_NOTE: 'Nota de Débito',
  }
  return labels[category.value ?? ''] ?? 'Documento de Venta'
})

// Cargar datos de la OV si viene de "Crear Factura"
const orderData = ref<any>(null)

onMounted(async () => {
  if (parentOrderId.value) {
    try {
      const order = await DocumentsSalesService.getOne(parentOrderId.value)
      orderData.value = order
    } catch (e: any) {
      toast.add({ title: 'Error al cargar la orden', description: e?.data?.message, color: 'error' })
    }
  }
})

const initialValues = computed(() => {
  const base: any = {}

  // Si viene de una OV, pre-cargar datos
  if (orderData.value) {
    base.party_id = orderData.value.party_id
    base.currency_code = orderData.value.currency_code
    base.descrip = orderData.value.descrip || ''
    base.ref = orderData.value.ref || ''
    base.items = (orderData.value.document_items ?? []).map((item: any) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity) - Number(item.quantity_invoiced ?? 0),
      unit_price: Number(item.unit_price),
    })).filter((item: any) => item.quantity > 0)
  }

  // Si viene party_id por query
  if (partyId.value && !base.party_id) {
    base.party_id = partyId.value
  }

  return Object.keys(base).length > 0 ? base : undefined
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

    const fullPayload = {
      ...payload,
      ...extensionData,
      parent_document_id: parentOrderId.value || undefined
    }
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
          <SalesDocumentForm ref="formRef" :loading="saving" module-code="SALES" :category="category" :initial-values="initialValues" :parent-document-id="parentOrderId" @submit="handleSubmit" />

          <!-- Extensión: Presupuesto -->
          <PresupuestoForm v-if="isQuote" ref="presupuestoRef" />

          <!-- Extensión: Orden de Venta -->
          <OrdenVentaForm v-if="isOrder" ref="ordenVentaRef" />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
