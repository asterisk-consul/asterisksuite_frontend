<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { buildDocumentDuplicateValues, buildDocumentExtensionDuplicateValues } from '~/modulos/erp/documents/utils/document-duplicate'
import { getDocumentSubmitError } from '~/utils/document-submit-error'

const PresupuestoForm = defineAsyncComponent(() => import('~/modulos/erp/documents/presupuesto/PresupuestoForm.vue'))
const OrdenVentaForm = defineAsyncComponent(() => import('~/modulos/erp/documents/orden-venta/OrdenVentaForm.vue'))

const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const presupuestoRef = ref<any>(null)
const ordenVentaRef = ref<any>(null)
const extensionDraft = ref<Record<string, any>>({})

const partyId = computed(() => (route.query.party_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)
const parentOrderId = computed(() => (route.query.parent_order_id as string) || undefined)
const duplicateId = computed(() => (route.query.duplicate_id as string) || undefined)
const intakeId = computed(() => route.query.intakeId as string | undefined)

const isQuote = computed(() => category.value === 'QUOTE')
const isOrder = computed(() => category.value === 'ORDER')
const isRemito = computed(() => category.value === 'REMITO')

const pageDescription = computed(() => isRemito.value
  ? 'Indicá las cantidades y el depósito de salida de cada producto'
  : 'Completá los datos y agregá los productos'
)

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
const duplicateData = ref<any>(null)

onMounted(async () => {
  if (duplicateId.value) {
    try {
      duplicateData.value = await DocumentsSalesService.getOne(duplicateId.value)
      const sourceCategory = duplicateData.value.document_types?.category
      if (sourceCategory !== category.value || !['ORDER', 'INVOICE'].includes(sourceCategory)) {
        throw new Error('El documento no coincide con el tipo que se quiere duplicar.')
      }
      if (isOrder.value) extensionDraft.value = buildDocumentExtensionDuplicateValues(duplicateData.value.orden_venta_doc)
      toast.add({ title: 'Copia preparada', description: 'Revisá los datos y guardá para crear el borrador con el próximo número disponible.', color: 'info' })
    } catch (e: any) {
      duplicateData.value = null
      toast.add({ title: 'No se pudo cargar el documento para duplicarlo', description: e?.data?.message || e?.message, color: 'error' })
    }
  }
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
  if (duplicateData.value) return buildDocumentDuplicateValues(duplicateData.value)

  const base: any = {}

  // Si viene de una OV, pre-cargar datos
  if (orderData.value) {
    base.party_id = orderData.value.party_id
    base.currency_code = orderData.value.currency_code
    base.descrip = orderData.value.descrip || ''
    base.ref = orderData.value.ref || ''
    base.items = (orderData.value.document_items ?? []).map((item: any) => {
      const processedQuantity = isRemito.value
        ? Number(item.quantity_delivered ?? 0)
        : Number(item.quantity_invoiced ?? 0)

      return {
        product_id: item.product_id,
        quantity: Number(item.quantity) - processedQuantity,
        unit_price: Number(item.original_unit_price ?? item.unit_price),
        discount_percentage: Number(item.discount_percentage ?? 0),
      }
    }).filter((item: any) => item.quantity > 0)

    const sourceBase = (orderData.value.document_items ?? []).reduce((sum: number, item: any) =>
      sum + Number(item.quantity) * Number(item.original_unit_price ?? item.unit_price)
        * (1 - Number(item.discount_percentage ?? 0) / 100), 0)
    const targetBase = base.items.reduce((sum: number, item: any) =>
      sum + Number(item.quantity) * Number(item.unit_price) * (1 - Number(item.discount_percentage ?? 0) / 100), 0)
    const ratio = sourceBase > 0 ? Math.min(1, targetBase / sourceBase) : 1
    base.commercial_adjustments = (orderData.value.commercial_adjustments ?? []).map((adjustment: any) => ({
      concept: adjustment.concept,
      value_type: adjustment.value_type,
      basis: adjustment.basis,
      value: adjustment.value_type === 'AMOUNT' ? Number(adjustment.value) * ratio : Number(adjustment.value),
    }))
  }

  // Si viene party_id por query
  if (partyId.value && !base.party_id) {
    base.party_id = partyId.value
  }

  return Object.keys(base).length > 0 ? base : undefined
})

async function handleSubmit(payload: any) {
  if (saving.value) return
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

    // Los controles opcionales usan '' cuando están vacíos. Class-validator
    // considera ese valor presente y rechaza UUID/fechas opcionales; omitirlos
    // permite que el backend los persista como null.
    const normalizedPayload = Object.fromEntries(
      Object.entries(fullPayload).filter(([key, value]) =>
        value !== '' || key === 'document_type_id' || key === 'date'
      )
    )

    const created = await DocumentsSalesService.create(normalizedPayload)
    formRef.value?.completeDraft()
    if (intakeId.value) {
      await $fetch(`/api/intake-records/${intakeId.value}/complete`, {
        method: 'POST', body: { target_type: 'SALES_DOCUMENT', target_id: created.id }
      })
    }
    toast.add({ title: `${pageTitle.value} creado`, color: 'success' })
    router.push(`/erp/sales/${created.id}`)
  } catch (e: any) {
    toast.add({
      title: `Error al crear ${pageTitle.value.toLowerCase()}`,
      description: getDocumentSubmitError(e, 'No se pudo crear el comprobante de venta.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <UPage class="space-y-6">
        <AppPageHeader
          :title="`Crear ${pageTitle}`"
          :description="pageDescription"
        >
          <template #links>
            <UButton :label="`Guardar ${pageTitle}`" icon="i-lucide-check" :loading="saving" @click="formRef?.submit()">
              <template #trailing>
                <KeyboardShortcutHint :keys="['Ctrl', 'S']" />
              </template>
            </UButton>
          </template>
        </AppPageHeader>

        <UPageBody class="mx-auto w-full max-w-screen-2xl space-y-6">
          <!-- Form principal (genérico) -->
          <SalesDocumentForm
            ref="formRef"
            :loading="saving"
            module-code="SALES"
            :category="category"
            :operational-mode="isRemito"
            :initial-values="initialValues"
            :parent-document-id="parentOrderId"
            :draft-extension="extensionDraft"
            @submit="handleSubmit"
            @restore-extension="extensionDraft = $event"
          >
            <template #document-details>
              <PresupuestoForm v-if="isQuote" ref="presupuestoRef" v-model="extensionDraft" />
              <OrdenVentaForm v-else-if="isOrder" ref="ordenVentaRef" v-model="extensionDraft" />
            </template>
          </SalesDocumentForm>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
