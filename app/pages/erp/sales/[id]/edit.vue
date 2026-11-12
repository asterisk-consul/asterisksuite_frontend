<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import OrdenVentaForm from '~/modulos/erp/documents/orden-venta/OrdenVentaForm.vue'

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'

import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'
import { getDocumentSubmitError } from '~/utils/document-submit-error'
import { useSalesFlowService } from '~/modulos/erp/sales/services/sales-flow.service'

const documentsSalesStore = useDocumentsSalesStore()

const route = useRoute()

const router = useRouter()

const toast = useToast()
const salesFlowService = useSalesFlowService()

const saving = ref(false)

const loading = ref(true)

const factura = computed(() => {
  const doc = documentsSalesStore.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})
const category = computed(() => documentsSalesStore.current?.document_types?.category)
const isOrder = computed(() => category.value === 'ORDER')
const isRemito = computed(() => category.value === 'REMITO')
const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    QUOTE: 'presupuesto',
    ORDER: 'orden de venta',
    REMITO: 'remito',
    INVOICE: 'factura',
    CREDIT_NOTE: 'nota de crédito',
    DEBIT_NOTE: 'nota de débito'
  }
  return labels[category.value ?? ''] ?? 'documento de venta'
})
const orderDetails = computed(() => documentsSalesStore.current?.orden_venta_doc ?? undefined)
const extensionDraft = ref<Record<string, any>>({})
const selectedDeliveryPartyId = ref('')
const requireDeliveryAddress = ref(false)
const warnWhenDeliveryDataEmpty = ref(true)
const deliverySettingsLoading = ref(false)
const deliveryFieldLabels = {
  delivery_address: 'Dirección de entrega',
  delivery_contact: 'Contacto',
  delivery_phone: 'Teléfono',
  delivery_time: 'Tiempo de entrega',
  delivery_instructions: 'Instrucciones de entrega',
  transport_provider: 'Transporte',
  confirmed_delivery_date: 'Fecha comprometida'
} as const
type DeliveryFieldKey = keyof typeof deliveryFieldLabels
const clearDeliveryConfirmOpen = ref(false)
const pendingDocumentPayload = ref<Record<string, any> | null>(null)
const pendingClearDeliveryFields = ref<DeliveryFieldKey[]>([])
const emptyDeliveryConfirmOpen = ref(false)
const pendingEmptyDeliveryPayload = ref<Record<string, any> | null>(null)

watch(emptyDeliveryConfirmOpen, (open) => {
  if (!open) pendingEmptyDeliveryPayload.value = null
})

watch(orderDetails, (details) => {
  if (details && Object.keys(extensionDraft.value).length === 0) {
    extensionDraft.value = { ...details }
  }
}, { immediate: true })

useBreadcrumbEntityLabel(
  computed(() => `/erp/sales/${route.params.id as string}`),
  computed(() => formatDocumentBreadcrumbLabel(documentsSalesStore.current))
)

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)
const ordenVentaRef = ref<InstanceType<typeof OrdenVentaForm> | null>(null)

onMounted(async () => {
  try {
    await documentsSalesStore.fetchOne(route.params.id as string)
    if (isOrder.value) {
      selectedDeliveryPartyId.value = documentsSalesStore.current?.party_id ?? ''
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
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: any) {
  if (saving.value || clearDeliveryConfirmOpen.value || emptyDeliveryConfirmOpen.value) return
  if (isOrder.value && ordenVentaRef.value && !ordenVentaRef.value.validateDeliveryInfo()) {
    toast.add({ title: 'Revisá la información de entrega', description: ordenVentaRef.value.getDeliveryValidationMessage(), color: 'warning' })
    return
  }

  const extensionData = isOrder.value && ordenVentaRef.value
    ? ordenVentaRef.value.getFormData()
    : {}
  const documentPayload = {
    ...payload,
    ...extensionData,
    expected_updated_at: documentsSalesStore.current?.updated_at
  }

  if (isOrder.value) {
    const storedDelivery = orderDetails.value ?? {}
    const fieldsToClear = (Object.keys(deliveryFieldLabels) as DeliveryFieldKey[])
      .filter((field) => String(storedDelivery[field] ?? '').trim() !== ''
        && String(extensionData[field] ?? '').trim() === '')

    if (fieldsToClear.length) {
      pendingDocumentPayload.value = documentPayload
      pendingClearDeliveryFields.value = fieldsToClear
      clearDeliveryConfirmOpen.value = true
      return
    }

    if (warnWhenDeliveryDataEmpty.value && ordenVentaRef.value?.isDeliveryInfoEmpty()) {
      pendingEmptyDeliveryPayload.value = documentPayload
      emptyDeliveryConfirmOpen.value = true
      return
    }
  }

  await saveDocument(documentPayload)
}

async function saveDocument(payload: Record<string, any>, clearFields: DeliveryFieldKey[] = []) {
  if (saving.value) return
  try {
    saving.value = true

    await documentsSalesStore.update(route.params.id as string, {
      ...payload,
      ...(clearFields.length ? { clear_delivery_fields: clearFields } : {})
    })
    formRef.value?.completeDraft()

    toast.add({
      title: `${pageTitle.value.charAt(0).toUpperCase()}${pageTitle.value.slice(1)} actualizado`,
      description: isRemito.value
        ? 'Se guardaron las cantidades y depósitos de salida.'
        : `La ${pageTitle.value} se actualizó correctamente.`,
      color: 'success'
    })

    router.push(isRemito.value
      ? `/erp/remitos/${route.params.id}`
      : `/erp/sales/${route.params.id}`)
  } catch (e: any) {
    toast.add({
      title: e?.statusCode === 409 || e?.status === 409 ? 'El documento cambió' : 'Error al actualizar',
      description: getDocumentSubmitError(e, 'No se pudo actualizar el comprobante de venta.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function cancelDeliveryClear() {
  clearDeliveryConfirmOpen.value = false
  pendingDocumentPayload.value = null
  pendingClearDeliveryFields.value = []
}

async function confirmDeliveryClear() {
  const payload = pendingDocumentPayload.value
  const fields = [...pendingClearDeliveryFields.value]
  if (!payload || !fields.length) return cancelDeliveryClear()

  clearDeliveryConfirmOpen.value = false
  pendingDocumentPayload.value = null
  pendingClearDeliveryFields.value = []
  await saveDocument(payload, fields)
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
  await saveDocument(payload)
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <UPage class="space-y-6">
        <AppPageHeader
          :title="isRemito ? 'Preparar remito' : `Editar ${pageTitle}`"
          :description="isRemito ? 'Revisá cantidades y elegí el depósito de salida de cada producto.' : `Modificá los datos de la ${pageTitle}.`"
        >
          <template #links>
            <UButton label="Guardar Cambios" icon="i-lucide-check" :loading="saving" :disabled="isOrder && deliverySettingsLoading" @click="formRef?.submit()">
              <template #trailing>
                <KeyboardShortcutHint :keys="['Ctrl', 'S']" />
              </template>
            </UButton>
          </template>
        </AppPageHeader>

        <UPageBody class="mx-auto w-full max-w-screen-2xl">
          <FacturaForm
            v-if="factura"
            ref="formRef"
            :initial-values="factura"
            :loading="saving"
            module-code="SALES"
            :category="category ?? undefined"
            :operational-mode="isRemito"
            :draft-extension="extensionDraft"
            @submit="handleSubmit"
            @restore-extension="extensionDraft = $event"
            @party-change="selectedDeliveryPartyId = $event"
          >
            <template #document-details>
              <OrdenVentaForm
                v-if="factura && isOrder"
                ref="ordenVentaRef"
                v-model="extensionDraft"
                :loading="saving"
                :require-delivery-address="requireDeliveryAddress"
                :party-id="selectedDeliveryPartyId"
              />
            </template>
          </FacturaForm>

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>

        <UModal
          v-model:open="clearDeliveryConfirmOpen"
          title="Confirmar eliminación de datos de entrega"
          description="Se detectaron datos guardados que quedarían vacíos al guardar esta OV."
          :ui="{ content: 'sm:max-w-lg' }"
        >
          <template #body>
            <div class="flex flex-col gap-4">
              <UAlert
                color="warning"
                variant="subtle"
                icon="i-lucide-triangle-alert"
                title="Esta acción borrará información guardada"
                description="Solo se borrarán los campos que confirmes. El resto de la OV se guardará normalmente."
              />
              <ul class="list-inside list-disc space-y-1 text-sm text-muted">
                <li v-for="field in pendingClearDeliveryFields" :key="field">
                  {{ deliveryFieldLabels[field] }}
                </li>
              </ul>
              <div class="flex justify-end gap-2">
                <UButton label="Volver a revisar" variant="ghost" :disabled="saving" @click="cancelDeliveryClear" />
                <UButton label="Guardar y borrar datos" color="error" :loading="saving" @click="confirmDeliveryClear" />
              </div>
            </div>
          </template>
        </UModal>

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
