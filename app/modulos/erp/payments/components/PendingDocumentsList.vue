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
  actionsDisabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [doc: PendingDocument]
  updateAmount: [docId: string, amount: number]
  createInvoice: [moduleCode: 'SALES' | 'PURCHASES']
  createVale: []
}>()

type DocumentGroup = 'INVOICE' | 'ORDER' | 'REMITO' | 'QUOTE' | 'VALE' | 'TREASURY_OBLIGATION' | 'OTHER'

const search = ref('')
const activeTab = ref<'ALL' | 'SELECTED' | DocumentGroup>('ALL')

const createInvoiceItems = [
  { label: 'Factura de Venta', icon: 'i-lucide-receipt', onSelect: () => emit('createInvoice', 'SALES') },
  { label: 'Factura de Compra', icon: 'i-lucide-file-text', onSelect: () => emit('createInvoice', 'PURCHASES') },
  { label: 'Vale RRHH', icon: 'i-lucide-banknote', onSelect: () => emit('createVale') }
]

const groupLabels: Record<DocumentGroup, string> = {
  INVOICE: 'Facturas',
  ORDER: 'Órdenes',
  REMITO: 'Remitos',
  QUOTE: 'Presupuestos',
  VALE: 'Vales',
  TREASURY_OBLIGATION: 'Servicios e impuestos',
  OTHER: 'Otros'
}

function getGroup(doc: PendingDocument): DocumentGroup {
  if (doc.source_type === 'TREASURY_OBLIGATION') return 'TREASURY_OBLIGATION'
  const category = String(doc.document_type_category ?? '').toUpperCase()
  return category in groupLabels ? category as DocumentGroup : 'OTHER'
}

const tabs = computed(() => {
  const counts = new Map<DocumentGroup, number>()
  for (const doc of props.documents) {
    const group = getGroup(doc)
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }

  const order: DocumentGroup[] = ['INVOICE', 'ORDER', 'REMITO', 'QUOTE', 'VALE', 'TREASURY_OBLIGATION', 'OTHER']
  return [
    { value: 'ALL' as const, label: 'Todos', count: props.documents.length },
    ...order
      .filter(group => counts.has(group))
      .map(group => ({ value: group, label: groupLabels[group], count: counts.get(group) ?? 0 })),
    { value: 'SELECTED' as const, label: 'Seleccionados', count: props.selectedDocs.size }
  ]
})

watch(tabs, (availableTabs) => {
  if (!availableTabs.some(tab => tab.value === activeTab.value)) activeTab.value = 'ALL'
})

const filteredDocs = computed(() => {
  let docs = props.documents
  if (activeTab.value === 'SELECTED') {
    docs = docs.filter(doc => props.selectedDocs.has(doc.id))
  } else if (activeTab.value !== 'ALL') {
    docs = docs.filter(doc => getGroup(doc) === activeTab.value)
  }

  const q = search.value.toLowerCase().trim()
  if (!q) return docs
  return docs.filter(doc => [
    doc.number,
    doc.reference,
    doc.party_name,
    doc.document_type_code,
    doc.document_type_description,
    doc.date,
    doc.source_type === 'TREASURY_OBLIGATION' ? 'servicio impuesto obligación' : ''
  ].some(value => String(value ?? '').toLowerCase().includes(q)))
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

function documentTypeLabel(doc: PendingDocument) {
  return groupLabels[getGroup(doc)]
}

function documentTypeBadgeClass(doc: PendingDocument) {
  switch (getGroup(doc)) {
    case 'INVOICE': return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300'
    case 'ORDER': return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300'
    case 'REMITO': return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
    case 'QUOTE': return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300'
    case 'VALE': return 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300'
    case 'TREASURY_OBLIGATION': return 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-300'
    default: return 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-400/30 dark:bg-zinc-400/10 dark:text-zinc-300'
  }
}
</script>

<template>
  <section class="space-y-3 rounded-xl border border-default p-3 sm:p-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h4 class="font-semibold">Documentos con saldo pendiente</h4>
        <p class="text-xs text-muted">Buscá por número, referencia o {{ props.documents[0]?.party_type === 'CUSTOMER' ? 'cliente' : 'proveedor' }}.</p>
      </div>
      <UDropdownMenu :items="createInvoiceItems">
        <UButton label="Crear documento" icon="i-lucide-file-plus" size="xs" variant="outline" color="info" :disabled="actionsDisabled" />
      </UDropdownMenu>
    </div>

    <UInput
      v-model="search"
      placeholder="Buscar por número, referencia, cliente o proveedor..."
      icon="i-heroicons-magnifying-glass"
      size="sm"
      class="w-full"
    />

    <div class="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar documentos por tipo">
      <UButton
        v-for="tab in tabs"
        :key="tab.value"
        size="xs"
        :color="activeTab === tab.value ? 'primary' : 'neutral'"
        :variant="activeTab === tab.value ? 'solid' : 'outline'"
        role="tab"
        :aria-selected="activeTab === tab.value"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <UBadge :label="String(tab.count)" size="xs" :color="activeTab === tab.value ? 'neutral' : 'neutral'" variant="soft" />
      </UButton>
    </div>

    <div class="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
      <article
        v-for="doc in filteredDocs"
        :key="doc.id"
        class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 transition-colors"
        :class="isSelected(doc.id) ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/50'"
      >
        <UCheckbox
          :model-value="isSelected(doc.id)"
          :aria-label="`${isSelected(doc.id) ? 'Quitar' : 'Seleccionar'} ${documentTypeLabel(doc)} ${doc.number}`"
          @update:model-value="toggle(doc)"
        />

        <div class="min-w-0 flex-1 basis-64 space-y-0.5">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <UBadge
              :label="doc.document_type_description || documentTypeLabel(doc)"
              variant="outline"
              size="xs"
              :class="['max-w-56 truncate', documentTypeBadgeClass(doc)]"
              :title="doc.document_type_description || documentTypeLabel(doc)"
            />
            <span class="text-sm font-semibold">{{ doc.source_type === 'TREASURY_OBLIGATION' ? doc.number : `N.º ${doc.number}` }}</span>
            <span class="text-sm text-muted">·</span>
            <span class="min-w-0 truncate text-sm font-semibold" :title="doc.party_name || 'Sin contraparte'">
              {{ doc.party_name || 'Sin contraparte' }}
            </span>
          </div>
          <p
            v-if="doc.reference"
            class="truncate text-sm font-semibold text-default"
            :title="doc.reference"
          >
            <span class="text-muted">Ref.:</span> {{ doc.reference }}
          </p>
          <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
            <span>{{ formatDate(doc.date) }}</span>
            <span>{{ doc.source_type === 'TREASURY_OBLIGATION' ? `Período ${doc.number}` : doc.document_type_code }}</span>
            <span>Total {{ formatCurrency(doc.total, doc.currency_code) }} · Pagado {{ formatCurrency(doc.paid_amount, doc.currency_code) }}</span>
          </div>
        </div>

        <div class="ml-8 flex w-[calc(100%_-_2rem)] items-center justify-between gap-3 border-t border-default/70 pt-2 sm:ml-0 sm:w-auto sm:border-0 sm:pt-0">
          <div class="sm:text-right">
            <p class="text-xs text-muted">Saldo pendiente</p>
            <p class="text-base font-semibold text-warning">{{ formatCurrency(doc.pending_amount, doc.currency_code) }}</p>
            <p
              v-if="doc.currency_code?.toUpperCase() !== currencyCode?.toUpperCase() && (doc.exchange_rate || resolvedRate)"
              class="text-xs font-medium text-primary"
            >
              {{ formatCurrency(doc.pending_amount * (doc.exchange_rate ?? resolvedRate ?? 1), currencyCode) }}
              <span>(x{{ doc.exchange_rate ?? resolvedRate }})</span>
            </p>
          </div>
          <div v-if="isSelected(doc.id)" class="w-32 shrink-0">
            <label class="mb-1 block text-xs font-medium text-muted">Importe a aplicar</label>
            <UInput
              :model-value="selectedDocs.get(doc.id)?.amount ?? 0"
              type="number"
              min="0.01"
              :max="getMaxAmount(doc)"
              :step="0.01"
              size="sm"
              :aria-label="`Importe a aplicar al documento ${doc.number}`"
              title="Importe de este pago o cobro que se imputará al comprobante"
              @update:model-value="(value: string) => updateAmount(doc.id, value)"
            />
          </div>
        </div>
      </article>

      <div v-if="filteredDocs.length === 0" class="rounded-lg border border-dashed border-default px-4 py-8 text-center">
        <UIcon name="i-lucide-search-x" class="mx-auto mb-2 size-5 text-muted" />
        <p class="text-sm font-medium">{{ activeTab === 'SELECTED' ? 'Todavía no seleccionaste documentos' : 'No se encontraron documentos' }}</p>
        <p class="mt-1 text-xs text-muted">Probá con otro término o cambiá el filtro por tipo.</p>
      </div>
    </div>
  </section>
</template>
