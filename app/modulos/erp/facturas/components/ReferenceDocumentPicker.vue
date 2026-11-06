<script setup lang="ts">
import { nextTick } from 'vue'
import type { InvoiceReferenceDocument } from '~/modulos/erp/facturas/types/factura.types'

type InvoiceOption = {
  id?: string
  value: string
  label: string
  description: string
  partyId?: string
  partyName: string
  total: string
  date: string
  number?: number
  documentTypeCode?: string
  currencyCode?: string
  businessParty?: InvoiceReferenceDocument['business_parties']
}

const props = defineProps<{
  moduleCode: 'SALES' | 'PURCHASES'
  selectedInvoice?: (Partial<InvoiceOption> & { id: string; total?: number | string }) | null
  selectionLocked?: boolean
}>()

const emit = defineEmits<{
  select: [documentId: string, partyId?: string, invoice?: InvoiceOption]
  resolved: [invoice: InvoiceOption & { id: string }]
  clear: []
}>()

const toast = useToast()

const loading = ref(false)
const documents = ref<InvoiceReferenceDocument[]>([])
const selectedOption = ref<any>(null)
const menuOpen = ref(false)
const searchTerm = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let latestRequest = 0
let ignoreOpenUntil = 0

async function fetchInvoices(search = searchTerm.value) {
  const request = ++latestRequest
  loading.value = true
  try {
    const service = props.moduleCode === 'SALES'
      ? await import('~/modulos/erp/sales/services/sales.service').then(m => m.DocumentsSalesService)
      : await import('~/modulos/erp/purchases/purchases-documents.services').then(m => m.DocumentsPurchasesService)

    const result = await service.getInvoiceReferences({
      page: 1,
      pageSize: 50,
      ...(search.trim() ? { search: search.trim() } : {}),
    })

    if (request === latestRequest) documents.value = result.items ?? []
  } catch (e: any) {
    if (request === latestRequest) {
      toast.add({ title: 'Error al buscar facturas', description: e?.data?.message, color: 'error' })
    }
  } finally {
    if (request === latestRequest) loading.value = false
  }
}

watch(searchTerm, (search) => {
  if (!menuOpen.value) return
  clearTimeout(searchTimer)
  latestRequest++
  loading.value = true
  documents.value = []
  searchTimer = setTimeout(() => void fetchInvoices(search), 250)
})

function handleOpenChange(open: boolean) {
  // A combobox can emit a late "open" while its option click is finishing.
  // Keep the selected value visible instead of immediately reopening it.
  if (open && Date.now() < ignoreOpenUntil) {
    menuOpen.value = false
    return
  }
  menuOpen.value = open
  clearTimeout(searchTimer)
  if (open) {
    void fetchInvoices(searchTerm.value)
    return
  }
  latestRequest++
  loading.value = false
  searchTerm.value = ''
}

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  latestRequest++
})

function toInvoiceOption(doc: any): InvoiceOption {
  if (doc.label && doc.value) return doc as InvoiceOption
  const code = doc.document_types?.code ?? doc.documentTypeCode ?? ''
  const num = String(doc.number ?? 0).padStart(8, '0')
  const partyName = doc.business_parties?.name ?? doc.partyName ?? (props.moduleCode === 'PURCHASES' ? 'Sin proveedor' : 'Sin cliente')
  const currency = doc.currency_code ?? doc.currencyCode ?? 'ARS'
  const total = typeof doc.total === 'string' && doc.total.startsWith('$')
    ? doc.total
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(doc.total ?? 0))
  const rawDate = doc.date ? String(doc.date).slice(0, 10) : ''
  const date = rawDate ? new Date(`${rawDate}T12:00:00`).toLocaleDateString('es-AR') : ''
  const label = `${code}-${num}`
  return {
    id: doc.id ?? doc.value,
    value: doc.id ?? doc.value,
    label,
    description: `${partyName}${doc.ref ? ` · Ref. ${doc.ref}` : ''} · ${date || 'Sin fecha'} · ${total}`,
    partyId: doc.party_id ?? doc.partyId ?? doc.business_parties?.id,
    partyName,
    total,
    date,
    number: doc.number,
    documentTypeCode: code,
    currencyCode: currency,
    businessParty: doc.business_parties ?? doc.businessParty,
  }
}

const invoiceOptions = computed(() => documents.value.map(toInvoiceOption))
const pickerOptions = computed(() => {
  const options = invoiceOptions.value
  if (menuOpen.value) return options
  if (selectedOption.value && !options.some(option => option.value === selectedOption.value.value)) {
    return [selectedOption.value, ...options]
  }
  return options
})

// Keep a linked invoice visible from its own data, without loading the invoice catalog.
watch(() => [props.selectedInvoice?.id, props.selectedInvoice?.number, invoiceOptions.value] as const, ([selectedId, selectedNumber, options]) => {
  if (!selectedId) {
    selectedOption.value = null
    return
  }
  const option = options.find(item => item.value === selectedId)
  if (option) {
    selectedOption.value = option
    emit('resolved', { ...option, id: selectedId })
    return
  }
  if (selectedNumber != null || props.selectedInvoice?.label) {
    selectedOption.value = toInvoiceOption(props.selectedInvoice)
    emit('resolved', { ...selectedOption.value, id: selectedId })
    return
  }
  selectedOption.value = {
    value: selectedId,
    label: 'Cargando factura…',
    description: 'Buscando el comprobante relacionado',
    partyName: '',
    total: '',
    date: '',
  }
}, { immediate: true })

function handleSelect(option: any) {
  const selected = option && typeof option === 'object'
    ? toInvoiceOption(option)
    : pickerOptions.value.find(item => item.value === option)
  if (!selected) {
    closeMenu()
    emit('clear')
    return
  }
  selectedOption.value = selected
  closeMenu()
  emit('select', selected.value, selected.partyId, selected)
}

function closeMenu() {
  ignoreOpenUntil = Date.now() + 180
  menuOpen.value = false
  searchTerm.value = ''
  void nextTick(() => { menuOpen.value = false })
}

function clearSelection() {
  selectedOption.value = null
  closeMenu()
  emit('clear')
}

</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium">
      Factura de referencia <span class="text-error">*</span>
    </label>
    <div class="flex min-w-0 gap-2">
      <div
        v-if="selectionLocked"
        class="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-default bg-elevated/40 px-3 py-2 text-sm"
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon name="i-lucide-lock-keyhole" class="size-4 shrink-0 text-muted" />
          <span class="truncate font-medium">{{ selectedOption?.label || (loading ? 'Cargando factura…' : 'Factura de origen') }}</span>
        </div>
        <span class="shrink-0 text-xs text-muted">Origen fijo</span>
      </div>
      <USelectMenu
        v-else
        v-model="selectedOption"
        :open="menuOpen"
        v-model:search-term="searchTerm"
        :items="pickerOptions"
        ignore-filter
        :loading="loading"
        searchable
        placeholder="Buscar por número, referencia o proveedor..."
        class="w-full min-w-0"
        @update:open="handleOpenChange"
        @update:model-value="handleSelect"
      />
      <UButton
        v-if="selectedOption && !selectionLocked"
        icon="i-lucide-x"
        variant="ghost"
        color="error"
        size="sm"
        @click="clearSelection"
      />
    </div>
    <p v-if="!selectionLocked" class="text-xs text-muted">
      Es obligatoria y solo admite facturas confirmadas. Escribí número, referencia o {{ moduleCode === 'PURCHASES' ? 'proveedor' : 'cliente' }} para buscar; se muestran hasta 50 coincidencias recientes.
    </p>
    <p v-if="selectionLocked" class="text-xs text-muted">
      La factura de origen queda fija para conservar la trazabilidad. Si necesitás otra, iniciá la nota desde la factura correcta.
    </p>
    <div v-if="selectedOption" class="grid grid-cols-2 gap-3 rounded-lg border border-default bg-elevated/40 p-3 text-sm sm:grid-cols-4">
      <div class="min-w-0">
        <p class="text-xs text-muted">Comprobante</p>
        <p class="truncate font-medium">{{ selectedOption.label }}</p>
      </div>
      <div class="min-w-0">
        <p class="text-xs text-muted">{{ moduleCode === 'PURCHASES' ? 'Proveedor' : 'Cliente' }}</p>
        <p class="truncate font-medium">{{ selectedOption.partyName }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Fecha</p>
        <p class="font-medium">{{ selectedOption.date || '—' }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Total de factura</p>
        <p class="font-medium">{{ selectedOption.total }}</p>
      </div>
    </div>
  </div>
</template>
