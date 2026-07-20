<script setup lang="ts">
import type { DateRange } from '~/components/compras/FiltroDateCompras.vue'
import DateRangePicker from '~/components/compras/FiltroDateCompras.vue'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useExcelExport } from '~/composables/useExcelExport'
import type { DropdownMenuItem } from '@nuxt/ui'

const { isOwnerOrAdmin } = useCompanyRole()
const { exportToExcel } = useExcelExport()

const formatCurrency = (amount: number | string | null | undefined) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR')
}

const loading = ref(false)
const libroData = ref<any[]>([])
const activeTab = ref(0)

const dateRange = ref<DateRange>({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  end: new Date()
})

const toLocalDateString = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const fetchLibro = async () => {
  loading.value = true
  try {
    libroData.value = await $fetch<any[]>('/api/erp/treasury/libro-iva', {
      query: {
        date_from: toLocalDateString(dateRange.value.start),
        date_to: toLocalDateString(dateRange.value.end)
      }
    })
  } catch (e: any) {
    console.error('Error fetching libro IVA:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchLibro())

watch(dateRange, () => {
  if (dateRange.value.start && dateRange.value.end) {
    fetchLibro()
  }
})

const libroVentas = computed(() => libroData.value.filter(d => d.direction === 1))
const libroCompras = computed(() => libroData.value.filter(d => d.direction === -1))

const totalVentasGravado = computed(() => libroVentas.value.reduce((sum, d) => sum + (Number(d.taxable_base) || 0), 0))
const totalVentasIVA = computed(() => {
  return libroVentas.value.reduce((sum, d) => {
    // Sum IVA from document_taxes (real taxes applied)
    const docTaxes = d.taxes?.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0) || 0
    return sum + docTaxes
  }, 0)
})
const totalComprasGravado = computed(() => libroCompras.value.reduce((sum, d) => sum + (Number(d.taxable_base) || 0), 0))
const totalComprasIVA = computed(() => {
  return libroCompras.value.reduce((sum, d) => {
    const docTaxes = d.taxes?.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0) || 0
    return sum + docTaxes
  }, 0)
})
const saldoIVA = computed(() => totalVentasIVA.value - totalComprasIVA.value)

const handleExportExcel = () => {
  const dateFromStr = toLocalDateString(dateRange.value.start)
  const dateToStr = toLocalDateString(dateRange.value.end)

  exportToExcel({
    filename: `libro_iva_${dateFromStr}_${dateToStr}`,
    sheetName: activeTab.value === 0 ? 'Ventas' : 'Compras',
    columns: [
      { key: 'date', label: 'Fecha', width: 12 },
      { key: 'number', label: 'N° Comprobante', width: 15 },
      { key: 'party_name', label: activeTab.value === 0 ? 'Cliente' : 'Proveedor', width: 25 },
      { key: 'party_tax_id', label: 'CUIT', width: 15 },
      { key: 'subtotal', label: 'Neto Gravado', width: 15 },
      { key: 'iva', label: 'IVA', width: 15 },
      { key: 'total', label: 'Total', width: 15 }
    ],
    data: activeTab.value === 0 ? libroVentas.value : libroCompras.value
  })
}

const tabs = [
  { label: 'Ventas', icon: 'i-lucide-trending-up', slot: 'ventas' },
  { label: 'Compras', icon: 'i-lucide-trending-down', slot: 'compras' }
]

const dataActions: DropdownMenuItem[] = [
  { label: 'Exportar Excel', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }
]
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Libro IVA" description="Registro de facturas con IVA discriminado">
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Datos" icon="i-lucide-database" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
      </template>
    </AppPageHeader>

    <!-- DATE FILTER -->
    <div class="flex items-center gap-3">
      <DateRangePicker v-model="dateRange" />
      <UButton label="Buscar" icon="i-lucide-search" @click="fetchLibro" />
    </div>

    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Neto Gravado Ventas</p>
        <p class="text-lg font-bold text-primary">{{ formatCurrency(totalVentasGravado) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">IVA Débito Fiscal</p>
        <p class="text-lg font-bold text-success">{{ formatCurrency(totalVentasIVA) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">IVA Crédito Fiscal</p>
        <p class="text-lg font-bold text-error">{{ formatCurrency(totalComprasIVA) }}</p>
      </div>
      <div class="p-4 rounded-xl border border-default bg-default">
        <p class="text-xs text-muted font-medium uppercase">Saldo IVA a Pagar</p>
        <p class="text-lg font-bold" :class="saldoIVA >= 0 ? 'text-error' : 'text-success'">
          {{ formatCurrency(saldoIVA) }}
        </p>
      </div>
    </div>

    <!-- TABS: VENTAS / COMPRAS -->
    <UTabs v-model="activeTab" :items="tabs" variant="link">
      <!-- TAB: VENTAS -->
      <template #ventas>
        <UPageCard variant="subtle" class="mt-4">
          <template #header>
            <h3 class="text-sm font-semibold">Libro de Ventas</h3>
          </template>
          <div v-if="libroVentas.length === 0" class="text-center py-8 text-muted text-sm">No hay facturas de venta en el período</div>
          <div v-else class="overflow-auto max-h-[60vh]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-default z-10">
                <tr class="border-b border-default">
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">Fecha</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">N° Comp.</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">Cliente</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">CUIT</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">Neto</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">IVA</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in libroVentas" :key="doc.id" class="border-b border-default hover:bg-muted/30">
                  <td class="py-2 px-2">{{ formatDate(doc.date) }}</td>
                  <td class="py-2 px-2 font-mono text-xs">{{ doc.number }}</td>
                  <td class="py-2 px-2">{{ doc.party_name }}</td>
                  <td class="py-2 px-2 font-mono text-xs">{{ doc.party_tax_id }}</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(doc.taxable_base) }}</td>
                  <td class="py-2 px-2 text-right text-success font-medium">{{ formatCurrency(doc.total_taxes) }}</td>
                  <td class="py-2 px-2 text-right font-semibold">{{ formatCurrency(doc.total) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-default font-semibold">
                  <td colspan="4" class="py-2 px-2 text-right">Totales:</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(totalVentasGravado) }}</td>
                  <td class="py-2 px-2 text-right text-success">{{ formatCurrency(totalVentasIVA) }}</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(totalVentasGravado + totalVentasIVA) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </UPageCard>
      </template>

      <!-- TAB: COMPRAS -->
      <template #compras>
        <UPageCard variant="subtle" class="mt-4">
          <template #header>
            <h3 class="text-sm font-semibold">Libro de Compras</h3>
          </template>
          <div v-if="libroCompras.length === 0" class="text-center py-8 text-muted text-sm">No hay facturas de compra en el período</div>
          <div v-else class="overflow-auto max-h-[60vh]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-default z-10">
                <tr class="border-b border-default">
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">Fecha</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">N° Comp.</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">Proveedor</th>
                  <th class="text-left py-2 px-2 text-xs font-medium text-muted">CUIT</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">Neto</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">IVA</th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="doc in libroCompras" :key="doc.id" class="border-b border-default hover:bg-muted/30">
                  <td class="py-2 px-2">{{ formatDate(doc.date) }}</td>
                  <td class="py-2 px-2 font-mono text-xs">{{ doc.number }}</td>
                  <td class="py-2 px-2">{{ doc.party_name }}</td>
                  <td class="py-2 px-2 font-mono text-xs">{{ doc.party_tax_id }}</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(doc.taxable_base) }}</td>
                  <td class="py-2 px-2 text-right text-error font-medium">{{ formatCurrency(doc.total_taxes) }}</td>
                  <td class="py-2 px-2 text-right font-semibold">{{ formatCurrency(doc.total) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-default font-semibold">
                  <td colspan="4" class="py-2 px-2 text-right">Totales:</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(totalComprasGravado) }}</td>
                  <td class="py-2 px-2 text-right text-error">{{ formatCurrency(totalComprasIVA) }}</td>
                  <td class="py-2 px-2 text-right">{{ formatCurrency(totalComprasGravado + totalComprasIVA) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </UPageCard>
      </template>
    </UTabs>
  </UPage>
</template>
