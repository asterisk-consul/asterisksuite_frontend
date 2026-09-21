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

// Products
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useStockService } from '~/modulos/logistica/warehouses/stock/stock.service'

// Currencies
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { BusinessPartyIibbRegistration, CompanyTaxJurisdiction, TaxRule } from '~/modulos/erp/fiscal/types/fiscal.types'

// Document Types
import { useDocumentsTypesStore } from '~/modulos/erp/documents/documents-types/store/documents-types.store'
import { useDocumentsTypes } from '~/modulos/erp/documents/documents-types/composables/useDocumentsTypes'
import { useDocumentTypesForModule } from '~/modulos/erp/documents/documents-types/composables/useDocumentTypesForModule'

// Document Sequences (Punto de Venta)
import { useDocumentSequencesService } from '~/modulos/erp/document-sequences/service/document-sequences.service'
import type { DocumentSequence } from '~/modulos/erp/document-sequences/types/document-sequences.types'

// Invoice
import FacturaItemsTable from './FacturaItemsTable.vue'
import FacturaTotals from './FacturaTotals.vue'
import ReferenceDocumentPicker from './ReferenceDocumentPicker.vue'
import { getDocumentTypeForVatCondition, type VatCondition } from '~/modulos/erp/invoices/utils/vatConditionMap'

import type { Document, FacturaItem } from '../types/factura.types'

interface Props {
  loading?: boolean
  initialValues?: Partial<Document>
  moduleCode?: string
  category?: string
  parentDocumentId?: string
  operationalMode?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [payload: any]
}>()

const toast = useToast()

// â”€â”€â”€ Stores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const selectedBusinessParty = ref<BusinessParty | undefined>(undefined)
const showBusinessPartiesModal = ref(false)
const partiesStore = useBusinessPartiesStore()
const productsStore = useProductsStore()
const documentsTypesStore = useDocumentsTypesStore()
const depositosStore = useDepositosStore()
const stockService = useStockService()
const fiscalService = useFiscalService()
const { items: parties } = storeToRefs(partiesStore)
const { items: products } = storeToRefs(productsStore)
const { items: documentsTypes } = storeToRefs(documentsTypesStore)
const { warehouses } = storeToRefs(depositosStore)

// Filtrar parties por tipo según módulo
const payablePartyTypes = new Set(['SUPPLIER', 'SERVICE_PROVIDER', 'UTILITY', 'TAX_AUTHORITY', 'FINANCIAL'])
const partyTypeLabels: Record<string, string> = {
  SUPPLIER: 'Proveedor',
  SERVICE_PROVIDER: 'Proveedor de servicios',
  UTILITY: 'Servicio público',
  TAX_AUTHORITY: 'Ente impositivo',
  FINANCIAL: 'Entidad financiera'
}
const partyOptions = computed(() => parties.value
  .filter(party => props.moduleCode === 'SALES'
    ? party.type === 'CUSTOMER'
    : payablePartyTypes.has(party.type))
  .map(party => ({
    label: props.moduleCode === 'SALES'
      ? party.name
      : `${party.name} · ${partyTypeLabels[party.type] ?? party.type}${party.tax_id ? ` · ${party.tax_id}` : ''}`,
    value: party.id
  })))

// Filtrar productos según módulo (venta/compra)
const usageFilter = computed(() => {
  if (props.moduleCode === 'SALES') return 'sale' as const
  if (props.moduleCode === 'PURCHASES') return 'purchase' as const
  return null
})
const { items: productOptions } = useProducts(products, usageFilter.value)
const { init: initCurrencies, codeSelectItems: currencyOptions, baseCurrency } = useCurrencies()
const {
  exchangeRate: resolvedRate,
  rateType: resolvedRateType,
  isBaseCurrency,
  autoResolve,
  setManualRate,
  convertAmount,
} = useExchangeRate()

// Usar composable para filtrar tipos de documento por dirección + condición del emisor/receptor
const moduleCode = computed(() => (props.moduleCode === 'SALES' ? 'SALES' : 'PURCHASES') as 'SALES' | 'PURCHASES')

// â”€â”€â”€ Form State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const form = reactive({
  document_type_id: '',
  party_id: '',
  date: today(),
  descrip: '',
  ref: '',
  currency_code: 'ARS',
  exchange_rate: null as number | null,
  rate_type: 'OFFICIAL' as string,
  warehouse_id: '' as string,
  fiscal_jurisdiction_id: '' as string,
})
const advancedWarehouseAssignment = ref(false)
const allWarehouseOptions = computed(() => warehouses.value
  .filter(warehouse => warehouse.active)
  .map(warehouse => ({ label: warehouse.name, value: warehouse.id })))
const stockByWarehouse = ref<Record<string, Record<string, number>>>({})

async function loadStockAvailability() {
  if (props.moduleCode !== 'SALES') return
  const activeWarehouses = warehouses.value.filter(warehouse => warehouse.active)
  const entries = await Promise.all(activeWarehouses.map(async warehouse => {
    const stock = await stockService.getStock(warehouse.id)
    return [warehouse.id, Object.fromEntries(stock.map(item => [
      item.product_id,
      Number(item.quantity) - Number(item.reserved_quantity)
    ]))] as const
  }))
  stockByWarehouse.value = Object.fromEntries(entries)
}

const requiredByProduct = computed(() => {
  const required: Record<string, number> = {}
  for (const item of items.value) {
    if (!item.product_id) continue
    required[item.product_id] = (required[item.product_id] ?? 0) + Number(item.quantity || 0)
  }
  return required
})

const warehouseOptions = computed(() => {
  if (props.moduleCode !== 'SALES') return allWarehouseOptions.value
  return allWarehouseOptions.value
    .filter(option => Object.entries(requiredByProduct.value).every(([productId, quantity]) =>
      (stockByWarehouse.value[option.value]?.[productId] ?? 0) >= quantity
    ))
    .map(option => ({ ...option, label: `${option.label} · stock suficiente` }))
})

function warehouseOptionsForItem(item: FacturaItem) {
  if (props.moduleCode !== 'SALES' || !item.product_id) return allWarehouseOptions.value
  return allWarehouseOptions.value
    .map(option => ({
      ...option,
      available: stockByWarehouse.value[option.value]?.[item.product_id] ?? 0
    }))
    .filter(option => option.available >= Number(item.quantity || 0))
    .map(option => ({ ...option, label: `${option.label} · disponible: ${option.available}` }))
}

function singleWarehouseForProduct(productId: string): string | null {
  if (props.moduleCode !== 'SALES') return form.warehouse_id || null
  const options = allWarehouseOptions.value
    .map(option => ({
      ...option,
      available: stockByWarehouse.value[option.value]?.[productId] ?? 0
    }))
    .filter(option => option.available > 0)
  return options.length === 1 ? options[0].value : null
}
const affectsStock = computed(() => {
  const type = documentsTypes.value.find(item => item.id === form.document_type_id)
  return type?.affects_stock === true
})

// â”€â”€â”€ Reference Document (NC/ND â†’ Factura) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const referenceDocumentId = ref<string | undefined>(undefined)

function applyReferenceDocument(doc: any) {
  if (!doc) return
  referenceDocumentId.value = doc.id
  form.party_id = doc.party_id ?? ''
  form.currency_code = doc.currency_code ?? 'ARS'
  form.descrip = doc.descrip ?? ''
  form.ref = doc.ref ?? ''

  // Mapear ítems del documento padre (quantity - quantity_invoiced)
  items.value = (doc.document_items ?? []).map((item: any) => {
    const remainingQty = Number(item.quantity ?? 0) - Number(item.quantity_invoiced ?? 0)
    const subtotal = remainingQty * Number(item.unit_price ?? 0)
    return {
      product_id: item.product_id,
      product_name: item.products?.name || item.products?.description || 'Producto',
      quantity: remainingQty,
      unit_price: Number(item.unit_price ?? 0),
      price: subtotal,
      subtotal,
      taxes: [],
      total_taxes: 0,
      total: subtotal
    }
  }).filter((i: any) => i.quantity > 0)
}

function handleReferenceSelect(documentId: string) {
  // Fetch full document via the appropriate service
  const fetchDoc = props.moduleCode === 'SALES'
    ? import('~/modulos/erp/sales/services/sales.service').then(m => m.DocumentsSalesService.getOne(documentId))
    : import('~/modulos/erp/purchases/purchases-documents.services').then(m => m.DocumentsPurchasesService.getOne(documentId))

  fetchDoc
    .then(doc => applyReferenceDocument(doc))
    .catch(e => toast.add({ title: 'Error al cargar factura', description: e?.data?.message, color: 'error' }))
}

function handleReferenceClear() {
  referenceDocumentId.value = undefined
}

// Whether to show the reference document picker (NC/ND categories)
const showReferencePicker = computed(() => {
  if (props.category === 'CREDIT_NOTE' || props.category === 'DEBIT_NOTE') return true
  const selected = documentsTypes.value.find(d => d.id === form.document_type_id)
  return selected?.category === 'CREDIT_NOTE' || selected?.category === 'DEBIT_NOTE'
})

// â”€â”€â”€ Exchange Rate: auto-resolve on currency change â”€â”€â”€â”€â”€â”€â”€â”€â”€
const isForeignCurrency = computed(() => {
  if (!baseCurrency.value) return false
  return form.currency_code.toUpperCase() !== baseCurrency.value.code.toUpperCase()
})

watch(
  () => form.currency_code,
  async (newCode) => {
    if (!newCode || !isForeignCurrency.value) {
      form.exchange_rate = null
      return
    }
    await autoResolve(newCode, baseCurrency.value?.code ?? 'ARS', form.rate_type)
    form.exchange_rate = resolvedRate.value
  },
  { immediate: true },
)

watch(
  () => form.rate_type,
  async (newType) => {
    if (!form.currency_code || !isForeignCurrency.value) return
    await autoResolve(form.currency_code, baseCurrency.value?.code ?? 'ARS', newType)
    form.exchange_rate = resolvedRate.value
  },
)

// Sync resolved rate back to form
watch(resolvedRate, (rate) => {
  if (rate) form.exchange_rate = rate
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

// â”€â”€â”€ Punto de Venta (Secuencias) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const documentSequencesService = useDocumentSequencesService()
const sequences = ref<DocumentSequence[]>([])
// Keep only the UUID in the form state. USelectMenu can otherwise return either
// the whole option or its value depending on its configuration/version.
const selectedSequenceId = ref<string>('')

const sequenceOptions = computed(() => {
  return sequences.value
    .filter(s => s.active && !s.deleted_at)
    .filter(s => {
      if (!form.document_type_id) return true
      const dt = documentsTypes.value.find(d => d.id === form.document_type_id)
      if (!dt) return true
      // Filtrar secuencias que tengan el tipo de documento asociado (junction table)
      const linkedTypes = (s.document_type_sequences ?? []).map(
        (link: any) => link.document_types?.id ?? link.document_type_id
      )
      if (linkedTypes.length > 0) {
        return linkedTypes.includes(form.document_type_id)
      }
      // Fallback: si no tiene tipos vinculados (backward compatibility), verificar FK
      if (s.document_types?.length) {
        return s.document_types.some((dtSeq: any) => dtSeq.id === form.document_type_id)
      }
      // Si no tiene ninguna vinculación, NO mostrar (ya hay tipo doc seleccionado)
      return false
    })
    .map(s => ({
      label: `PV ${s.point_of_sale}${s.prefix ? ` - ${s.prefix}` : ''} (${s.name})`,
      value: s.id,
      point_of_sale: s.point_of_sale
    }))
})

// â”€â”€â”€ Validación de comprobante â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const documentTypeValidation = ref<string | null>(null)

// â”€â”€â”€ Tax Engine Preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const lastPreview = ref<any>(null)
const partyIibbRegistrations = ref<BusinessPartyIibbRegistration[]>([])
const iibbPerceptionRules = ref<TaxRule[]>([])
const companyIibbJurisdictions = ref<CompanyTaxJurisdiction[]>([])
const manualIibbAmount = ref<number | null>(null)
const manualIibbReason = ref('')
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
    const result = await $fetch('/api/backend/tax-engine/calculate-preview', {
      method: 'POST',
      body: {
        issuerCompanyId: authStore.selectedCompany?.id ?? '',
        partnerId: form.party_id || undefined,
        partnerVatCondition: selectedParty.value?.vat_condition,
        documentTypeId: form.document_type_id,
        documentLetterType: currentDocType?.letter_type,
        currency: form.currency_code,
        date: form.date,
        jurisdictionId: form.fiscal_jurisdiction_id || undefined,
        operationType: props.moduleCode === 'SALES' ? 'SALE' : 'PURCHASE',
        items: items.value.map((i) => ({
          productId: i.product_id || undefined,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unit_price) * (1 - Math.min(100, Math.max(0, Number(i.discount_percentage || 0))) / 100)
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
const automaticTaxesSummary = computed(() => lastPreview.value?.document?.documentTaxes ?? [])
const automaticIibbTax = computed(() => automaticTaxesSummary.value.find((tax: any) =>
  String(tax.code ?? '').includes('IIBB')
))
const taxesSummary = computed(() => automaticTaxesSummary.value.map((tax: any) =>
  tax.tax_id === automaticIibbTax.value?.tax_id && manualIibbAmount.value != null
    ? { ...tax, amount: Number(manualIibbAmount.value) }
    : tax
))
const iibbDelta = computed(() => manualIibbAmount.value == null || !automaticIibbTax.value
  ? 0
  : Number(manualIibbAmount.value) - Number(automaticIibbTax.value.amount))
const totalTaxes = computed(() => (lastPreview.value?.document?.totalTaxes ?? 0) + iibbDelta.value)
const total = computed(() => (lastPreview.value?.document?.total ?? 0) + iibbDelta.value)
const showTaxBreakdown = computed(() => lastPreview.value?.document?.settings?.showTaxBreakdown ?? true)
const activeIibbJurisdictionIds = computed(() => {
  const documentDate = new Date(`${form.date}T12:00:00`)
  const activeRuleIds = new Set(iibbPerceptionRules.value
    .filter(rule => rule.application_type === 'PERCEPTION' && rule.is_active)
    .filter(rule => !rule.operation_type || rule.operation_type === (props.moduleCode === 'SALES' ? 'SALE' : 'PURCHASE'))
    .filter(rule => new Date(`${rule.valid_from.slice(0, 10)}T12:00:00`) <= documentDate)
    .filter(rule => !rule.valid_to || new Date(`${rule.valid_to.slice(0, 10)}T12:00:00`) >= documentDate)
    .map(rule => rule.jurisdiction_id)
    .filter((id): id is string => Boolean(id)))
  return new Set(companyIibbJurisdictions.value
    .filter(config => config.tax_type === 'IIBB' && config.is_perception_agent)
    .filter(config => !config.valid_from || new Date(`${config.valid_from.slice(0, 10)}T12:00:00`) <= documentDate)
    .filter(config => !config.valid_to || new Date(`${config.valid_to.slice(0, 10)}T12:00:00`) >= documentDate)
    .map(config => config.jurisdiction_id)
    .filter(id => activeRuleIds.has(id)))
})
const jurisdictionOptions = computed(() => partyIibbRegistrations.value
  .filter(r => r.is_active && r.jurisdiction_id)
  .map(r => ({
    label: activeIibbJurisdictionIds.value.has(r.jurisdiction_id as string)
      ? r.jurisdiction?.name ?? 'Jurisdicción IIBB'
      : `${r.jurisdiction?.name ?? 'Jurisdicción IIBB'} · percepción inactiva`,
    value: r.jurisdiction_id as string,
    disabled: !activeIibbJurisdictionIds.value.has(r.jurisdiction_id as string)
  })))
const selectableJurisdictionOptions = computed(() => jurisdictionOptions.value.filter(j => !j.disabled))

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
  async (newCurrency, oldCurrency) => {
    if (!newCurrency || !oldCurrency || newCurrency === oldCurrency) return
    if (!items.value.length) return

    await Promise.all(items.value.map(async (item) => {
      const agreedPrice = await resolvePartyPrice(item.product_id, newCurrency)
      if (agreedPrice !== null) {
        item.unit_price = agreedPrice
        return
      }

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
        // No hay precio para esa currency â†’ precio 0
        item.unit_price = 0
        toast.add({
          title: 'Precio no disponible',
          description: `El producto "${item.product_name}" no tiene precio en ${newCurrency}. Ingresá el precio manualmente.`,
          color: 'warning'
        })
      }
    }))

    // Re-calcular totales con el backend
    fetchPreview()
  }
)

// â”€â”€â”€ Watch initialValues â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
watch(
  () => props.initialValues,
  (val) => {
    if (!val) return

    form.document_type_id = val.document_type_id ?? ''
    form.party_id = val.party_id ?? ''
    form.date = val.date ? new Date(val.date).toISOString().split('T')[0] : today()
    form.descrip = val.descrip ?? ''
    form.ref = val.ref ?? ''
    form.currency_code = val.currency_code ?? 'ARS'
    form.exchange_rate = val.exchange_rate ? Number(val.exchange_rate) : null
    form.rate_type = val.rate_type ?? 'OFFICIAL'
    form.warehouse_id = (val as any).warehouse_id ?? ''
    form.fiscal_jurisdiction_id = (val as any).fiscal_jurisdiction_id ?? ''
    const seqId = (val as any).document_sequence_id
    selectedSequenceId.value = seqId && sequenceOptions.value.some(s => s.value === seqId) ? seqId : ''

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
          warehouse_id: item.warehouse_id ?? null,
          product_name: item.products?.name || item.products?.description || 'Producto',
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.original_unit_price ?? item.unit_price ?? 0),
          discount_percentage: Number(item.discount_percentage ?? 0),
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

// â”€â”€â”€ Auto-select Document Type by Context (categoría) â”€â”€
// ORDER â†’ OV/OC, QUOTE â†’ PRES, REMITO â†’ REM-V/REM-C según dirección del módulo
function getContextDocumentTypeCode(): string | null {
  const direction = moduleCode.value === 'SALES' ? 1 : -1
  if (props.category === 'ORDER') return direction === 1 ? 'OV' : 'OC'
  if (props.category === 'QUOTE') return 'PRES'
  if (props.category === 'REMITO') return direction === 1 ? 'REM-V' : 'REM-C'
  return null
}

// â”€â”€â”€ Auto-select Document Type by VAT Condition â”€â”€â”€â”€â”€â”€â”€
watch(selectedParty, (party) => {
  if (!party || !props.moduleCode) return

  // Comprobantes sin condición IVA (orden, presupuesto, remito): seleccionar por contexto
  const contextCode = getContextDocumentTypeCode()
  if (contextCode) {
    const match = documentsTypes.value.find((d) => d.code?.toUpperCase() === contextCode.toUpperCase())
    if (match) {
      form.document_type_id = match.id
      return
    }
  }

  const vatCondition = party.vat_condition as VatCondition | undefined
  if (!vatCondition) return

  const direction = props.moduleCode === 'SALES' ? 'sale' : 'purchase'

  // Obtener condición del emisor desde el store de companies
  const companiesStore = useCompaniesStore()
  const issuerVat = companiesStore.current?.vat_condition ?? null

  const suggestedCode = getDocumentTypeForVatCondition(vatCondition, direction, issuerVat)

  // Determinar si el comprobante actual es NC/ND (por prop o por tipo ya seleccionado)
  const currentDoc = documentsTypes.value.find(d => d.id === form.document_type_id)
  const noteCategory =
    props.category === 'CREDIT_NOTE' || props.category === 'DEBIT_NOTE'
      ? props.category
      : (currentDoc?.category === 'CREDIT_NOTE' || currentDoc?.category === 'DEBIT_NOTE' ? currentDoc.category : null)

  if (noteCategory) {
    // NC/ND: buscar tipo con misma categoría + letra derivada del tipo de factura sugerido
    const suggestedInvoice = documentsTypes.value.find((d) => {
      if (!d.code) return false
      return d.code.toUpperCase() === suggestedCode.toUpperCase()
    })
    const letter = suggestedInvoice?.letter_type
    if (letter) {
      const noteMatch = documentsTypes.value.find(d =>
        d.category === noteCategory &&
        d.letter_type === letter &&
        d.direction === (props.moduleCode === 'SALES' ? 1 : -1)
      )
      if (noteMatch) {
        form.document_type_id = noteMatch.id
      }
    }
    return
  }

  // Factura: match exacto por código (ej: "FA-A", "FB-A", "FC-A")
  const match = documentsTypes.value.find((d) => {
    if (!d.code) return false
    return d.code.toUpperCase() === suggestedCode.toUpperCase()
  })

  if (match) {
    form.document_type_id = match.id
  }
})

// Recalcular preview cuando cambia el tipo de documento
watch(() => form.document_type_id, (newId) => {
  // Validar compatibilidad emisor â†” comprobante
  const selectedDoc = documentsTypes.value.find((d) => d.id === newId)
  if (selectedDoc) {
    const msg = getValidationMessage(selectedDoc.code, selectedDoc.letter_type)
    documentTypeValidation.value = msg
  } else {
    documentTypeValidation.value = null
  }

  // En alta se propone la primera secuencia. En edición, un documento legado
  // sin secuencia debe conservarse así hasta que el usuario elija una.
  if (!props.initialValues?.id && newId && sequenceOptions.value.length > 0) {
    const currentSeqVal = selectedSequenceId.value
    if (!currentSeqVal || !sequenceOptions.value.some(s => s.value === currentSeqVal)) {
      selectedSequenceId.value = sequenceOptions.value[0]?.value ?? ''
    }
  }

  if (items.value.length > 0) {
    fetchPreview()
  }
})

onMounted(() => {
  partiesStore.fetchAll()
  productsStore.fetchAll()
  documentsTypesStore.fetchAll()
  initCurrencies()
  fetchIssuerCondition()
  documentSequencesService.findAll().then(s => { sequences.value = s })
  depositosStore.fetchAll().then(() => loadStockAvailability())
  fiscalService.getTaxRules('IIBB').then(rows => { iibbPerceptionRules.value = rows })
  fiscalService.getCompanyJurisdictions().then(rows => { companyIibbJurisdictions.value = rows })
})

watch(() => form.fiscal_jurisdiction_id, () => {
  manualIibbAmount.value = null
  manualIibbReason.value = ''
  if (items.value.length) fetchPreview()
})

// Restaurar secuencia cuando sequences se carga (edit mode)
watch(sequences, () => {
  if (props.initialValues?.document_sequence_id && sequenceOptions.value.length > 0) {
    const seqId = (props.initialValues as any).document_sequence_id
    const match = sequenceOptions.value.find(s => s.value === seqId)
    if (match) {
      selectedSequenceId.value = match.value
    }
  }
}, { immediate: true })

// Auto-seleccionar tipo de documento por categoría
watch(
  () => [props.category, documentTypeOptions.value],
  () => {
    if (!props.category || !documentTypeOptions.value.length) return

    // Si la categoría tiene un tipo fijo por contexto (ORDER/QUOTE/REMITO), usarlo
    const contextCode = getContextDocumentTypeCode()
    if (contextCode) {
      const match = documentsTypes.value.find((d) => d.code?.toUpperCase() === contextCode.toUpperCase())
      if (match) {
        form.document_type_id = match.id
        return
      }
    }

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
    tax_id: p.tax_id || 'â€”',
    vat_condition: p.vat_condition || 'â€”',
    email: p.email || 'â€”'
  }
})

async function resolvePartyPrice(productId: string, currencyCode = form.currency_code): Promise<number | null> {
  if (!form.party_id || !productId || !currencyCode) return null

  try {
    const result = await $fetch<{ price: number | null }>('/api/backend/pricing/party-prices/resolve', {
      query: {
        productId,
        partyId: form.party_id,
        currencyCode,
        operationType: props.moduleCode === 'SALES' ? 'SALE' : 'PURCHASE'
      }
    })
    return result.price === null ? null : Number(result.price)
  } catch (error) {
    console.error('No se pudo resolver el precio por parte interesada', error)
    return null
  }
}

watch(
  () => form.party_id,
  async (newParty, oldParty) => {
    partyIibbRegistrations.value = newParty
      ? await fiscalService.getPartyIibbRegistrations(newParty)
      : []
    const currentJurisdictionExists = jurisdictionOptions.value.some(j => j.value === form.fiscal_jurisdiction_id)
    if (!currentJurisdictionExists) {
      form.fiscal_jurisdiction_id = selectableJurisdictionOptions.value.length === 1
        ? selectableJurisdictionOptions.value[0]?.value ?? ''
        : ''
    }
    manualIibbAmount.value = null
    manualIibbReason.value = ''
    if (!newParty || !oldParty || newParty === oldParty || !items.value.length) {
      if (items.value.length) await fetchPreview()
      return
    }

    await Promise.all(items.value.map(async (item) => {
      const price = await resolvePartyPrice(item.product_id)
      if (price !== null) item.unit_price = price
    }))
    await fetchPreview()
  },
  { immediate: true }
)

async function addItem(prod: any) {
  const quantity = 1

  // La currency del documento es la fuente de verdad
  // Buscar precio que coincida con la currency del documento
  const matchingPrice = prod.prices?.find(
    (p: any) => p.code === form.currency_code
  )

  const partyPrice = await resolvePartyPrice(prod.product_id)
  const unitPrice = partyPrice ?? matchingPrice?.amount ?? 0

  // Warning si no hay precio para esa currency
  if (partyPrice === null && !matchingPrice && prod.prices?.length > 0) {
    toast.add({
      title: 'Precio no disponible',
      description: `El producto no tiene precio en ${form.currency_code}. Ingresá el precio manualmente.`,
      color: 'warning'
    })
  }

  items.value.push({
    product_id: prod.product_id,
    warehouse_id: singleWarehouseForProduct(prod.product_id),
    variant_id: prod.variant_id ?? null,
    product_name: prod.product_name,
    quantity,
    unit_price: unitPrice,
    discount_percentage: 0,
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

function updateItemWarehouse(index: number, warehouseId: string | null) {
  const item = items.value[index]
  if (item) item.warehouse_id = warehouseId
}

function submit() {
  if (props.operationalMode && affectsStock.value) {
    const missingWarehouse = items.value.filter(item => !item.warehouse_id && !form.warehouse_id)
    if (missingWarehouse.length > 0) {
      toast.add({
        title: 'Falta seleccionar el depósito',
        description: `Completá el depósito de salida de ${missingWarehouse.length === 1 ? 'este producto' : 'todos los productos'} antes de guardar.`,
        color: 'warning'
      })
      return
    }
  }

  if (manualIibbAmount.value != null && !manualIibbReason.value.trim()) {
    toast.add({
      title: 'Motivo requerido',
      description: 'Indicá por qué modificaste el importe automático de IIBB.',
      color: 'warning'
    })
    return
  }
  // Usar el payload del último preview para enviar al backend
  const previewPayload = lastPreview.value?.document

  const payload = {
    document_type_id: form.document_type_id,
    party_id: form.party_id,
    date: form.date,
    descrip: form.descrip,
    ref: form.ref,
    currency_code: form.currency_code,
    exchange_rate: form.exchange_rate,
    rate_type: form.rate_type,
    parent_document_id: referenceDocumentId.value || props.parentDocumentId || undefined,
    document_sequence_id: selectedSequenceId.value || undefined,
    fiscal_jurisdiction_id: form.fiscal_jurisdiction_id || undefined,
    warehouse_id: affectsStock.value ? (form.warehouse_id || undefined) : undefined,
    taxes: automaticIibbTax.value ? [{
      tax_id: automaticIibbTax.value.tax_id,
      tax_rate: Number(automaticIibbTax.value.rate),
      taxable_base: Number(automaticIibbTax.value.taxableBase),
      tax_amount: manualIibbAmount.value ?? Number(automaticIibbTax.value.amount),
      manual: manualIibbAmount.value != null,
      modification_reason: manualIibbAmount.value != null ? manualIibbReason.value : undefined
    }] : [],
    items: items.value.map((i, idx) => ({
      product_id: i.product_id,
      warehouse_id: props.operationalMode
        ? (i.warehouse_id || form.warehouse_id || undefined)
        : affectsStock.value
          ? (moduleCode === 'SALES' ? (i.warehouse_id || undefined) : (advancedWarehouseAssignment.value ? (i.warehouse_id || undefined) : (form.warehouse_id || undefined)))
          : undefined,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      discount_percentage: Math.min(100, Math.max(0, Number(i.discount_percentage || 0))),
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
  <div class="w-full min-w-0 space-y-5">
    <!-- Header: Party + Document Type + PV + Currency + Date -->
    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold">Datos del comprobante</h2>
          <p class="mt-1 text-sm text-muted">Seleccioná el tercero y los datos que determinan la numeración y el cálculo fiscal.</p>
        </div>
      </template>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <UFormField :label="moduleCode === 'SALES' ? 'Cliente' : 'Proveedor o entidad'" class="min-w-0 md:col-span-2 xl:col-span-3">
          <div class="flex min-w-0 gap-2">
            <USelectMenu
              v-model="selectedCustomer"
              :items="partyOptions"
              :placeholder="moduleCode === 'SALES' ? 'Buscar cliente...' : 'Buscar proveedor, servicio o ente impositivo...'"
              searchable
              size="lg"
              class="min-w-0 flex-1"
            />
            <UButton icon="i-lucide-plus" variant="outline" class="shrink-0" aria-label="Crear cliente o proveedor" @click="showBusinessPartiesModal = true" />
            <UButton
              icon="i-lucide-pencil"
              variant="outline"
              class="shrink-0"
              aria-label="Editar cliente o proveedor"
              :disabled="!selectedCustomer"
              @click="onEditBussinessParty"
            />
          </div>
        </UFormField>

        <UFormField label="Tipo de documento" class="min-w-0 xl:col-span-3">
          <USelectMenu
            v-model="selectedDocumentType"
            :items="documentTypeOptions"
            placeholder="Seleccionar tipo..."
            size="lg"
            class="w-full min-w-0"
          />
        </UFormField>

        <UFormField label="Punto de venta" class="min-w-0 xl:col-span-2">
          <USelectMenu
            v-model="selectedSequenceId"
            :items="sequenceOptions"
            value-key="value"
            placeholder="Seleccionar PV..."
            size="lg"
            class="w-full min-w-0"
          />
        </UFormField>

        <UFormField v-if="!operationalMode" label="Moneda del comprobante" class="min-w-0 xl:col-span-2">
          <USelect
            v-model="form.currency_code"
            :items="currencyOptions"
            placeholder="Moneda"
            size="lg"
            class="w-full min-w-0"
          />
          <p v-if="moduleCode === 'SALES' && items.length > 0 && warehouseOptions.length === 0" class="mt-2 text-sm text-warning">
            Ningún depósito puede cubrir todos los productos. Activá â€œDepósito por productoâ€.
          </p>
        </UFormField>

        <UFormField label="Fecha" class="min-w-0 xl:col-span-2">
          <UInput v-model="form.date" type="date" size="lg" class="w-full min-w-0" />
        </UFormField>
      </div>

      <div v-if="!operationalMode && form.party_id && partyIibbRegistrations.length > 0" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField
          label="Jurisdicción / domicilio de la operación"
          description="Define qué inscripción y alícuota de IIBB se aplican."
        >
          <USelectMenu
            v-model="form.fiscal_jurisdiction_id"
            :items="jurisdictionOptions"
            value-key="value"
            searchable
            placeholder="Seleccionar provincia..."
            size="lg"
            class="w-full"
          />
        </UFormField>
        <UAlert
          v-if="selectableJurisdictionOptions.length === 0"
          color="warning"
          variant="soft"
          title="Percepción de IIBB inactiva"
          description="El tercero tiene inscripción, pero falta habilitar la misma jurisdicción para la empresa o activar su regla de percepción."
        />
      </div>

      <!-- Exchange Rate (solo si moneda extranjera) -->
      <div v-if="!operationalMode && isForeignCurrency" class="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-muted/40 p-4 md:grid-cols-3">
        <UFormField label="Tipo de cambio" class="min-w-0">
          <USelect
            v-model="form.rate_type"
            :items="[
              { label: 'Oficial (AFIP)', value: 'OFFICIAL' },
              { label: 'Blue', value: 'BLUE' },
              { label: 'MEP', value: 'MEP' },
              { label: 'CCL', value: 'CCL' },
            ]"
            placeholder="Tipo"
            class="w-full min-w-0"
          />
        </UFormField>
        <UFormField label="Cotización" class="min-w-0">
          <UInput
            v-model.number="form.exchange_rate"
            type="number"
            step="0.000001"
            min="0"
            placeholder="1.000000"
            class="w-full min-w-0"
            @update:model-value="(val: number) => { if (val) setManualRate(val) }"
          />
        </UFormField>
        <div v-if="form.exchange_rate && total" class="min-w-0">
          <label class="text-sm text-gray-500 mb-1 block">Equivalente ARS</label>
          <div class="h-10 flex items-center text-lg font-semibold text-primary">
            {{ new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(convertAmount(total) ?? 0) }}
          </div>
        </div>
      </div>

      <UFormField label="Referencia" class="mt-4 min-w-0">
        <UInput v-model="form.descrip" placeholder="Referencia u observación breve (opcional)" class="w-full min-w-0" />
      </UFormField>

      <div v-if="affectsStock && moduleCode !== 'SALES'" class="mt-4 rounded-lg border border-default bg-muted/30 p-4 space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-medium">Movimiento de stock</p>
            <p class="text-sm text-muted">Se aplicará recién cuando confirmes el remito.</p>
          </div>
          <USwitch v-model="advancedWarehouseAssignment" label="Depósito por producto" />
        </div>
        <UFormField v-if="moduleCode !== 'SALES'" :label="moduleCode === 'SALES' ? 'Depósito de salida' : 'Depósito receptor'" required>
          <USelect
            v-model="form.warehouse_id"
            :items="warehouseOptions"
            placeholder="Seleccionar depósito"
            class="w-full md:max-w-md"
          />
        </UFormField>
      </div>

      <!-- Validación de comprobante -->
      <div v-if="documentTypeValidation" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
        {{ documentTypeValidation }}
      </div>

      <!-- Party info card -->
      <div v-if="partyInfo" class="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <div>
          <span class="text-gray-500">CUIT: </span>
          <span class="font-mono">{{ partyInfo.tax_id }}</span>
        </div>
        <div>
          <span class="text-gray-500">IVA: </span>
          <span>{{ partyInfo.vat_condition }}</span>
        </div>
        <div v-if="partyInfo.email !== 'â€”'">
          <span class="text-gray-500">Email: </span>
          <span>{{ partyInfo.email }}</span>
        </div>
      </div>

      <!-- Reference Document Picker (NC/ND) -->
      <div v-if="showReferencePicker" class="mt-4">
        <ReferenceDocumentPicker
          :module-code="moduleCode"
          :selected-invoice="referenceDocumentId ? { id: referenceDocumentId } : null"
          @select="handleReferenceSelect"
          @clear="handleReferenceClear"
        />
      </div>
    </UCard>

    <!-- Items Table -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold">Detalle de productos</h2>
            <p class="mt-1 text-sm text-muted">{{ operationalMode ? 'Indicá las cantidades y el depósito desde el que sale cada producto.' : 'La bonificación se aplica sobre cada artículo antes de calcular IVA e IIBB.' }}</p>
          </div>
          <UBadge color="neutral" variant="soft">
            {{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}
          </UBadge>
        </div>
      </template>
      <FacturaItemsTable
        :items="items"
        :product-options="productOptions"
        :currency-code="form.currency_code"
        :warehouses="warehouseOptions"
        :warehouse-options-for-item="warehouseOptionsForItem"
        :show-warehouse-column="moduleCode === 'SALES' ? affectsStock : affectsStock && advancedWarehouseAssignment"
        :default-warehouse-id="form.warehouse_id"
        :show-amounts="!operationalMode"
        @remove="removeItem"
        @add="addItem"
        @update:warehouse="updateItemWarehouse"
      />
    </UCard>

    <!-- Totals -->
    <div v-if="!operationalMode" class="flex min-w-0 justify-end">
      <UCard class="w-full border-t-2 border-primary lg:max-w-xl">
        <details v-if="automaticIibbTax" class="group mb-4 rounded-lg border border-default bg-muted/20 p-3">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium">{{ automaticIibbTax.name }}</p>
              <p class="text-xs text-muted">
                {{ Number(manualIibbAmount ?? automaticIibbTax.amount).toLocaleString('es-AR', { style: 'currency', currency: form.currency_code }) }}
                · {{ automaticIibbTax.rate }}%
              </p>
            </div>
            <span class="flex items-center gap-1 text-xs font-medium text-primary">
              Ajustar
              <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div class="mt-3 grid grid-cols-1 gap-3 border-t border-default pt-3 md:grid-cols-2">
              <UFormField label="Importe IIBB" description="Podés corregir el cálculo automático.">
                <UInput
                  :model-value="manualIibbAmount ?? automaticIibbTax.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full"
                  @update:model-value="manualIibbAmount = Number($event)"
                />
              </UFormField>
              <UFormField v-if="manualIibbAmount != null" label="Motivo del ajuste">
                <UInput v-model="manualIibbReason" placeholder="Ej.: alícuota informada por padrón" class="w-full" />
              </UFormField>
              <div v-if="manualIibbAmount != null" class="md:col-span-2">
                <UButton
                  label="Restaurar cálculo automático"
                  size="xs"
                  variant="ghost"
                  @click="manualIibbAmount = null; manualIibbReason = ''"
                />
              </div>
          </div>
        </details>

        <FacturaTotals
          :subtotal="subtotal"
          :taxes="taxesSummary"
          :total="total"
          :show-breakdown="showTaxBreakdown"
          :currency-code="form.currency_code"
          :exchange-rate="form.exchange_rate"
          :converted-total="form.exchange_rate ? convertAmount(total) : null"
        />
      </UCard>
    </div>
  </div>

  <BusinessPartyModal v-model:open="showBusinessPartiesModal" v-model:business-party="selectedBusinessParty" />
</template>
