<script setup lang="ts">
import PresupuestoPrint from './PresupuestoPrint.vue'
import OrdenVentaPrint from './OrdenVentaPrint.vue'
import RemitoPrint from './RemitoPrint.vue'
import DocumentPrintLayout from './DocumentPrintLayout.vue'

interface Company {
  name: string
  tax_id?: string
  address?: string
  phone?: string
  iva_condition?: string
  gross_income?: string
  activity_start?: string
}

const props = defineProps<{
  document: any
  company: Company
  mode?: 'sale' | 'purchase'
}>()

const category = computed(() => props.document?.document_types?.category)
const letter = computed(() => props.document?.document_types?.letter_type ?? 'X')
const isPurchase = computed(() => props.document?.document_types?.direction === -1)
const docMode = computed(() => props.mode ?? (isPurchase.value ? 'purchase' : 'sale'))

function fmt(n: any) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.document?.currency_code ?? 'ARS' }).format(Number(n ?? 0))
}

function formatDate(d: any) {
  if (!d) return '—'
  const str = String(d)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return str.slice(0, 10)
}

const customer = computed(() => ({
  name: props.document?.business_parties?.name ?? '',
  tax_id: props.document?.business_parties?.tax_id ?? '',
  address: '',
  iva_condition: props.document?.business_parties?.vat_condition ?? '',
  sale_condition: 'Contado',
}))

const printItems = computed(() =>
  (props.document?.document_items ?? []).map((item: any) => ({
    code: item.products?.sku ?? item.product_id?.slice(0, 8) ?? '',
    description: item.products?.name ?? 'Ítem',
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: item.document_item_taxes?.[0]?.tax_rate ?? 0,
    tax_amount: item.document_item_taxes?.[0]?.tax_amount ?? 0,
    total: Number(item.price),
  }))
)

const printTotals = computed(() => ({
  subtotal: Number(props.document?.subtotal ?? 0),
  taxes: (props.document?.document_taxes ?? []).map((t: any) => ({
    name: t.taxes?.name ?? 'Impuesto',
    amount: Number(t.tax_amount),
  })),
  total: Number(props.document?.total ?? 0),
}))

const pointOfSale = computed(() => {
  const code = props.document?.document_types?.code ?? ''
  return code.includes('-') ? code.split('-').pop() : '0001'
})

const observations = computed(() => {
  if (category.value === 'QUOTE') {
    return props.document?.presupuesto_doc?.commercial_notes ?? ''
  }
  if (category.value === 'ORDER') {
    return props.document?.orden_venta_doc?.delivery_instructions ?? ''
  }
  return props.document?.descrip ?? ''
})
</script>

<template>
  <PresupuestoPrint
    v-if="category === 'QUOTE'"
    :type="docMode"
    :number="String(document.number)"
    :date="formatDate(document.date)"
    :company="company"
    :customer="customer"
    :items="printItems"
    :totals="printTotals"
    :observations="observations"
    :point-of-sale="pointOfSale"
    :document="document"
  />

  <OrdenVentaPrint
    v-else-if="category === 'ORDER'"
    :type="docMode"
    :number="String(document.number)"
    :date="formatDate(document.date)"
    :company="company"
    :customer="customer"
    :items="printItems"
    :totals="printTotals"
    :observations="observations"
    :point-of-sale="pointOfSale"
    :document="document"
  />

  <RemitoPrint
    v-else-if="category === 'REMITO'"
    :type="docMode"
    :number="String(document.number)"
    :date="formatDate(document.date)"
    :company="company"
    :customer="customer"
    :items="printItems"
    :point-of-sale="pointOfSale"
    :document="document"
  />

  <DocumentPrintLayout
    v-else
    :type="docMode"
    :letter="letter"
    :number="String(document.number)"
    :date="formatDate(document.date)"
    :company="company"
    :customer="customer"
    :items="printItems"
    :totals="printTotals"
    :observations="observations"
    :point-of-sale="pointOfSale"
    :cae="document.cae"
    :cae-due="document.cae_due"
  />
</template>
