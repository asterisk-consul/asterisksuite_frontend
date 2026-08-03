<script setup lang="ts">
import DocumentPrintLayout from '~/components/documents/DocumentPrintLayout.vue'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'

interface Props {
  document: any
  mode?: 'sale' | 'purchase'
}

const props = withDefaults(defineProps<{
  document: any
  mode?: 'sale' | 'purchase'
}>(), {
  mode: 'sale'
})

const companiesStore = useCompaniesStore()
onMounted(async () => {
  if (!companiesStore.items.length) {
    await companiesStore.fetchAll()
  }
})

function fmt(n: any) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(n ?? 0))
}

// Taxes de nivel LINE agrupadas por tax_id
const lineTaxesSummary = computed(() => {
  const map = new Map<string, { name: string; code: string; amount: number }>()
  for (const item of props.document.document_items ?? []) {
    for (const t of item.document_item_taxes ?? []) {
      const key = t.tax_id
      const existing = map.get(key)
      if (existing) {
        existing.amount += Number(t.tax_amount ?? 0)
      } else {
        map.set(key, {
          name: t.taxes?.name ?? t.tax_id,
          code: t.taxes?.code ?? '',
          amount: Number(t.tax_amount ?? 0)
        })
      }
    }
  }
  return [...map.values()]
})

// Taxes de nivel DOCUMENT
const documentTaxesSummary = computed(() =>
  (props.document.document_taxes ?? []).map((t: any) => ({
    tax_id: t.tax_id,
    name: t.taxes?.name ?? t.tax_id,
    code: t.taxes?.code ?? '',
    rate: Number(t.tax_rate ?? 0),
    taxableBase: Number(t.taxable_base ?? 0),
    amount: Number(t.tax_amount ?? 0)
  }))
)

const subtotalTotal = computed(() =>
  (props.document.document_items ?? []).reduce(
    (acc: number, item: any) => acc + Number(item.price ?? 0), 0
  )
)

function taxesForItem(item: any): { name: string; amount: number }[] {
  return (item.document_item_taxes ?? []).map((t: any) => ({
    name: t.taxes?.name ?? t.tax_id,
    amount: Number(t.tax_amount ?? 0)
  }))
}

const enrichedItems = computed(() =>
  (props.document.document_items ?? []).map((item: any) => {
    const taxes = taxesForItem(item)
    const totalTaxes = taxes.reduce((acc, t) => acc + t.amount, 0)
    return { ...item, _taxes: taxes, _totalTaxes: totalTaxes, _total: Number(item.price ?? 0) + totalTaxes }
  })
)

const statusLabel: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'neutral' },
  1: { label: 'Pendiente', color: 'warning' },
  2: { label: 'Confirmada', color: 'success' },
  3: { label: 'Anulada', color: 'error' }
}

const statusInfo = computed(() => statusLabel[props.document.status] ?? { label: 'Desconocido', color: 'neutral' })

const allTaxes = computed(() =>
  (props.document.document_taxes ?? []).map((t: any) => ({
    name: t.taxes?.name ?? t.tax_id,
    code: t.taxes?.code ?? '',
    rate: Number(t.tax_rate ?? 0),
    taxableBase: Number(t.taxable_base ?? 0),
    amount: Number(t.tax_amount ?? 0)
  }))
)

// SALE: header=mi empresa, customer=cliente
// PURCHASE: header=proveedor, customer=mi empresa
const currentCompany = computed(() => companiesStore.items[0])

const printCompany = computed(() => {
  if (props.mode === 'sale') {
    return {
      name: currentCompany.value?.name ?? 'Empresa',
      tax_id: currentCompany.value?.tax_id ?? '—',
      address: currentCompany.value?.address ?? '',
      phone: currentCompany.value?.phone ?? '',
      iva_condition: currentCompany.value?.vat_condition ?? '—'
    }
  }
  // PURCHASE: el header muestra el proveedor
  return {
    name: props.document.business_parties?.name || 'Proveedor',
    tax_id: props.document.business_parties?.tax_id || '—',
    address: props.document.business_parties?.address || '—',
    phone: props.document.business_parties?.phone || '',
    iva_condition: props.document.business_parties?.iva_condition || '—'
  }
})

const printCustomer = computed(() => {
  if (props.mode === 'sale') {
    // SALE: el cliente es el que compra
    return {
      name: props.document.business_parties?.name || '—',
      tax_id: props.document.business_parties?.tax_id || '—',
      address: props.document.business_parties?.address || '—',
      iva_condition: props.document.business_parties?.iva_condition || '—'
    }
  }
  // PURCHASE: "nuestra empresa" es el cliente
  return {
    name: currentCompany.value?.name ?? 'Empresa',
    tax_id: currentCompany.value?.tax_id ?? '—',
    address: currentCompany.value?.address ?? '',
    iva_condition: currentCompany.value?.vat_condition ?? '—'
  }
})

const printItems = computed(() =>
  enrichedItems.value.map(item => ({
    code: item.products?.code || '',
    description: item.products?.name || item.products?.description || '—',
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: item._taxes.length > 0 ? Math.round((item._taxes[0].amount / Number(item.price)) * 100) : undefined,
    total: item._total
  }))
)

const printTotals = computed(() => ({
  subtotal: Number(props.document.subtotal),
  taxes: allTaxes.value.map(t => ({ name: t.name, amount: t.amount })),
  total: Number(props.document.total)
}))
</script>

<template>
  <div class="space-y-6">
    <!-- ON-SCREEN VIEW -->
    <div class="screen-only">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold">Factura #{{ document.number }}</div>
              <div class="text-sm text-gray-500">{{ document.document_types?.description }}</div>
            </div>
            <UBadge :color="statusInfo.color as any">{{ statusInfo.label }}</UBadge>
          </div>
        </template>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500">{{ mode === 'sale' ? 'Cliente' : 'Proveedor' }}</div>
            <div class="font-medium">{{ document.business_parties?.name }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Fecha</div>
            <div class="font-medium">{{ document.date?.slice(0, 10) }}</div>
          </div>
          <div v-if="document.descrip">
            <div class="text-sm text-gray-500">Descripción</div>
            <div class="font-medium">{{ document.descrip }}</div>
          </div>
          <div v-if="document.ref">
            <div class="text-sm text-gray-500">Referencia</div>
            <div class="font-medium">{{ document.ref }}</div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="font-medium">Ítems</div>
        </template>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left">
              <th class="pb-2 font-medium text-gray-500">Producto</th>
              <th class="pb-2 font-medium text-gray-500 text-right">Cant.</th>
              <th class="pb-2 font-medium text-gray-500 text-right">P. Unitario</th>
              <th class="pb-2 font-medium text-gray-500 text-right">Subtotal</th>
              <th class="pb-2 font-medium text-gray-500 text-right">Impuestos</th>
              <th class="pb-2 font-medium text-gray-500 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in enrichedItems" :key="item.id" class="border-b border-gray-100">
              <td class="py-3 pr-4">{{ item.products?.name || item.products?.description || '—' }}</td>
              <td class="py-3 text-right">{{ Number(item.quantity) }}</td>
              <td class="py-3 text-right">{{ fmt(item.unit_price) }}</td>
              <td class="py-3 text-right">{{ fmt(item.price) }}</td>
              <td class="py-3 text-right">
                <div v-for="tax in item._taxes" :key="tax.name" class="text-xs text-gray-500">{{ fmt(tax.amount) }}</div>
                <span v-if="!item._taxes.length" class="text-gray-400">—</span>
              </td>
              <td class="py-3 text-right font-medium">{{ fmt(item._total) }}</td>
            </tr>
          </tbody>
        </table>
      </UCard>

      <UCard>
        <div class="space-y-2 max-w-sm ml-auto">
          <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span>{{ fmt(document.subtotal) }}</span></div>
          <div v-for="tax in allTaxes" :key="tax.name" class="flex justify-between text-sm">
            <span class="text-gray-500">{{ tax.name }} ({{ tax.rate }}%)</span><span>{{ fmt(tax.amount) }}</span>
          </div>
          <hr class="my-2">
          <div class="flex justify-between text-lg font-bold"><span>Total</span><span>{{ fmt(document.total) }}</span></div>
        </div>
      </UCard>
    </div>

    <!-- PRINT VIEW (DocumentPrintLayout) -->
    <div id="printable-document" class="print-only">
      <DocumentPrintLayout
        :type="mode"
        :letter="document.document_types?.letter_type ?? 'X'"
        :number="document.number || '—'"
        :date="document.date"
        :company="printCompany"
        :customer="printCustomer"
        :items="printItems"
        :totals="printTotals"
        :observations="document.descrip || document.notes || ''"
        :cae="document.cae || ''"
        :cae-due="document.cae_due || ''"
      />
    </div>
  </div>
</template>

<style>
/* SCREEN / PRINT TOGGLE */
.screen-only { display: block; }
.print-only { display: none; }

@media print {
  .screen-only { display: none !important; }
  .print-only { display: block !important; }
  .print-only .doc-print { max-width: 210mm; margin: 0 auto; }
}
</style>
