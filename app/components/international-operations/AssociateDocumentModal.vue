<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { InternationalExpenseType } from '~/modulos/international-operations/types/international-operations.types'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'
import { convertWithMarketRate, normalizeMarketRate } from '~/utils/currency'

interface Props {
  open: boolean
  operationId: string
  operationCurrencyCode: string
  containers?: Array<{ id: string; container_number: string }>
  excludeDocumentIds?: string[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'associated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { expenseTypeOptions } = useInternationalOperations()
const service = useInternationalOperationsService()
const { autoResolve, isAutoResolved, loading: rateLoading } = useExchangeRate()

const loading = ref(false)

// Dirección del documento: filtra la búsqueda (venta o compra)
const documentDirection = ref<'SALES' | 'PURCHASE' | undefined>(undefined)
const directionItems = [
  { label: 'Venta (emisión)', value: 'SALES' },
  { label: 'Compra (recepción)', value: 'PURCHASE' }
]

const selectedDirection = computed({
  get: () => directionItems.find(o => o.value === documentDirection.value),
  set: (val: any) => { documentDirection.value = val?.value ?? undefined }
})

// USelectMenu guarda el objeto completo { label, value }
const selectedDocument = ref<{ label: string; value: string } | undefined>(undefined)
const selectedExpenseType = ref<{ label: string; value: InternationalExpenseType } | undefined>(undefined)
const customExpenseDescription = ref('')
const customExchangeRate = ref<number | null>(null)
const selectedContainer = ref<{ label: string; value: string } | undefined>(undefined)

const documents = ref<Array<{
  id: string
  number: number
  date: string
  total: number
  currency_code?: string
  party_name?: string
  document_type_code?: string
  document_type_description?: string
}>>([])

// UUIDs extraídos para enviar al backend
const selectedDocumentId = computed(() => selectedDocument.value?.value ?? null)
const selectedExpenseTypeValue = computed(() => selectedExpenseType.value?.value ?? 'MERCHANDISE')
const selectedContainerId = computed(() => selectedContainer.value?.value ?? null)

const fetchDocuments = async () => {
  if (!documentDirection.value) {
    documents.value = []
    return
  }
  loading.value = true
  try {
    let fetched: any[] = []
    if (documentDirection.value === 'SALES') {
      const salesDocs = await (DocumentsSalesService.getAll as any)({ limit: 200 })
      fetched = salesDocs ?? []
    } else {
      const purchaseDocs = await (DocumentsPurchasesService.getAll as any)({ limit: 200 })
      fetched = purchaseDocs ?? []
    }

    const allDocs = fetched.map((d: any) => ({
      id: d.id,
      number: d.number,
      date: d.date,
      total: Number(d.total),
      currency_code: d.currency_code,
      party_name: d.business_parties?.name,
      document_type_code: d.document_types?.code,
      document_type_description: d.document_types?.description
    }))

    documents.value = allDocs.filter(d => !props.excludeDocumentIds?.includes(d.id))
  } catch (err) {
    console.error('Error fetching documents:', err)
  } finally {
    loading.value = false
  }
}

watch(documentDirection, () => {
  selectedDocument.value = undefined
  fetchDocuments()
})

// Currency validation
const selectedDocumentCurrency = computed(() => {
  if (!selectedDocument.value) return null
  return documents.value.find(d => d.id === selectedDocument.value?.value)?.currency_code ?? null
})

const currencyMismatch = computed(() => {
  const docCurrency = selectedDocumentCurrency.value
  if (!docCurrency) return false
  return docCurrency !== props.operationCurrencyCode
})

const selectedDocumentData = computed(() =>
  documents.value.find(d => d.id === selectedDocument.value?.value) ?? null
)

const marketForeignCurrency = computed(() => {
  const docCurrency = selectedDocumentCurrency.value
  const operationCurrency = props.operationCurrencyCode
  if (!docCurrency || docCurrency === operationCurrency) return null
  if (docCurrency === 'ARS') return operationCurrency
  if (operationCurrency === 'ARS') return docCurrency
  return null
})

const normalizedExchangeRate = computed(() => {
  const docCurrency = selectedDocumentCurrency.value
  if (!docCurrency) return null
  return normalizeMarketRate(customExchangeRate.value, docCurrency, props.operationCurrencyCode)
})

const convertedPreview = computed(() => {
  const document = selectedDocumentData.value
  const docCurrency = selectedDocumentCurrency.value
  if (!document || !docCurrency) return null
  return convertWithMarketRate(
    document.total,
    docCurrency,
    props.operationCurrencyCode,
    normalizedExchangeRate.value
  )
})

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)

const showExchangeRateField = computed(() => !!selectedDocument.value)

const showCustomField = computed(() => selectedExpenseTypeValue.value === 'OTHER')

// La cotización se guarda siempre con convención de mercado:
// X ARS por una unidad de moneda extranjera, sin importar la dirección del cálculo.
watch(selectedDocument, async (doc) => {
  if (!doc) {
    customExchangeRate.value = null
    return
  }
  const docCurrency = documents.value.find(d => d.id === doc.value)?.currency_code
  if (!docCurrency) return
  if (docCurrency === props.operationCurrencyCode) {
    customExchangeRate.value = 1
    return
  }
  const foreignCurrency = docCurrency === 'ARS' ? props.operationCurrencyCode : docCurrency
  const targetCurrency = docCurrency === 'ARS' || props.operationCurrencyCode === 'ARS' ? 'ARS' : props.operationCurrencyCode
  const rate = await autoResolve(foreignCurrency, targetCurrency)
  if (rate != null) {
    customExchangeRate.value = normalizeMarketRate(rate, docCurrency, props.operationCurrencyCode)
  }
})

const restoreRate = async () => {
  const docCurrency = selectedDocumentCurrency.value
  if (!docCurrency) return
  const foreignCurrency = docCurrency === 'ARS' ? props.operationCurrencyCode : docCurrency
  const targetCurrency = docCurrency === 'ARS' || props.operationCurrencyCode === 'ARS' ? 'ARS' : props.operationCurrencyCode
  const rate = await autoResolve(foreignCurrency, targetCurrency)
  if (rate != null) {
    customExchangeRate.value = normalizeMarketRate(rate, docCurrency, props.operationCurrencyCode)
  }
}

const documentOptions = computed(() => documents.value.map(d => ({
  label: `${d.document_type_code || ''} Nº ${String(d.number).padStart(8, '0')} — ${d.party_name || '—'} — ${new Date(d.date).toLocaleDateString('es-AR')} — ${d.currency_code} ${d.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
  value: d.id
})))

const containerOptions = computed(() => (props.containers ?? []).map(c => ({
  label: c.container_number,
  value: c.id
})))

watch(() => props.open, (open) => {
  if (open) {
    documentDirection.value = undefined
    selectedDocument.value = undefined
    selectedExpenseType.value = undefined
    customExpenseDescription.value = ''
    customExchangeRate.value = null
    selectedContainer.value = undefined
  }
})

const handleAssociate = async () => {
  if (!selectedDocumentId.value) return
  try {
    loading.value = true
    // La cotización solo es obligatoria si hay diferencia de moneda
    if (currencyMismatch.value && (!customExchangeRate.value || customExchangeRate.value <= 0)) {
      alert('Debe ingresar un tipo de cambio válido')
      loading.value = false
      return
    }
    await service.associateDocument(
      props.operationId,
      selectedDocumentId.value,
      selectedExpenseTypeValue.value,
      selectedContainerId.value || undefined,
      normalizedExchangeRate.value != null ? Number(normalizedExchangeRate.value) : undefined,
      showCustomField.value ? customExpenseDescription.value : undefined
    )
    emit('associated')
    emit('update:open', false)
  } catch (err) {
    console.error('Error associating document:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="props.open"
    title="Asociar Documento"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Tipo de documento" name="document_direction" required>
          <USelectMenu
            v-model="selectedDirection"
            :items="directionItems"
            placeholder="¿Es de venta o de compra?"
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <UFormField label="Documento" name="document_id" required>
          <USelectMenu
            v-model="selectedDocument"
            :items="documentOptions"
            :placeholder="documentDirection ? 'Buscar y seleccionar documento...' : 'Primero seleccioná el tipo de documento'"
            searchable
            clear
            class="w-full"
            :disabled="loading || !documentDirection"
          />
        </UFormField>

        <UFormField label="Tipo de Gasto" name="expense_type" required>
          <USelectMenu
            v-model="selectedExpenseType"
            :items="expenseTypeOptions"
            placeholder="Seleccionar tipo"
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <UFormField
          v-if="showCustomField"
          label="Descripción (requerido)"
          name="custom_expense_description"
          required
        >
          <UInput
            v-model="customExpenseDescription"
            placeholder="Describir el tipo de gasto..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-if="showExchangeRateField"
          :label="marketForeignCurrency ? `Cotización: 1 ${marketForeignCurrency} en pesos` : (currencyMismatch ? 'Tipo de cambio (requerido)' : 'Tipo de cambio')"
          name="exchange_rate"
          :required="currencyMismatch"
        >
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="customExchangeRate"
              type="number"
              step="0.01"
              min="0"
              :placeholder="marketForeignCurrency ? 'Ej: 1530,00' : '1,00'"
              class="flex-1"
            />
            <UButton
              v-if="currencyMismatch"
              icon="i-lucide-refresh-cw"
              size="xs"
              variant="ghost"
              label="Restaurar"
              :loading="rateLoading"
              @click="restoreRate"
            />
          </div>
          <p v-if="currencyMismatch" class="text-xs text-muted mt-1">
            <template v-if="marketForeignCurrency">
              Se guarda como 1 {{ marketForeignCurrency }} = ARS {{ normalizedExchangeRate?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}.
            </template>
            <template v-else>{{ selectedDocumentCurrency }} → {{ props.operationCurrencyCode }}.</template>
            {{ isAutoResolved ? 'Cotización auto-detectada, puede modificarla.' : 'Puede modificar el valor.' }}
          </p>
          <p v-else class="text-xs text-muted mt-1">
            Misma moneda ({{ props.operationCurrencyCode }}). Se guarda como referencia para ver el valor en ambas monedas.
          </p>
        </UFormField>

        <div
          v-if="currencyMismatch && selectedDocumentData"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-default bg-muted/20 p-3"
        >
          <div>
            <p class="text-xs text-muted">Monto original</p>
            <p class="font-semibold">{{ formatMoney(selectedDocumentData.total, selectedDocumentCurrency!) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted">Equivalente en la operación</p>
            <p v-if="convertedPreview != null" class="font-semibold text-primary">
              {{ formatMoney(convertedPreview, props.operationCurrencyCode) }}
            </p>
            <p v-else class="text-sm text-warning">Ingresá una cotización válida</p>
          </div>
        </div>

        <UFormField v-if="props.containers?.length" label="Contenedor (opcional)" name="container_id">
          <USelectMenu
            v-model="selectedContainer"
            :items="containerOptions"
            placeholder="Sin contenedor específico"
            clear
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <div v-if="loading" class="text-center py-4">
          <USkeleton class="h-8 w-48 mx-auto" />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" @click="emit('update:open', false)" :disabled="loading">Cancelar</UButton>
      <UButton @click="handleAssociate" :disabled="loading || !selectedDocumentId || (showCustomField && !customExpenseDescription)">Asociar</UButton>
    </template>
  </UModal>
</template>
