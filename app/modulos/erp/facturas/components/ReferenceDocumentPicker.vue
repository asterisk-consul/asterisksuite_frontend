<script setup lang="ts">
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
}

const props = defineProps<{
  moduleCode: 'SALES' | 'PURCHASES'
  selectedInvoice?: (Partial<InvoiceOption> & { id: string; total?: number | string }) | null
  selectedInvoiceLoading?: boolean
}>()

const emit = defineEmits<{
  select: [documentId: string, partyId?: string, invoice?: InvoiceOption]
  resolved: [invoice: InvoiceOption & { id: string }]
  clear: []
}>()

const toast = useToast()

const loading = ref(false)
const documents = ref<any[]>([])
const selectedOption = ref<any>(null)
const hasFetchedInvoices = ref(false)

async function fetchInvoices() {
  if (loading.value || hasFetchedInvoices.value) return
  loading.value = true
  try {
    const service = props.moduleCode === 'SALES'
      ? await import('~/modulos/erp/sales/services/sales.service').then(m => m.DocumentsSalesService)
      : await import('~/modulos/erp/purchases/purchases-documents.services').then(m => m.DocumentsPurchasesService)

    const allDocs = await service.getAll({
      category: 'INVOICE',
      status: 2,
      direction: props.moduleCode === 'SALES' ? 1 : -1,
    })

    documents.value = allDocs
    hasFetchedInvoices.value = true
  } catch (e: any) {
    toast.add({ title: 'Error al cargar facturas', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

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
    description: `${partyName} · ${date || 'Sin fecha'} · ${total}`,
    partyId: doc.party_id ?? doc.partyId,
    partyName,
    total,
    date,
    number: doc.number,
    documentTypeCode: code,
    currencyCode: currency,
  }
}

const invoiceOptions = computed(() => documents.value.map(toInvoiceOption))
const pickerOptions = computed(() => {
  const options = invoiceOptions.value
  if (selectedOption.value && !options.some(option => option.value === selectedOption.value.value)) {
    return [selectedOption.value, ...options]
  }
  return options
})

// Keep a linked invoice visible as soon as its own data arrives; the full list loads only when needed.
watch(() => [props.selectedInvoice?.id, props.selectedInvoice?.number, props.selectedInvoiceLoading, invoiceOptions.value] as const, ([selectedId, selectedNumber, selectedLoading, options]) => {
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
  if (!selectedLoading && !hasFetchedInvoices.value) void fetchInvoices()
}, { immediate: true })

function handleSelect(option: any) {
  if (!option) {
    emit('clear')
    return
  }
  emit('select', option.value, option.partyId, option)
}

function handleOpenChange(open: boolean) {
  if (open && !hasFetchedInvoices.value) void fetchInvoices()
}

onMounted(() => {
  if (!props.selectedInvoice?.id) void fetchInvoices()
})
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm font-medium">
      Factura de referencia <span class="text-error">*</span>
    </label>
    <div class="flex gap-2">
      <USelectMenu
        v-model="selectedOption"
        :items="pickerOptions"
        :filter-fields="['label', 'description', 'partyName', 'total', 'date']"
        :loading="loading"
        searchable
        placeholder="Buscar por número, proveedor, fecha o importe..."
        class="w-full"
        @update:open="handleOpenChange"
        @update:model-value="handleSelect"
      />
      <UButton
        v-if="selectedOption"
        icon="i-lucide-x"
        variant="ghost"
        color="error"
        size="sm"
        @click="selectedOption = null; emit('clear')"
      />
    </div>
    <p class="text-xs text-muted">
      La referencia es obligatoria y debe ser una factura confirmada. El {{ moduleCode === 'PURCHASES' ? 'proveedor' : 'cliente' }} se toma de ella; fecha e importe son orientativos porque la nota puede ajustar solo una parte.
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
