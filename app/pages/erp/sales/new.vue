<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { buildDocumentDuplicateValues, buildDocumentExtensionDuplicateValues } from '~/modulos/erp/documents/utils/document-duplicate'
import { getDocumentSubmitError } from '~/utils/document-submit-error'
import { useIntakeRecordsService } from '~/modulos/erp/intake/intake-records.service'
import { useSalesFlowService } from '~/modulos/erp/sales/services/sales-flow.service'

const PresupuestoForm = defineAsyncComponent(() => import('~/modulos/erp/documents/presupuesto/PresupuestoForm.vue'))
const OrdenVentaForm = defineAsyncComponent(() => import('~/modulos/erp/documents/orden-venta/OrdenVentaForm.vue'))

const route = useRoute()
const router = useRouter()
const toast = useToast()
const intakeService = useIntakeRecordsService()
const salesFlowService = useSalesFlowService()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const presupuestoRef = ref<any>(null)
const ordenVentaRef = ref<any>(null)
const extensionDraft = ref<Record<string, any>>({})
const requireDeliveryAddress = ref(false)
const warnWhenDeliveryDataEmpty = ref(true)
const deliverySettingsLoading = ref(false)
const emptyDeliveryConfirmOpen = ref(false)
const pendingEmptyDeliveryPayload = ref<Record<string, any> | null>(null)

watch(emptyDeliveryConfirmOpen, (open) => {
  if (!open) pendingEmptyDeliveryPayload.value = null
})

const partyId = computed(() => (route.query.party_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)
const parentOrderId = computed(() => (route.query.parent_order_id as string) || undefined)
const parentDocumentId = computed(() =>
  (route.query.parent_document_id as string) || (['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category.value ?? '') ? parentOrderId.value : undefined)
)
const duplicateId = computed(() => (route.query.duplicate_id as string) || undefined)
const intakeId = computed(() => route.query.intakeId as string | undefined)

const isQuote = computed(() => category.value === 'QUOTE')
const isOrder = computed(() => category.value === 'ORDER')
const isRemito = computed(() => category.value === 'REMITO')
const isInvoiceReferenceNote = computed(() => ['CREDIT_NOTE', 'DEBIT_NOTE'].includes(category.value ?? ''))
const missingNoteSource = computed(() => isInvoiceReferenceNote.value && !parentDocumentId.value)

const pageDescription = computed(() => isRemito.value
  ? 'Indicá las cantidades y el depósito de salida de cada producto'
  : missingNoteSource.value
    ? 'Para mantener la trazabilidad, iniciá la nota desde una factura confirmada'
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
const selectedDeliveryPartyId = ref('')

onMounted(async () => {
  if (isOrder.value) {
    deliverySettingsLoading.value = true
    try {
      const settings = await salesFlowService.getSettings()
      requireDeliveryAddress.value = settings.require_order_delivery_address ?? false
      warnWhenDeliveryDataEmpty.value = settings.warn_when_order_delivery_data_empty ?? true
    } catch {
      toast.add({ title: 'No se pudo cargar la regla de entrega de la OV', color: 'warning' })
    } finally {
      deliverySettingsLoading.value = false
    }
  }

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
  if (parentOrderId.value && !isInvoiceReferenceNote.value) {
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
        ...(isRemito ? { item_instructions: item.item_instructions ?? '' } : {}),
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
  if (saving.value || emptyDeliveryConfirmOpen.value) return
  if (isOrder.value && ordenVentaRef.value && !ordenVentaRef.value.validateDeliveryInfo()) {
    toast.add({ title: 'Revisá la información de entrega', description: ordenVentaRef.value.getDeliveryValidationMessage(), color: 'warning' })
    return
  }
  // Combinar payload base con campos de extensión.
  let extensionData = {}
  if (isQuote.value && presupuestoRef.value) {
    extensionData = presupuestoRef.value.getFormData()
  } else if (isOrder.value && ordenVentaRef.value) {
    extensionData = ordenVentaRef.value.getFormData()
  }

  const fullPayload = {
    ...payload,
    ...extensionData,
    parent_document_id: (isInvoiceReferenceNote.value ? parentDocumentId.value : parentOrderId.value) || undefined
  }

  // Los controles opcionales usan '' cuando están vacíos. Class-validator
  // considera ese valor presente y rechaza UUID/fechas opcionales; omitirlos
  // permite que el backend los persista como null.
  const normalizedPayload = Object.fromEntries(
    Object.entries(fullPayload).filter(([key, value]) =>
      value !== '' || key === 'document_type_id' || key === 'date'
    )
  )

  if (isOrder.value
    && warnWhenDeliveryDataEmpty.value
    && ordenVentaRef.value?.isDeliveryInfoEmpty()) {
    pendingEmptyDeliveryPayload.value = normalizedPayload
    emptyDeliveryConfirmOpen.value = true
    return
  }

  await createDocument(normalizedPayload)
}

async function createDocument(payload: Record<string, any>) {
  if (saving.value) return
  try {
    saving.value = true
    const created = await DocumentsSalesService.create(payload)
    formRef.value?.completeDraft()
    if (intakeId.value) {
      await intakeService.complete(intakeId.value, 'SALES_DOCUMENT', created.id)
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

function cancelEmptyDeliverySave() {
  emptyDeliveryConfirmOpen.value = false
  pendingEmptyDeliveryPayload.value = null
}

async function confirmEmptyDeliverySave() {
  const payload = pendingEmptyDeliveryPayload.value
  if (!payload) return cancelEmptyDeliverySave()

  emptyDeliveryConfirmOpen.value = false
  pendingEmptyDeliveryPayload.value = null
  await createDocument(payload)
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
            <UButton v-if="!missingNoteSource" :label="`Guardar ${pageTitle}`" icon="i-lucide-check" :loading="saving" :disabled="isOrder && deliverySettingsLoading" @click="formRef?.submit()">
              <template #trailing>
                <KeyboardShortcutHint :keys="['Ctrl', 'S']" />
              </template>
            </UButton>
          </template>
        </AppPageHeader>

        <UPageBody class="mx-auto w-full max-w-screen-2xl space-y-6">
          <!-- Form principal (genérico) -->
          <UAlert
            v-if="missingNoteSource"
            class="mb-4"
            color="warning"
            variant="subtle"
            icon="i-lucide-file-warning"
            title="La nota se crea desde una factura"
            description="Abrí una factura confirmada y elegí Crear NC o Crear ND para conservar el cliente y la trazabilidad del comprobante."
          />
          <UButton
            v-if="missingNoteSource"
            label="Ir a facturas"
            icon="i-lucide-receipt"
            variant="outline"
            @click="router.push('/erp/sales/comprobantes?category=INVOICE')"
          />

          <SalesDocumentForm
            v-else
            ref="formRef"
            :loading="saving"
            module-code="SALES"
            :category="category"
            :operational-mode="isRemito"
            :initial-values="initialValues"
            :parent-document-id="isInvoiceReferenceNote ? parentDocumentId : parentOrderId"
            :draft-extension="extensionDraft"
            @submit="handleSubmit"
            @restore-extension="extensionDraft = $event"
            @party-change="selectedDeliveryPartyId = $event"
          >
            <template #document-details>
              <PresupuestoForm v-if="isQuote" ref="presupuestoRef" v-model="extensionDraft" />
              <OrdenVentaForm v-else-if="isOrder" ref="ordenVentaRef" v-model="extensionDraft" :require-delivery-address="requireDeliveryAddress" :party-id="selectedDeliveryPartyId" default-seller-to-current />
            </template>
          </SalesDocumentForm>
        </UPageBody>

        <UModal
          v-model:open="emptyDeliveryConfirmOpen"
          title="¿Guardar la OV sin datos de entrega?"
          description="La sección de entrega está vacía. Confirmá si querés continuar."
          :ui="{ content: 'sm:max-w-lg' }"
        >
          <template #body>
            <div class="flex flex-col gap-4">
              <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-triangle-alert"
                title="No se cargó información de entrega"
                description="Podés volver al formulario para completarla o guardar la OV sin esos datos."
              />
              <div class="flex justify-end gap-2">
                <UButton label="Volver al formulario" variant="ghost" @click="cancelEmptyDeliverySave" />
                <UButton label="Continuar y guardar" icon="i-lucide-check" @click="confirmEmptyDeliverySave" />
              </div>
            </div>
          </template>
        </UModal>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
