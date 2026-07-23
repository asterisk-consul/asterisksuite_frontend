<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

// BusinessParties
import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import BusinessPartyModal from '~/modulos/logistica/master-data/bussiness-parties/components/BusinnesPartyModal.vue'
import { useBusinessParties } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessParties'

// Products
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

// Document Types
import { useDocumentsTypesStore } from '~/modulos/erp/documents/documents-types/store/documents-types.store'
import { useDocumentsTypes } from '~/modulos/erp/documents/documents-types/composables/useDocumentsTypes'

// Invoice
import FacturaItemsTable from './FacturaItemsTable.vue'
import FacturaTotals from './FacturaTotals.vue'
import { useInvoiceCalculation } from '../composable/useInvoiceCalculation'
import { getDocumentTypeForVatCondition, type VatCondition } from '~/modulos/erp/invoices/utils/vatConditionMap'

import type { Document, FacturaItem } from '../types/factura.types'

interface Props {
  loading?: boolean
  initialValues?: Partial<Document>
  moduleCode?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [payload: any]
}>()

// ─── Stores ──────────────────────────────────────────
const selectedBusinessParty = ref<BusinessParty | undefined>(undefined)
const showBusinessPartiesModal = ref(false)
const partiesStore = useBusinessPartiesStore()
const productsStore = useProductsStore()
const documentsTypesStore = useDocumentsTypesStore()
const { items: parties } = storeToRefs(partiesStore)
const { items: products } = storeToRefs(productsStore)
const { items: documentsTypes } = storeToRefs(documentsTypesStore)

// Filtrar parties por tipo según módulo
const partyType = computed(() => props.moduleCode === 'SALES' ? 'CUSTOMER' : 'SUPPLIER')
const { items: partyOptions } = useBusinessParties(parties, partyType.value)
const { items: productOptions } = useProducts(products)

// Filtrar tipos de documento por dirección (1=venta, -1=compra)
const documentTypeOptions = computed(() => {
  const direction = props.moduleCode === 'SALES' ? 1 : -1
  return documentsTypes.value
    .filter((d) => {
      if (!props.moduleCode) return true
      return d.direction === direction
    })
    .map((d) => ({ label: d.description, value: d.id, code: d.code, direction: d.direction }))
})

// ─── Form State ──────────────────────────────────────
const form = reactive({
  document_type_id: '',
  party_id: '',
  date: new Date().toISOString().split('T')[0],
  descrip: '',
  ref: '',
  currency_code: 'ARS'
})

const items = ref<FacturaItem[]>([])

// ─── Invoice Calculation Composable ───────────────────
const currentDocumentType = computed(() => documentsTypes.value.find((d) => d.id === form.document_type_id))
const docTypeTaxes = computed(() => currentDocumentType.value?.document_type_taxes ?? [])

const { subtotal, totalTaxes, total, taxesSummary, recalculateItem } = useInvoiceCalculation(items, docTypeTaxes)

// ─── Watch initialValues ──────────────────────────────────
watch(
  () => props.initialValues,
  (val) => {
    if (!val) return

    form.document_type_id = val.document_type_id ?? ''
    form.party_id = val.party_id ?? ''
    form.date = val.date ? new Date(val.date).toISOString().split('T')[0] : ''
    form.descrip = val.descrip ?? ''
    form.ref = val.ref ?? ''
    form.currency_code = val.currency_code ?? 'ARS'

    // Mapear items del documento
    // Si vienen del mapper (items), usarlos directamente
    // Si vienen raw del backend (document_items), mapearlos
    if (val.items?.length) {
      items.value = val.items
    } else {
      const documentTaxes = (val.document_taxes ?? []).map((tax: any) => ({
        tax_id: tax.tax_id,
        name: tax.taxes?.name ?? '',
        code: tax.taxes?.code ?? '',
        tax_rate: Number(tax.tax_rate ?? 0),
        tax_amount: 0,
        calculation_level: tax.taxes?.calculation_level?.toLowerCase() ?? 'document',
        is_included_in_price: false
      }))

      items.value = (val.document_items ?? []).map((item: any) => {
        const subtotal = Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)

        const lineTaxes = (item.document_item_taxes ?? []).map((tax: any) => ({
          tax_id: tax.tax_id,
          name: tax.taxes?.name ?? '',
          code: tax.taxes?.code ?? '',
          tax_rate: Number(tax.tax_rate ?? 0),
          tax_amount: Number(tax.tax_amount ?? 0),
          calculation_level: tax.taxes?.calculation_level?.toLowerCase() ?? 'line',
          is_included_in_price: false
        }))

        const docTaxesForItem = documentTaxes.map((tax: any) => ({
          ...tax,
          tax_amount: Number(((subtotal * tax.tax_rate) / 100).toFixed(2))
        }))

        const taxes = [...lineTaxes, ...docTaxesForItem]
        const totalTaxes = taxes.reduce((acc: number, tax: any) => acc + Number(tax.tax_amount || 0), 0)

        return {
          product_id: item.product_id,
          product_name: item.products?.name || item.products?.description || 'Producto',
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? 0),
          price: subtotal,
          subtotal,
          taxes,
          total_taxes: totalTaxes,
          total: subtotal + totalTaxes
        }
      })
    }
  },
  { immediate: true, deep: true }
)

// ─── Auto-select Document Type by VAT Condition ───────
const selectedParty = computed(() => parties.value.find((p) => p.id === form.party_id))

watch(selectedParty, (party) => {
  if (!party || !props.moduleCode) return
  const vatCondition = party.vat_condition as VatCondition | undefined
  if (!vatCondition) return

  const direction = props.moduleCode === 'SALES' ? 'sale' : 'purchase'
  const suggestedCode = getDocumentTypeForVatCondition(vatCondition, direction)

  // Match exacto por código (ej: "FA-A", "FB-A", "FC-A")
  const match = documentsTypes.value.find((d) => {
    if (!d.code) return false
    return d.code.toUpperCase() === suggestedCode.toUpperCase()
  })

  if (match && !form.document_type_id) {
    form.document_type_id = match.id
  }
})

onMounted(async () => {
  await Promise.all([partiesStore.fetchAll(), productsStore.fetchAll(), documentsTypesStore.fetchAll()])
})

const selectedCustomer = computed({
  get: () => partyOptions.value.find((i) => i.value === form.party_id),
  set: (option) => { form.party_id = option?.value ?? '' }
})

const selectedDocumentType = computed({
  get: () => documentTypeOptions.value.find((i) => i.value === form.document_type_id),
  set: (option) => { form.document_type_id = option?.value ?? '' }
})

const partyInfo = computed(() => {
  if (!selectedParty.value) return null
  const p = selectedParty.value
  return {
    name: p.name,
    tax_id: p.tax_id || '—',
    vat_condition: p.vat_condition || '—',
    email: p.email || '—'
  }
})

function addItem(prod: any) {
  const unitPrice = Number(prod.price ?? prod.data?.price ?? 0)
  const quantity = 1
  const subtotal = quantity * unitPrice

  const productTaxes = (prod.taxes ?? []).map((t: any) => {
    const rate = Number(t.taxes?.rate ?? 0)
    const taxAmount = Number(((subtotal * rate) / 100).toFixed(2))
    return {
      tax_id: t.tax_id,
      name: t.taxes?.name ?? '',
      code: t.taxes?.code ?? '',
      tax_rate: rate,
      tax_amount: taxAmount,
      calculation_level: String(t.taxes?.calculation_level ?? 'LINE').toLowerCase(),
      is_included_in_price: Boolean(t.is_included_in_price)
    }
  })

  const docTaxes = (currentDocumentType.value?.document_type_taxes ?? []).map((t: any) => {
    const rate = Number(t.taxes?.rate ?? 0)
    const taxAmount = Number(((subtotal * rate) / 100).toFixed(2))
    return {
      tax_id: t.tax_id,
      name: t.taxes?.name ?? '',
      code: t.taxes?.code ?? '',
      tax_rate: rate,
      tax_amount: taxAmount,
      calculation_level: String(t.taxes?.calculation_level ?? 'DOCUMENT').toLowerCase(),
      is_included_in_price: false
    }
  })

  const taxes = [...productTaxes, ...docTaxes]
  const totalTaxesItem = taxes.reduce((acc, tax) => acc + Number(tax.tax_amount || 0), 0)

  items.value.push({
    product_id: prod.value ?? prod.id ?? '',
    product_name: prod.label ?? prod.name ?? 'Producto',
    quantity,
    unit_price: unitPrice,
    price: subtotal,
    subtotal,
    taxes,
    total_taxes: totalTaxesItem,
    total: subtotal + totalTaxesItem
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function submit() {
  emit('submit', {
    document_type_id: form.document_type_id,
    party_id: form.party_id,
    date: form.date,
    descrip: form.descrip,
    ref: form.ref,
    currency_code: form.currency_code,
    items: items.value.map((i) => ({
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      taxes: i.taxes.map((t) => ({
        tax_id: t.tax_id,
        tax_rate: Number(t.tax_rate || 0),
        tax_amount: Number(t.tax_amount || 0)
      }))
    }))
  })
}

const onEditBussinessParty = () => {
  if (!selectedCustomer.value?.value) return
  const customer = parties.value.find((c) => c.id === selectedCustomer.value?.value)
  if (!customer) return
  selectedBusinessParty.value = customer
  showBusinessPartiesModal.value = true
}

defineExpose({ submit })
</script>

<template>
  <div class="space-y-4">
    <!-- Header: Party + Document Type + Date -->
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex gap-2">
          <USelectMenu
            v-model="selectedCustomer"
            :items="partyOptions"
            placeholder="Cliente / Proveedor"
            searchable
            class="w-full"
          />
          <UButton icon="i-lucide-plus" variant="outline" @click="showBusinessPartiesModal = true" />
          <UButton
            icon="i-lucide-pencil"
            variant="outline"
            :disabled="!selectedCustomer"
            @click="onEditBussinessParty"
          />
        </div>

        <USelectMenu
          v-model="selectedDocumentType"
          :items="documentTypeOptions"
          placeholder="Tipo de documento"
          class="w-full"
        />

        <UInput v-model="form.date" type="date" label="Fecha" />
      </div>

      <!-- Party info card -->
      <div v-if="partyInfo" class="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex gap-6 text-sm">
        <div>
          <span class="text-gray-500">CUIT: </span>
          <span class="font-mono">{{ partyInfo.tax_id }}</span>
        </div>
        <div>
          <span class="text-gray-500">IVA: </span>
          <span>{{ partyInfo.vat_condition }}</span>
        </div>
        <div v-if="partyInfo.email !== '—'">
          <span class="text-gray-500">Email: </span>
          <span>{{ partyInfo.email }}</span>
        </div>
      </div>
    </UCard>

    <!-- Items Table -->
    <UCard>
      <FacturaItemsTable
        :items="items"
        :product-options="productOptions"
        @remove="removeItem"
        @add="addItem"
      />
    </UCard>

    <!-- Totals -->
    <div class="sticky bottom-0 z-10">
      <UCard class="shadow-lg border-t-2 border-primary">
        <FacturaTotals :subtotal="subtotal" :taxes="taxesSummary" :total="total" />
      </UCard>
    </div>
  </div>

  <BusinessPartyModal v-model:open="showBusinessPartiesModal" v-model:business-party="selectedBusinessParty" />
</template>
