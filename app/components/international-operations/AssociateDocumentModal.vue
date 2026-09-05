<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { InternationalExpenseType } from '~/modulos/international-operations/types/international-operations.types'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import { DocumentsSalesService } from '~/modulos/erp/sales/services/sales.service'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

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

const showExchangeRateField = computed(() => currencyMismatch.value)

const showCustomField = computed(() => selectedExpenseTypeValue.value === 'OTHER')

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
    selectedContainer.value = undefined
  }
})

const handleAssociate = async () => {
  if (!selectedDocumentId.value) return
  try {
    loading.value = true
    const body: any = {
      document_id: selectedDocumentId.value,
      expense_type: selectedExpenseTypeValue.value,
      container_id: selectedContainerId.value || undefined,
      custom_expense_description: showCustomField.value ? customExpenseDescription.value : undefined
    }
    if (showExchangeRateField.value) {
      if (!customExchangeRate.value || customExchangeRate.value <= 0) {
        alert('Debe ingresar un tipo de cambio válido')
        loading.value = false
        return
      }
      body.exchange_rate = customExchangeRate.value
    }
    await $fetch(`/api/international-operations/${props.operationId}/documents`, {
      method: 'POST',
      body
    })
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
          label="Tipo de cambio (requerido)"
          name="exchange_rate"
          required
        >
          <UInput
            v-model.number="customExchangeRate"
            type="number"
            step="0.000001"
            min="0.000001"
            placeholder="Ej: 350.50 (1 USD = 350.50 ARS)"
            class="w-full"
          />
          <p class="text-xs text-muted mt-1">
            La factura está en {{ selectedDocumentCurrency }} pero la operación en {{ props.operationCurrencyCode }}.
            Ingrese cuántos {{ props.operationCurrencyCode }} por 1 {{ selectedDocumentCurrency }}.
          </p>
        </UFormField>

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
