<script setup lang="ts">
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'

definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const partyType = ref<'CUSTOMER' | 'SUPPLIER'>(route.query.type === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER')
const selectedPartyId = ref(typeof route.query.partyId === 'string' ? route.query.partyId : '')
const activeTab = ref<'current' | 'history'>('current')
const search = ref('')
const parties = ref<any[]>([])
const prices = ref<any[]>([])
const history = ref<any[]>([])
const loading = ref(false)
const showImportDialog = ref(false)
const { exportToExcel } = useExcelExport()

const typeOptions = [
  { label: 'Clientes', value: 'CUSTOMER', icon: 'i-lucide-users' },
  { label: 'Proveedores', value: 'SUPPLIER', icon: 'i-lucide-truck' }
]
const tabOptions = [
  { label: 'Precios vigentes', value: 'current', icon: 'i-lucide-tags' },
  { label: 'Historial', value: 'history', icon: 'i-lucide-history' }
]
const partyOptions = computed(() => parties.value
  .filter(party => party.active !== false && party.type === partyType.value)
  .map(party => ({ label: party.tax_id ? `${party.name} · ${party.tax_id}` : party.name, value: party.id })))
const selectedParty = computed(() => parties.value.find(party => party.id === selectedPartyId.value))
const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const filteredPrices = computed(() => prices.value.filter(item => {
  if (!normalizedSearch.value) return true
  return `${item.products?.name ?? ''} ${item.products?.sku ?? ''}`.toLocaleLowerCase().includes(normalizedSearch.value)
}))
const filteredHistory = computed(() => history.value.filter(item => {
  if (!normalizedSearch.value) return true
  return `${item.products?.name ?? ''} ${item.products?.sku ?? ''}`.toLocaleLowerCase().includes(normalizedSearch.value)
}))

function generalPrice(item: any) {
  const record = item.products?.product_price?.find((price: any) => price.currency_id === item.currency_id)
  if (!record) return null
  return Number(item.operation_type === 'SALE' ? (record.sale_price ?? record.price) : record.price)
}

function difference(item: any) {
  const general = generalPrice(item)
  if (general === null || general === 0) return null
  return ((Number(item.price) - general) / general) * 100
}

function differenceLabel(item: any) {
  const value = difference(item)
  return value === null ? '—' : `${value.toFixed(1)}%`
}

function differenceClass(item: any) {
  const value = difference(item)
  if (value === null || value === 0) return 'text-muted'
  return value > 0 ? 'text-success' : 'text-warning'
}

function money(value: unknown, code = 'ARS') {
  if (value === null || value === undefined) return 'Sin precio'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: code }).format(Number(value))
}

function sourceLabel(source: string) {
  return ({ MANUAL: 'Manual', SALE_DOCUMENT: 'Venta confirmada', PURCHASE_DOCUMENT: 'Compra confirmada', DISPATCH_RATE: 'Tarifa de despacho', LEGACY_SUPPLIER: 'Proveedor existente' } as Record<string, string>)[source] ?? source
}

function handleExportExcel() {
  exportToExcel({
    filename: `precios_${partyType.value.toLowerCase()}_${selectedParty.value?.name || 'todos'}`,
    sheetName: 'Precios',
    columns: [
      { key: 'producto', label: 'Producto', width: 30 },
      { key: 'sku', label: 'SKU', width: 15 },
      { key: 'operacion', label: 'Operación', width: 12 },
      { key: 'moneda', label: 'Moneda', width: 8 },
      { key: 'precio_acordado', label: 'Precio acordado', width: 15, format: (v: unknown) => Number(v).toFixed(2) },
      { key: 'precio_general', label: 'Precio general', width: 15, format: (v: unknown) => v != null ? Number(v).toFixed(2) : '—' },
      { key: 'actualizado', label: 'Actualizado', width: 12 }
    ],
    data: filteredPrices.value.map(p => ({
      producto: p.products?.name ?? '',
      sku: p.products?.sku ?? '',
      operacion: p.operation_type === 'SALE' ? 'Venta' : 'Compra',
      moneda: p.currencies?.code ?? '',
      precio_acordado: Number(p.price),
      precio_general: generalPrice(p),
      actualizado: p.effective_from ? new Date(p.effective_from).toLocaleDateString('es-AR') : ''
    }))
  })
}

function handleExportCSV() {
  const headers = ['Producto', 'SKU', 'Operación', 'Moneda', 'Precio acordado', 'Precio general', 'Actualizado']
  const rows = filteredPrices.value.map(p => [
    p.products?.name || '',
    p.products?.sku || '',
    p.operation_type === 'SALE' ? 'Venta' : 'Compra',
    p.currencies?.code || '',
    Number(p.price).toFixed(2),
    generalPrice(p) != null ? Number(generalPrice(p)).toFixed(2) : '',
    p.effective_from ? new Date(p.effective_from).toLocaleDateString('es-AR') : ''
  ])
  const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `precios_${partyType.value.toLowerCase()}_${selectedParty.value?.name || 'todos'}.csv`
  link.click()
}

const importColumns = [
  { key: 'sku', label: 'SKU', required: true, type: 'string' as const },
  { key: 'currency_code', label: 'Moneda', required: true, type: 'string' as const },
  { key: 'price', label: 'Precio acordado', required: true, type: 'number' as const }
]

const importEndpoint = computed(() => `/api/erp/pricing/party-prices/import?party_id=${selectedPartyId.value}&operation_type=${partyType.value === 'CUSTOMER' ? 'SALE' : 'PURCHASE'}`)

async function loadPrices() {
  if (!selectedPartyId.value) {
    prices.value = []
    history.value = []
    return
  }
  loading.value = true
  try {
    [prices.value, history.value] = await Promise.all([
      $fetch<any[]>(`/api/erp/pricing/party-prices/party/${selectedPartyId.value}`),
      $fetch<any[]>(`/api/erp/pricing/party-prices/party/${selectedPartyId.value}/history`)
    ])
  } catch (error: any) {
    toast.add({ title: 'No se pudieron cargar los precios', description: error?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function useGeneralPrice(item: any) {
  await $fetch(`/api/erp/pricing/party-prices/${item.id}`, { method: 'DELETE' })
  toast.add({ title: 'Precio específico desactivado', description: 'El producto volverá a utilizar su precio general.', color: 'success' })
  await loadPrices()
}

watch(partyType, async () => {
  selectedPartyId.value = ''
  prices.value = []
  history.value = []
  await router.replace({ query: { type: partyType.value } })
})

watch(selectedPartyId, async value => {
  await router.replace({ query: { type: partyType.value, ...(value ? { partyId: value } : {}) } })
  await loadPrices()
})

onMounted(async () => {
  parties.value = await $fetch<any[]>('/api/logistica/master-data/business-parties')
  if (selectedPartyId.value) await loadPrices()
})
</script>

<template>
  <UPage class="space-y-5">
    <UPageHeader title="Precios por cliente y proveedor" description="Listas acordadas, comparación con el precio general e historial por producto" />

    <UCard>
      <div class="grid gap-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(18rem,2fr)_minmax(14rem,1fr)]">
        <UFormField label="Tipo de parte interesada">
          <USelect v-model="partyType" :items="typeOptions" class="w-full min-w-0" />
        </UFormField>
        <UFormField :label="partyType === 'CUSTOMER' ? 'Cliente' : 'Proveedor'">
          <USelectMenu v-model="selectedPartyId" :items="partyOptions" value-key="value" searchable class="w-full min-w-0" :placeholder="partyType === 'CUSTOMER' ? 'Seleccionar cliente' : 'Seleccionar proveedor'" />
        </UFormField>
        <UFormField label="Buscar producto">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Nombre o SKU" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <UCard v-if="selectedPartyId">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold">{{ selectedParty?.name }}</h2>
            <p class="text-sm text-muted">{{ prices.length }} precio{{ prices.length === 1 ? '' : 's' }} específico{{ prices.length === 1 ? '' : 's' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UDropdownMenu :items="[
              [{ label: 'Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }, { label: 'CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV }]
            ]">
              <UButton label="Exportar" icon="i-lucide-download" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-down" />
            </UDropdownMenu>
            <UButton label="Importar" icon="i-lucide-upload" color="neutral" variant="outline" @click="showImportDialog = true" />
            <UButton label="Administrar productos" icon="i-lucide-settings-2" color="neutral" variant="outline" :to="`/erp/stakeholders/${selectedPartyId}/edit`" />
          </div>
        </div>
      </template>

      <UTabs v-model="activeTab" :items="tabOptions" :content="false" variant="link" class="mb-5" />

      <div v-if="loading" class="flex justify-center py-12"><UProgress class="max-w-xs" /></div>

      <div v-else-if="activeTab === 'current'" class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-[880px] text-sm">
          <thead class="bg-elevated text-left text-muted"><tr><th class="p-3">Producto / tarifa</th><th class="p-3">Operación</th><th class="p-3 text-right">Precio general</th><th class="p-3 text-right">Precio acordado</th><th class="p-3 text-right">Diferencia</th><th class="p-3">Actualizado</th><th class="p-3 text-right">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredPrices" :key="item.id" class="border-t border-default">
              <td class="p-3"><NuxtLink :to="`/productos/${item.product_id}/edit`" class="font-medium hover:text-primary hover:underline">{{ item.products?.name }}</NuxtLink><div class="text-xs text-muted">{{ item.products?.sku || (item.products?.is_rate_type ? 'Tarifa' : 'Sin SKU') }}</div></td>
              <td class="p-3"><UBadge :color="item.operation_type === 'SALE' ? 'primary' : 'info'" variant="subtle">{{ item.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</UBadge></td>
              <td class="p-3 text-right tabular-nums text-muted">{{ money(generalPrice(item), item.currencies?.code) }}</td>
              <td class="p-3 text-right font-semibold tabular-nums">{{ money(item.price, item.currencies?.code) }}</td>
              <td class="p-3 text-right tabular-nums"><span :class="differenceClass(item)">{{ differenceLabel(item) }}</span></td>
              <td class="p-3 text-muted">{{ new Date(item.effective_from).toLocaleDateString('es-AR') }}</td>
              <td class="p-3"><div class="flex justify-end gap-1"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Editar en producto" :to="`/productos/${item.product_id}/edit`" /><UButton icon="i-lucide-rotate-ccw" color="warning" variant="ghost" aria-label="Volver al precio general" title="Volver al precio general" @click="useGeneralPrice(item)" /></div></td>
            </tr>
            <tr v-if="!filteredPrices.length"><td colspan="7" class="p-8 text-center text-muted">No hay precios específicos. Los productos utilizarán su precio general.</td></tr>
          </tbody>
        </table>
      </div>

      <div v-else class="overflow-x-auto rounded-lg border border-default">
        <table class="w-full min-w-[850px] text-sm">
          <thead class="bg-elevated text-left text-muted"><tr><th class="p-3">Producto / tarifa</th><th class="p-3">Operación</th><th class="p-3 text-right">Anterior</th><th class="p-3 text-right">Nuevo</th><th class="p-3">Origen</th><th class="p-3">Fecha</th></tr></thead>
          <tbody>
            <tr v-for="entry in filteredHistory" :key="entry.id" class="border-t border-default">
              <td class="p-3"><NuxtLink :to="`/productos/${entry.product_id}/edit`" class="font-medium hover:text-primary hover:underline">{{ entry.products?.name }}</NuxtLink><div class="text-xs text-muted">{{ entry.products?.sku || '—' }}</div></td>
              <td class="p-3">{{ entry.operation_type === 'SALE' ? 'Venta' : 'Compra' }}</td>
              <td class="p-3 text-right tabular-nums text-muted">{{ entry.previous_price == null ? 'Nuevo' : money(entry.previous_price, entry.currencies?.code) }}</td>
              <td class="p-3 text-right font-semibold tabular-nums">{{ money(entry.new_price, entry.currencies?.code) }}</td>
              <td class="p-3"><UBadge color="neutral" variant="subtle">{{ sourceLabel(entry.source_type) }}</UBadge></td>
              <td class="p-3 text-muted">{{ new Date(entry.effective_at).toLocaleString('es-AR') }}</td>
            </tr>
            <tr v-if="!filteredHistory.length"><td colspan="6" class="p-8 text-center text-muted">No hay cambios de precios para mostrar.</td></tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <UCard v-else><div class="py-10 text-center text-muted"><UIcon name="i-lucide-contact-round" class="mx-auto mb-3 size-9 opacity-50" /><p>Seleccioná un cliente o proveedor para consultar su lista de precios.</p></div></UCard>

    <ExcelImportDialog
      v-model:open="showImportDialog"
      title="Importar precios"
      :description="`Importar precios de ${partyType === 'CUSTOMER' ? 'venta' : 'compra'} para ${selectedParty?.name || ''}`"
      :columns="importColumns"
      :endpoint="importEndpoint"
      @success="loadPrices"
    />
  </UPage>
</template>
