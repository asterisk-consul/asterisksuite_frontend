<script setup lang="ts">
import PresupuestoPrint from './PresupuestoPrint.vue'
import OrdenVentaPrint from './OrdenVentaPrint.vue'
import RemitoPrint from './RemitoPrint.vue'
import ValePrint from './ValePrint.vue'
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

function itemDiscountPercentage(item: any) {
  const percentage = Number(item.discount_percentage ?? 0)
  if (percentage > 0) return percentage

  const originalUnitPrice = Number(item.original_unit_price)
  const unitPrice = Number(item.unit_price ?? 0)
  if (item.original_unit_price == null || originalUnitPrice <= 0 || unitPrice >= originalUnitPrice) return 0
  return ((originalUnitPrice - unitPrice) / originalUnitPrice) * 100
}

function itemDiscountAmount(item: any) {
  const quantity = Number(item.quantity ?? 0)
  const unitPrice = Number(item.unit_price ?? 0)
  const originalUnitPrice = Number(item.original_unit_price)

  if (item.original_unit_price != null && Number.isFinite(originalUnitPrice)) {
    return Math.max(0, originalUnitPrice - unitPrice) * quantity
  }

  const percentage = itemDiscountPercentage(item)
  return percentage > 0 && percentage < 100
    ? (unitPrice / (1 - percentage / 100) - unitPrice) * quantity
    : 0
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
    discount_percentage: itemDiscountPercentage(item),
    discount_amount: itemDiscountAmount(item),
    tax_rate: item.document_item_taxes?.[0]?.tax_rate ?? 0,
    tax_amount: item.document_item_taxes?.[0]?.tax_amount ?? 0,
    total: Number(item.price),
  }))
)

const printTotals = computed(() => {
  const adjustments = Array.isArray(props.document?.commercial_adjustments)
    ? props.document.commercial_adjustments
    : []
  const subtotal = Number(props.document?.subtotal ?? 0)
  const total = Number(props.document?.total ?? 0)
  const paidAmount = Number(props.document?.paid_amount ?? 0)

  return {
    subtotal: subtotal + adjustments.reduce((sum: number, adjustment: any) => sum + Number(adjustment.net_discount ?? 0), 0),
    net_subtotal: subtotal,
    adjustments,
    taxes: (props.document?.document_taxes ?? []).map((t: any) => ({
      name: t.taxes?.name ?? 'Impuesto',
      amount: Number(t.tax_amount ?? 0),
    })),
    total,
    paid_amount: paidAmount,
    pending_amount: Math.max(0, total - paidAmount),
  }
})

const pointOfSale = computed(() => {
  // The sequence selected for this document is the source of truth. The code
  // fallback keeps old documents (created before document_sequence_id) working.
  const documentPointOfSale = props.document?.document_sequences?.point_of_sale
  if (documentPointOfSale) return String(documentPointOfSale)

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

const templates = ref<any[]>([])
const selectedTemplateId = ref<string | null>(null)
const selectedTemplate = computed(() => {
  if (!['QUOTE', 'ORDER'].includes(category.value)) return null
  return templates.value.find(item => item.id === selectedTemplateId.value)
    ?? templates.value.find(item => item.is_default)
    ?? templates.value[0]
    ?? null
})

watch(category, async (value) => {
  templates.value = []
  selectedTemplateId.value = null
  if (!['QUOTE', 'ORDER'].includes(value)) return
  try {
    templates.value = await $fetch('/api/backend/sales-flow/print-templates', { query: { category: value } })
    selectedTemplateId.value = templates.value.find(item => item.is_default)?.id ?? templates.value[0]?.id ?? null
  } catch {
    // La impresión estándar sigue disponible si aún no se aplicó la migración.
  }
}, { immediate: true })
</script>

<template>
  <div v-if="templates.length > 1" class="no-print mb-4 rounded-lg border border-default bg-default p-3">
    <UFormField label="Formato de impresión">
      <USelect v-model="selectedTemplateId" :items="templates.map(item => ({ label: item.name, value: item.id }))" value-key="value" class="w-full sm:w-80" />
    </UFormField>
  </div>

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
    :print-template="selectedTemplate"
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
    :print-template="selectedTemplate"
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

  <ValePrint
    v-else-if="category === 'VALE'"
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
