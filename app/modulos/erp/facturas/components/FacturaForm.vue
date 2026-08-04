<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

// Auth
import { useAuthStore } from '~/modulos/auth/auth.store'

// Companies
import { useCompaniesStore } from '~/modulos/companies/store/company.store'

// BusinessParties
import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import BusinessPartyModal from '~/modulos/logistica/master-data/bussiness-parties/components/BusinnesPartyModal.vue'
import { useBusinessParties } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessParties'

// Products
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'

// Currencies
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'

// Document Types
import { useDocumentsTypesStore } from '~/modulos/erp/documents/documents-types/store/documents-types.store'
import { useDocumentsTypes } from '~/modulos/erp/documents/documents-types/composables/useDocumentsTypes'
import { useDocumentTypesForModule } from '~/modulos/erp/documents/documents-types/composables/useDocumentTypesForModule'

// Invoice
import FacturaItemsTable from './FacturaItemsTable.vue'
import FacturaTotals from './FacturaTotals.vue'
import { getDocumentTypeForVatCondition, type VatCondition } from '~/modulos/erp/invoices/utils/vatConditionMap'

import type { Document, FacturaItem } from '../types/factura.types'

interface Props {
  loading?: boolean
  initialValues?: Partial<Document>
  moduleCode?: string
  category?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [payload: any]
}>()

const toast = useToast()

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

// Filtrar productos según módulo (venta/compra)
const usageFilter = computed(() => {
  if (props.moduleCode === 'SALES') return 'sale' as const
  if (props.moduleCode === 'PURCHASES') return 'purchase' as const
  return null
})
const { items: productOptions } = useProducts(products, usageFilter.value)
const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()

// Usar composable para filtrar tipos de documento por dirección + condición del emisor/receptor
const moduleCode = computed(() => (props.moduleCode === 'SALES' ? 'SALES' : 'PURCHASES') as 'SALES' | 'PURCHASES')

// ─── Form State ──────────────────────────────────────
const form = reactive({
  document_type_id: '',
  party_id: '',
  date: new Date().toISOString().split('T')[0],
  descrip: '',
  ref: '',
  currency_code: 'ARS'
})

const selectedParty = computed(() => parties.value.find((p) => p.id === form.party_id))
const partnerCondition = computed(() => (selectedParty.value?.vat_condition as string) ?? null)

const {
  filteredDocumentTypes: documentTypeOptions,
  isDocumentTypeValid,
  getValidationMessage,
  fetchIssuerCondition
} = useDocumentTypesForModule(moduleCode.value, partnerCondition)

const items = ref<FacturaItem[]>([])

// ─── Validación de comprobante ─────────────────────────
const documentTypeValidation = ref<string | null>(null)

// ─── Tax Engine Preview ───────────────────────────────
const lastPreview = ref<any>(null)
const previewLoading = ref(false)
let isRecalculating = false
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null

async function fetchPreview() {
  if (!items.value.length || !form.document_type_id) {
    lastPreview.value = null
    return
  }

  previewLoading.value = true
  isRecalculating = true
  try {
    const authStore = useAuthStore()
    const currentDocType = documentsTypes.value.find((d) => d.id === form.document_type_id)
    const result = await $fetch('/api/erp/tax-engine/calculate-preview', {
      method: 'POST',
      body: {
        issuerCompanyId: authStore.selectedCompany?.id ?? '',
        partnerId: form.party_id || undefined,
        partnerVatCondition: selectedParty.value?.vat_condition,
        documentTypeId: form.document_type_id,
        documentLetterType: currentDocType?.letter_type,
        currency: form.currency_code,
        date: form.date,
        operationType: props.moduleCode === 'SALES' ? 'SALE' : 'PURCHASE',
        items: items.value.map((i) => ({
          productId: i.product_id || undefined,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unit_price)
        }))
      }
    })
    lastPreview.value = result

    // Escribir impuestos por línea del backend de vuelta a items
    const previewItems = result.document?.items ?? []
    previewItems.forEach((previewItem: any, idx: number) => {
      if (items.value[idx]) {
        items.value[idx].taxes = (previewItem.taxes ?? []).map((t: any) => ({
          tax_id: t.tax_id,
          name: t.name,
          code: t.code,
          tax_rate: t.rate,
          tax_amount: t.amount,
          is_included_in_price: t.isIncludedInPrice ?? false,
          calculation_level: 'line'
        }))
        items.value[idx].total_taxes = previewItem.totalTaxes ?? 0
        items.value[idx].subtotal = previewItem.price ?? items.value[idx].subtotal
        items.value[idx].total = previewItem.total ?? items.value[idx].total
      }
    })
  } catch (e) {
    console.error('Preview error:', e)
    lastPreview.value = null
  } finally {
    previewLoading.value = false
    isRecalculating = false
  }
}

function debouncedFetchPreview() {
  if (previewDebounceTimer) clearTimeout(previewDebounceTimer)
  previewDebounceTimer = setTimeout(() => {
    fetchPreview()
  }, 300)
}

// Totales del preview
const subtotal = computed(() => lastPreview.value?.document?.subtotal ?? 0)
const totalTaxes = computed(() => lastPreview.value?.document?.totalTaxes ?? 0)
const total = computed(() => lastPreview.value?.document?.total ?? 0)
const taxesSummary = computed(() => lastPreview.value?.document?.documentTaxes ?? [])
const showTaxBreakdown = computed(() => lastPreview.value?.document?.settings?.showTaxBreakdown ?? true)

// Watch para recalcular cuando cambien precios o cantidades
watch(
  items,
  () => {
    if (isRecalculating) return
    if (items.value.length > 0 && form.document_type_id) {
      debouncedFetchPreview()
    }
  },
  { deep: true }
)

// Watch para re-resolver precios cuando cambie la currency del documento
watch(
  () => form.currency_code,
  (newCurrency, oldCurrency) => {
    if (!newCurrency || !oldCurrency || newCurrency === oldCurrency) return
    if (!items.value.length) return

    items.value.forEach((item) => {
      // Buscar el producto en el store
      const product = products.value.find(p => p.id === item.product_id)
      if (!product) return

      // Buscar precio que coincida con la nueva currency
      const priceRecord = (product.product_price ?? []).find(
        (pp: any) => pp.currencies?.code === newCurrency
      )

      if (priceRecord) {
        item.unit_price = Number(priceRecord.price ?? 0)
      } else {
        // No hay precio para esa currency → precio 0
        item.unit_price = 0
        toast.add({
          title: 'Precio no disponible',
          description: `El producto "${item.product_name}" no tiene precio en ${newCurrency}. Ingresá el precio manualmente.`,
          color: 'warning'
        })
      }
    })

    // Re-calcular totales con el backend
    fetchPreview()
  }
)

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
watch(selectedParty, (party) => {
  if (!party || !props.moduleCode) return
  const vatCondition = party.vat_condition as VatCondition | undefined
  if (!vatCondition) return

  const direction = props.moduleCode === 'SALES' ? 'sale' : 'purchase'

  // Obtener condición del emisor desde el store de companies
  const companiesStore = useCompaniesStore()
  const issuerVat = companiesStore.current?.vat_condition ?? null

  const suggestedCode = getDocumentTypeForVatCondition(vatCondition, direction, issuerVat)

  // Match exacto por código (ej: "FA-A", "FB-A", "FC-A")
  const match = documentsTypes.value.find((d) => {
    if (!d.code) return false
    return d.code.toUpperCase() === suggestedCode.toUpperCase()
  })

  if (match) {
    // Siempre actualizar cuando cambia el partner (auto-select)
    form.document_type_id = match.id
  }
})

// Recalcular preview cuando cambia el tipo de documento
watch(() => form.document_type_id, (newId) => {
  // Validar compatibilidad emisor ↔ comprobante
  const selectedDoc = documentsTypes.value.find((d) => d.id === newId)
  if (selectedDoc) {
    const msg = getValidationMessage(selectedDoc.code, selectedDoc.letter_type)
    documentTypeValidation.value = msg
  } else {
    documentTypeValidation.value = null
  }

  if (items.value.length > 0) {
    fetchPreview()
  }
})

onMounted(async () => {
  await Promise.all([
    partiesStore.fetchAll(),
    productsStore.fetchAll(),
    documentsTypesStore.fetchAll(),
    initCurrencies(),
    fetchIssuerCondition()
  ])
})

// Auto-seleccionar tipo de documento por categoría
watch(
  () => [props.category, documentTypeOptions.value],
  () => {
    if (!props.category || !documentTypeOptions.value.length) return
    // Si ya hay un tipo seleccionado, no sobreescribir
    if (form.document_type_id) return

    const match = documentTypeOptions.value.find((opt) => {
      const docType = documentsTypes.value.find((dt) => dt.id === opt.value)
      return docType?.category === props.category
    })

    if (match) {
      form.document_type_id = match.value
    }
  },
  { immediate: true }
)

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
  const quantity = 1

  // La currency del documento es la fuente de verdad
  // Buscar precio que coincida con la currency del documento
  const matchingPrice = prod.prices?.find(
    (p: any) => p.code === form.currency_code
  )

  const unitPrice = matchingPrice?.amount ?? 0

  // Warning si no hay precio para esa currency
  if (!matchingPrice && prod.prices?.length > 0) {
    toast.add({
      title: 'Precio no disponible',
      description: `El producto no tiene precio en ${form.currency_code}. Ingresá el precio manualmente.`,
      color: 'warning'
    })
  }

  items.value.push({
    product_id: prod.value ?? prod.id ?? '',
    product_name: prod.label ?? prod.name ?? 'Producto',
    quantity,
    unit_price: unitPrice,
    price: quantity * unitPrice,
    subtotal: quantity * unitPrice,
    taxes: [],
    total_taxes: 0,
    total: quantity * unitPrice
  })

  // Recalcular con el backend
  fetchPreview()
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  fetchPreview()
}

function submit() {
  // Usar el payload del último preview para enviar al backend
  const previewPayload = lastPreview.value?.document

  const payload = {
    document_type_id: form.document_type_id,
    party_id: form.party_id,
    date: form.date,
    descrip: form.descrip,
    ref: form.ref,
    currency_code: form.currency_code,
    items: items.value.map((i, idx) => ({
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      taxes: previewPayload?.items?.[idx]?.taxes?.map((t: any) => ({
        tax_id: t.tax_id,
        tax_rate: t.rate,
        tax_amount: t.amount
      })) ?? []
    }))
  }

  console.log('[DEBUG] Purchase payload:', JSON.stringify(payload, null, 2))
  emit('submit', payload)
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
    <!-- Header: Party + Document Type + Currency + Date -->
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <USelect
          v-model="form.currency_code"
          :items="currencyOptions"
          placeholder="Moneda"
        />

        <UInput v-model="form.date" type="date" label="Fecha" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UInput v-model="form.descrip" placeholder="Referencia (opcional)" class="md:col-span-4" />
      </div>

      <!-- Validación de comprobante -->
      <div v-if="documentTypeValidation" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
        {{ documentTypeValidation }}
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
        <FacturaTotals :subtotal="subtotal" :taxes="taxesSummary" :total="total" :show-breakdown="showTaxBreakdown" />
      </UCard>
    </div>
  </div>

  <BusinessPartyModal v-model:open="showBusinessPartiesModal" v-model:business-party="selectedBusinessParty" />
</template>
