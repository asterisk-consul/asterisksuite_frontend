<script setup lang="ts">
import type { PendingDocument } from '~/modulos/erp/payments/service/payments.service'
import { formatDate } from '~/utils/dates'

const props = defineProps<{
  documents: PendingDocument[]
  selectedDocs: Map<string, { amount: number }>
  currencyCode: string
  exchangeRate?: number | null
  resolvedRate?: number | null
  formatCurrency: (amount: number, currency?: string) => string
}>()

const emit = defineEmits<{
  toggle: [doc: PendingDocument]
  updateAmount: [docId: string, amount: number]
  createInvoice: [moduleCode: 'SALES' | 'PURCHASES']
  createVale: []
}>()

const search = ref('')

const createInvoiceItems = [
  { label: 'Factura de Venta', icon: 'i-lucide-receipt', onSelect: () => emit('createInvoice', 'SALES') },
  { label: 'Factura de Compra', icon: 'i-lucide-file-text', onSelect: () => emit('createInvoice', 'PURCHASES') },
  { label: 'Vale RRHH', icon: 'i-lucide-banknote', onSelect: () => emit('createVale') }
]

const filteredDocs = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return props.documents
  return props.documents.filter(
    (d) =>
      d.number?.toString().includes(q) ||
      d.party_name?.toLowerCase().includes(q) ||
      d.document_type_code?.toLowerCase().includes(q) ||
      d.document_type_description?.toLowerCase().includes(q)
  )
})

function isSelected(docId: string) {
  return props.selectedDocs.has(docId)
}

function toggle(doc: PendingDocument) {
  emit('toggle', doc)
}

function updateAmount(docId: string, value: string) {
  emit('updateAmount', docId, Number(value))
}

function getMaxAmount(doc: PendingDocument): number {
  if (doc.currency_code?.toUpperCase() === props.currencyCode?.toUpperCase()) {
    return doc.pending_amount
  }
  const rate = doc.exchange_rate ?? props.resolvedRate ?? 1
  return doc.pending_amount * rate
}
</script>

<template>
  <div class="border border-default rounded-lg p-4 space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium">
        Documentos con saldo pendiente
        <span class="text-muted">({{ filteredDocs.length }})</span>
      </h4>
      <UDropdownMenu :items="createInvoiceItems">
        <UButton label="Crear Factura" icon="i-lucide-file-plus" size="xs" variant="outline" color="info" />
      </UDropdownMenu>
    </div>

    <UInput
      v-model="search"
      placeholder="Buscar por N°, proveedor/cliente o tipo..."
      icon="i-heroicons-magnifying-glass"
      class="w-full"
    />

    <div class="max-h-64 overflow-y-auto space-y-2">
      <div
        v-for="doc in filteredDocs"
        :key="doc.id"
        class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
        :class="isSelected(doc.id) ? 'border-primary bg-primary/5' : 'border-default'"
      >
        <UCheckbox
          :model-value="isSelected(doc.id)"
          @update:model-value="toggle(doc)"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ doc.document_type_description || doc.document_type_code }} #{{ doc.number }}</span>
            <span class="text-xs text-muted">{{ doc.party_name }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-muted mt-1">
            <span>Fecha: {{ formatDate(doc.date) }}</span>
            <span>Total: {{ formatCurrency(doc.total, doc.currency_code) }}</span>
            <span>Pagado: {{ formatCurrency(doc.paid_amount, doc.currency_code) }}</span>
            <span class="font-semibold text-warning">Pendiente: {{ formatCurrency(doc.pending_amount, doc.currency_code) }}</span>
            <span v-if="doc.currency_code?.toUpperCase() !== currencyCode?.toUpperCase() && (doc.exchange_rate || resolvedRate)" class="text-xs text-primary font-medium">
              → {{ formatCurrency(doc.pending_amount * (doc.exchange_rate ?? resolvedRate ?? 1), currencyCode) }} (x{{ doc.exchange_rate ?? resolvedRate }})
            </span>
          </div>
        </div>
        <div v-if="isSelected(doc.id)" class="w-28">
          <UInput
            :model-value="selectedDocs.get(doc.id)?.amount ?? 0"
            type="number"
            :max="getMaxAmount(doc)"
            :step="0.01"
            size="xs"
            @update:model-value="(v: string) => updateAmount(doc.id, v)"
          />
        </div>
      </div>
      <div v-if="filteredDocs.length === 0" class="text-center py-4 text-muted text-sm">
        No se encontraron documentos
      </div>
    </div>
  </div>
</template>
