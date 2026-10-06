<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import { normalizeMarketRate } from '~/utils/currency'

const { mainCollapsed } = useSidebarState()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const internationalOperationsService = useInternationalOperationsService()
const { autoResolve } = useExchangeRate()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const toggleMainPanel = () => { mainCollapsed.value = !mainCollapsed.value }

const partyId = computed(() => (route.query.party_id as string) || undefined)
const obligationId = computed(() => (route.query.obligation_id as string) || undefined)
const obligationProductId = computed(() => (route.query.product_id as string) || undefined)
const obligationUnitPrice = computed(() => Number(route.query.unit_price || 0))
const obligationCurrency = computed(() => (route.query.currency as string) || undefined)
const obligationDescription = computed(() => (route.query.description as string) || undefined)
const parentOrderId = computed(() => (route.query.parent_order_id as string) || undefined)
const category = computed(() => (route.query.category as string) || undefined)
const intakeId = ref<string | undefined>(route.query.intakeId as string | undefined)
const internationalOperationId = computed(() => (route.query.international_operation_id as string) || undefined)
const internationalContainerId = computed(() => (route.query.container_id as string) || undefined)
const internationalContainerNumber = computed(() => (route.query.container_number as string) || undefined)
const internationalExpenseType = computed(() => (route.query.expense_type as string) || 'MERCHANDISE')
const internationalExpenseLabel = computed(() => (route.query.expense_label as string) || internationalExpenseType.value)
const internationalCustomExpenseDescription = computed(() => (route.query.custom_expense_description as string) || undefined)
const internationalOperationCurrency = ref<string | undefined>((route.query.operation_currency_code as string) || undefined)
const captureLoading = ref(false)

async function enableCapture() {
  if (intakeId.value) return
  captureLoading.value = true
  try {
    const capture = await $fetch<{ id: string }>('/api/intake-records', {
      method: 'POST',
      body: {
        title: 'Comprobante de compra pendiente de carga',
        suggested_type: 'PURCHASE_DOCUMENT',
      },
    })
    intakeId.value = capture.id
    toast.add({ title: 'Captura preparada', description: 'Ahora podés adjuntar una foto o un PDF.', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudo preparar la captura', description: e?.data?.message || e?.message, color: 'error' })
  } finally {
    captureLoading.value = false
  }
}

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
  if (internationalOperationId.value) {
    try {
      const operation = await internationalOperationsService.findOne(internationalOperationId.value)
      internationalOperationCurrency.value = operation.currency_code || internationalOperationCurrency.value || 'USD'
    } catch (e: any) {
      toast.add({
        title: 'No se pudo consultar la operación internacional',
        description: e?.data?.message || e?.message,
        color: 'warning'
      })
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
  if (obligationProductId.value && !base.items?.length) {
    base.items = [{ product_id: obligationProductId.value, quantity: 1, unit_price: obligationUnitPrice.value }]
    base.currency_code = obligationCurrency.value || 'ARS'
    base.descrip = obligationDescription.value || ''
  }

  return Object.keys(base).length > 0 ? base : undefined
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    let associationExchangeRate: number | undefined
    const documentCurrency = payload.currency_code || 'ARS'
    const operationCurrency = internationalOperationCurrency.value

    if (internationalOperationId.value && operationCurrency && documentCurrency !== operationCurrency) {
      const foreignCurrency = documentCurrency === 'ARS' ? operationCurrency : documentCurrency
      const targetCurrency = documentCurrency === 'ARS' || operationCurrency === 'ARS'
        ? 'ARS'
        : operationCurrency
      const latestRate = await autoResolve(foreignCurrency, targetCurrency)
      const normalizedRate = normalizeMarketRate(latestRate, documentCurrency, operationCurrency)

      if (!normalizedRate) {
        toast.add({
          title: 'Falta el tipo de cambio',
          description: `No se encontró una cotización para asociar una factura en ${documentCurrency} con la operación en ${operationCurrency}. Cargá la cotización y volvé a guardar.`,
          color: 'error'
        })
        return
      }
      associationExchangeRate = normalizedRate
    }

    const fullPayload = {
      ...payload,
      parent_document_id: parentOrderId.value || undefined
    }
    const created = await DocumentsPurchasesService.create(fullPayload)
    if (obligationId.value) {
      await $fetch(`/api/backend/treasury/obligations/${obligationId.value}`, {
        method: 'PATCH',
        body: {
          document_id: created.id,
          amount: Number(created.total ?? payload.total ?? 0),
          issue_date: payload.date
        }
      })
      await $fetch(`/api/backend/treasury/obligations/${obligationId.value}/confirm`, { method: 'POST' })
    }
    if (intakeId.value) {
      await $fetch(`/api/intake-records/${intakeId.value}/complete`, {
        method: 'POST', body: { target_type: 'PURCHASE_DOCUMENT', target_id: created.id }
      })
    }
    toast.add({ title: `${pageTitle.value} creado`, color: 'success' })
    if (internationalOperationId.value) {
      try {
        await internationalOperationsService.associateDocument(
          internationalOperationId.value,
          created.id,
          internationalExpenseType.value,
          internationalContainerId.value,
          associationExchangeRate,
          internationalCustomExpenseDescription.value
        )
        toast.add({
          title: 'Documento asociado',
          description: 'La factura quedó vinculada a la operación internacional.',
          color: 'success'
        })
        await router.push(`/operaciones-internacionales/${internationalOperationId.value}`)
        return
      } catch (associationError: any) {
        toast.add({
          title: 'La factura fue creada, pero no pudo asociarse',
          description: associationError?.data?.message || associationError?.message,
          color: 'warning'
        })
      }
    }
    router.push(obligationId.value ? '/erp/treasury/taxes-services?view=obligations' : `/erp/purchases/purchases-documents/${created.id}`)
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
            @click="toggleMainPanel"
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
          <UAlert
            v-if="internationalOperationId"
            class="mb-4"
            color="primary"
            variant="subtle"
            icon="i-lucide-container"
            title="Factura vinculada a una operación internacional"
            :description="`Al guardar, se asociará como ${internationalExpenseType === 'OTHER' ? (internationalCustomExpenseDescription || 'otro gasto') : internationalExpenseLabel}${internationalContainerId ? ` y al contenedor ${internationalContainerNumber || 'seleccionado'}` : ' para toda la operación'}. Moneda de la operación: ${internationalOperationCurrency || 'consultando…'}. Si la factura usa otra moneda, se aplicará la última cotización disponible.`"
          />

          <UCard v-if="!intakeId" class="mb-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3">
                <div class="rounded-lg bg-primary/10 p-2 text-primary">
                  <UIcon name="i-lucide-camera" class="size-5" />
                </div>
                <div>
                  <p class="font-medium">Captura del comprobante (opcional)</p>
                  <p class="text-sm text-muted">Adjuntá una foto o PDF. El archivo quedará asociado al documento cuando lo guardes.</p>
                </div>
              </div>
              <UButton
                label="Agregar captura"
                icon="i-lucide-paperclip"
                variant="outline"
                :loading="captureLoading"
                @click="enableCapture"
              />
            </div>
          </UCard>

          <UiAttachmentManager
            v-else-if="intakeId"
            class="mb-4"
            entity-type="intake"
            :entity-id="intakeId"
          />

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
