<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import QuoteAssignmentFields from './QuoteAssignmentFields.vue'
import type { QuoteAssignmentInput } from '~/modulos/international-operations/types/international-operations.types'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'

interface Props {
  open: boolean
  operationId: string
  excludeDocumentIds?: string[]
  containers?: Array<{ id: string; container_number: string }>
  operationCurrencyCode?: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'associated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const operationsService = useInternationalOperationsService()
const toast = useToast()

const loading = ref(false)
const assignment = ref<QuoteAssignmentInput>({ container_id: '', expense_type: 'MERCHANDISE' })
const searchTerm = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestId = 0
watch(searchTerm, () => { clearTimeout(searchTimer); searchTimer = setTimeout(fetchDocuments, 250) })
onBeforeUnmount(() => { clearTimeout(searchTimer); requestId++ })
const selectedDocument = ref<{ label: string; value: string } | undefined>(undefined)
const selectedDocumentId = computed(() => selectedDocument.value?.value ?? null)

const documents = ref<Array<{
  id: string
  number: number
  date: string
  total: number
  currency_code?: string
  party_name?: string
  document_type_code?: string
  description?: string
}>>([])

const fetchDocuments = async () => {
  const request = ++requestId
  loading.value = true
  try {
    const page = await DocumentsPurchasesService.getPage({ page: 1, pageSize: 50, search: searchTerm.value, excludeCancelled: true,
      category: 'QUOTE',
      direction: -1
    })
    if (request !== requestId || !props.open) return
    documents.value = (page.items ?? []).filter((d: any) => d.document_types?.category === 'QUOTE' && Number(d.document_types?.direction) === -1).map((d: any) => ({
      id: d.id,
      number: d.number,
      date: d.date,
      total: Number(d.total),
      currency_code: d.currency_code,
      party_name: d.business_parties?.name,
      document_type_code: d.document_types?.code,
      description: d.descrip
    })).filter(d => !props.excludeDocumentIds?.includes(d.id))
  } catch (err) {
    console.error('Error fetching quotes:', err)
  } finally {
    if (request === requestId) loading.value = false
  }
}

const documentOptions = computed(() => documents.value.map(d => ({
  label: `${d.document_type_code || 'PRE'} Nº ${String(d.number).padStart(8, '0')} — ${d.party_name || '—'} — ${new Date(d.date).toLocaleDateString('es-AR')} — ${d.currency_code} ${d.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
  value: d.id
})))

watch(() => props.open, (open) => {
  if (open) {
    assignment.value = { container_id: props.containers?.length === 1 ? props.containers[0]!.id : '', expense_type: 'MERCHANDISE' }
    searchTerm.value = ''
    selectedDocument.value = undefined
    fetchDocuments()
  }
})

const handleAssociate = async () => {
  if (loading.value || !canAssociate.value) return
  try {
    loading.value = true
    await operationsService.associateQuote(props.operationId, selectedDocumentId.value!, assignment.value)
    emit('associated')
    emit('update:open', false)
  } catch (err) {
    console.error('Error associating quote:', err)
    toast.add({
      title: 'No se pudo asociar el presupuesto',
      description: (err as any)?.data?.message || (err as any)?.message || 'Revisá el presupuesto y tus permisos e intentá de nuevo.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loading.value = false
  }
}
const selectedCurrency = computed(() => documents.value.find(document => document.id === selectedDocumentId.value)?.currency_code)
const canAssociate = computed(() => selectedDocumentId.value && assignment.value.container_id && (assignment.value.expense_type !== 'OTHER' || assignment.value.custom_expense_description?.trim()) && (selectedCurrency.value === props.operationCurrencyCode || Number(assignment.value.exchange_rate) > 0))
</script>

<template>
  <UModal
    :open="props.open"
    title="Asociar Presupuesto"
    description="Buscá un presupuesto de compra existente (categoría Presupuesto)"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Presupuesto de compra" name="document_id" required>
          <USelectMenu
            v-model="selectedDocument"
            v-model:search-term="searchTerm"
            ignore-filter
            :items="documentOptions"
            placeholder="Buscar y seleccionar presupuesto..."
            searchable
            clear
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <QuoteAssignmentFields v-model="assignment" :containers="props.containers ?? []" :document-currency-code="selectedCurrency" :operation-currency-code="props.operationCurrencyCode ?? 'USD'" :disabled="loading" />

        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          class="text-xs"
          title="Sin impacto en totales"
          description="Los presupuestos asociados no se suman a los totales de la operación. Sirven para comparar y decidir."
        />

        <div v-if="loading" class="text-center py-4">
          <USkeleton class="h-8 w-48 mx-auto" />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" @click="emit('update:open', false)" :disabled="loading">Cancelar</UButton>
      <UButton @click="handleAssociate" :disabled="loading || !canAssociate">Asociar</UButton>
    </template>
  </UModal>
</template>
