<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'

const { mainCollapsed } = useSidebarState()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const parentOrderId = computed(() => (route.query.parent_order_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)

const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    INVOICE: 'Factura',
    CREDIT_NOTE: 'Nota de Crédito',
    DEBIT_NOTE: 'Nota de Débito',
  }
  return labels[category.value ?? ''] ?? 'Comprobante de Compra'
})

// Cargar datos de la OC si viene de "Crear Factura"
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

  if (orderData.value) {
    base.party_id = orderData.value.party_id
    base.currency_code = orderData.value.currency_code
    base.descrip = orderData.value.descrip || ''
    base.ref = orderData.value.ref || ''
    base.items = (orderData.value.document_items ?? [])
      .map((item: any) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity) - Number(item.quantity_invoiced ?? 0),
        unit_price: Number(item.unit_price)
      }))
      .filter((item: any) => item.quantity > 0)
  }

  if (partyId.value && !base.party_id) {
    base.party_id = partyId.value
  }

  return Object.keys(base).length > 0 ? base : undefined
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    const fullPayload = {
      ...payload,
      parent_document_id: parentOrderId.value || undefined
    }
    const created = await DocumentsPurchasesService.create(fullPayload)
    toast.add({ title: `${pageTitle.value} creado`, color: 'success' })
    router.push(`/erp/purchases/purchases-documents/${created.id}`)
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

        <UPageBody class="mx-auto w-full max-w-screen-2xl">
          <SalesDocumentForm
            ref="formRef"
            :loading="saving"
            module-code="PURCHASES"
            :category="category"
            :initial-values="initialValues"
            :parent-document-id="parentOrderId"
            @submit="handleSubmit"
          />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
