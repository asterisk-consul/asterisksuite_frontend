<script setup lang="ts">
const props = defineProps<{
  moduleCode: 'SALES' | 'PURCHASES'
  selectedInvoice?: { id: string; documentTypeCode?: string; number?: number; partyName?: string; total?: number; date?: string } | null
}>()

const emit = defineEmits<{
  select: [documentId: string]
  clear: []
}>()

const toast = useToast()

const loading = ref(false)
const documents = ref<any[]>([])
const selectedOption = ref<any>(null)

async function fetchInvoices() {
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
  } catch (e: any) {
    toast.add({ title: 'Error al cargar facturas', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const invoiceOptions = computed(() =>
  documents.value.map(doc => {
    const docType = doc.document_types
    const code = docType?.code ?? ''
    const num = String(doc.number ?? 0).padStart(8, '0')
    const partyName = doc.business_parties?.name ?? 'Sin cliente'
    const total = new Intl.NumberFormat('es-AR', { style: 'currency', currency: doc.currency_code ?? 'ARS' }).format(doc.total ?? 0)
    const dateStr = doc.date ? new Date(doc.date).toLocaleDateString('es-AR') : ''
    return {
      value: doc.id,
      label: `${code}-${num}`,
      partyName,
      total,
      date: dateStr,
    }
  })
)

// Sync selection from props
watch(() => props.selectedInvoice, (val) => {
  if (val) {
    selectedOption.value = invoiceOptions.value.find(o => o.value === val.id) ?? null
  } else {
    selectedOption.value = null
  }
}, { immediate: true })

function handleSelect(option: any) {
  if (!option) {
    emit('clear')
    return
  }
  emit('select', option.value)
}

onMounted(fetchInvoices)
</script>

<template>
  <div class="space-y-2">
    <label class="text-sm text-muted font-medium">Factura de referencia (opcional)</label>
    <div class="flex gap-2">
      <USelectMenu
        v-model="selectedOption"
        :items="invoiceOptions"
        :loading="loading"
        searchable
        placeholder="Buscar factura por número o cliente..."
        class="w-full"
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
    <div v-if="selectedOption" class="flex gap-4 text-xs text-muted p-2 bg-gray-50 dark:bg-gray-800 rounded">
      <span>Cliente: <strong>{{ selectedOption.partyName }}</strong></span>
      <span>Total: <strong>{{ selectedOption.total }}</strong></span>
      <span>Fecha: <strong>{{ selectedOption.date }}</strong></span>
    </div>
  </div>
</template>
