<script setup lang="ts">
import DocumentPrintLayout from '~/components/documents/DocumentPrintLayout.vue'
import ValePrint from '~/components/documents/ValePrint.vue'
import DocumentTotals from '~/modulos/erp/documents/shared/DocumentTotals.vue'
import DocumentItemsTable from '~/modulos/erp/documents/shared/DocumentItemsTable.vue'
import DocumentReference from '~/modulos/erp/documents/shared/DocumentReference.vue'
import {
  getDocumentLineAmounts,
  getLineSubtotalBeforeCommercialAdjustments,
  getItemDiscountAmount,
  getItemDiscountPercentage,
  hasLegacyGrossLinePrices
} from '~/modulos/erp/documents/shared/document-line-values'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useAuthStore } from '~/modulos/auth/auth.store'

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
const auth = useAuthStore()

onMounted(async () => {
  const companyId = auth.selectedCompany?.id
  if (companyId && !companiesStore.current) {
    await companiesStore.fetchOne(companyId)
  }
})

function fmt(n: any) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.document?.currency_code ?? 'ARS'
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

const legacyGrossPrices = computed(() => hasLegacyGrossLinePrices(
  props.document.subtotal,
  props.document.document_items ?? [],
))

const enrichedItems = computed(() =>
  (props.document.document_items ?? []).map((item: any) => {
    const taxes = taxesForItem(item)
    const totalTaxes = taxes.reduce((acc, t) => acc + t.amount, 0)
    const amounts = getDocumentLineAmounts(item, legacyGrossPrices.value)
    const lineSubtotalBeforeCommercialAdjustments = getLineSubtotalBeforeCommercialAdjustments(
      props.document,
      item,
      legacyGrossPrices.value,
    )
    return {
      ...item,
      _lineSubtotal: lineSubtotalBeforeCommercialAdjustments,
      _taxes: taxes,
      _totalTaxes: totalTaxes,
      _total: amounts.total
    }
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
const currentCompany = computed(() => companiesStore.current)

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
    description: `${item.products?.name || item.products?.description || '—'}${item.product_variants?.name ? ` · ${item.product_variants.name}` : ''}`,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    discount_percentage: getItemDiscountPercentage(item),
    discount_amount: getItemDiscountAmount(item, item._lineSubtotal),
    tax_rate: item._taxes.length > 0 ? Math.round((item._taxes[0].amount / Number(item.price)) * 100) : undefined,
    total: item._total
  }))
)

const printTotals = computed(() => {
  const adjustments = Array.isArray(props.document.commercial_adjustments)
    ? props.document.commercial_adjustments
    : []
  const subtotal = Number(props.document.subtotal ?? 0)
  const total = Number(props.document.total ?? 0)
  const paidAmount = Number(props.document.paid_amount ?? 0)

  return {
    subtotal: subtotal + adjustments.reduce(
      (sum: number, adjustment: any) => sum + Number(adjustment.net_discount ?? 0), 0
    ),
    net_subtotal: subtotal,
    adjustments,
    taxes: allTaxes.value.map(t => ({ name: t.name, amount: t.amount })),
    total,
    paid_amount: paidAmount,
    pending_amount: Math.max(0, total - paidAmount)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- ON-SCREEN VIEW -->
    <div class="screen-only">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xl font-bold">{{ document.document_types?.description || 'Documento' }} #{{ document.number }}</div>
              <div class="text-sm text-gray-500">{{ document.document_types?.description }}</div>
            </div>
            <UBadge :color="statusInfo.color as any">{{ statusInfo.label }}</UBadge>
          </div>
        </template>
        <DocumentReference :reference="document.ref" />
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500">{{ mode === 'sale' ? 'Cliente' : 'Proveedor' }}</div>
            <div class="font-medium">{{ document.business_parties?.name }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Fecha</div>
            <div class="font-medium">{{ document.date?.slice(0, 10) }}</div>
          </div>
        </div>
      </UCard>

      <DocumentItemsTable
        :items="document.document_items ?? []"
        :currency="document.currency_code"
        :document-subtotal="document.subtotal"
        title="Ítems"
      />

      <DocumentTotals :document="document" />
    </div>

    <!-- PRINT VIEW -->
    <div id="printable-document" class="print-only">
      <ValePrint
        v-if="document.document_types?.category === 'VALE'"
        :type="mode"
        :number="String(document.number || '—')"
        :date="document.date"
        :company="printCompany"
        :customer="printCustomer"
        :items="printItems"
        :totals="printTotals"
        :observations="document.descrip || document.notes || ''"
        :document="document"
      />
      <DocumentPrintLayout
        v-else
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
