<script setup lang="ts">
import { reactive, ref, computed, defineAsyncComponent, onMounted, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'

// Auth
import { useAuthStore } from '~/modulos/auth/auth.store'

// Companies
import { useCompaniesStore } from '~/modulos/companies/store/company.store'

// BusinessParties
import type { BusinessParty } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useBusinessPartiesStore } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.store'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'

// Products
import { useProductsStore } from '~/modulos/logistica/master-data/product/store/products.store'
import { useProducts } from '~/modulos/logistica/master-data/product/composable/useProducts'
import { useDepositosStore } from '~/modulos/logistica/warehouses/warehouse/depositos.store'
import { useStockService } from '~/modulos/logistica/warehouses/stock/stock.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'

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
import { useCommercialAdjustmentConceptsService } from '~/modulos/erp/commercial-adjustment-concepts/commercial-adjustment-concepts.service'
import type { CommercialAdjustmentConcept } from '~/modulos/erp/commercial-adjustment-concepts/commercial-adjustment-concepts.types'
import { getDocumentLineAmounts, hasLegacyGrossLinePrices } from '~/modulos/erp/documents/shared/document-line-values'

// Invoice
import { getDocumentTypeForVatCondition, type VatCondition } from '~/modulos/erp/invoices/utils/vatConditionMap'

import type { CommercialAdjustment, Document, FacturaFormValues, FacturaItem } from '../types/factura.types'

const BusinessPartyModal = defineAsyncComponent(() => import('~/modulos/logistica/master-data/bussiness-parties/components/BusinnesPartyModal.vue'))
const ReferenceDocumentPicker = defineAsyncComponent(() => import('./ReferenceDocumentPicker.vue'))
const FacturaItemsTable = defineAsyncComponent(() => import('./FacturaItemsTable.vue'))
const FacturaTotals = defineAsyncComponent(() => import('./FacturaTotals.vue'))

interface Props {
  loading?: boolean
  initialValues?: Partial<Document> | Partial<FacturaFormValues>
  moduleCode?: string
  category?: string
  parentDocumentId?: string
  operationalMode?: boolean
  draftExtension?: Record<string, any>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [payload: any]
  restoreExtension: [payload: Record<string, any>]
}>()

const toast = useToast()

// ─── Stores ──────────────────────────────────────────
const authStore = useAuthStore()
const selectedBusinessParty = ref<BusinessParty | undefined>(undefined)
const showBusinessPartiesModal = ref(false)
const partiesStore = useBusinessPartiesStore()
const productsStore = useProductsStore()
const documentsTypesStore = useDocumentsTypesStore()
const depositosStore = useDepositosStore()
const stockService = useStockService()
const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canRegularizeStock = computed(() => isOwnerOrAdmin.value || hasPermission('stock.create'))
const canManageCommercialAdjustmentConcepts = computed(() => isOwnerOrAdmin.value
  || hasPermission('commercial_adjustment_concepts.create')
  || hasPermission('commercial_adjustment_concepts.update'))
const fiscalService = useFiscalService()
const {
  items: parties
} = storeToRefs(partiesStore)
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
const partySearch = ref('')
const partySearching = ref(false)
const remoteParties = ref<BusinessParty[]>([])
const selectedPartyFallback = ref<BusinessParty | null>(null)
const partiesService = useBusinessPartiesService()
let partySearchTimer: ReturnType<typeof setTimeout> | undefined
let partySearchController: AbortController | undefined
let partySearchRequestId = 0
let selectedPartyLoadId = 0
const partyEditLoading = ref(false)
const partyOptionLabel = (party: BusinessParty) => props.moduleCode === 'SALES'
  ? `${party.name}${party.type === 'EMPLOYEE' ? ' · Empleado · Cliente interno' : ''}`
  : `${party.name} · ${partyTypeLabels[party.type] ?? party.type}${party.tax_id ? ` · ${party.tax_id}` : ''}`

const partyOptions = computed(() => {
  const query = partySearch.value.trim().toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const source = [
    ...remoteParties.value,
    ...parties.value,
    ...(selectedPartyFallback.value ? [selectedPartyFallback.value] : []),
  ]
  const seen = new Set<string>()
  const uniqueParties = source.filter((party) => {
    if (seen.has(party.id)) return false
    seen.add(party.id)
    return true
  })
  const eligibleParties = uniqueParties.filter(party => props.moduleCode === 'SALES'
    ? party.type === 'CUSTOMER' || party.roles?.some(role => role.role === 'CUSTOMER' && role.active)
    : payablePartyTypes.has(party.type))
  const matchingParties = query
    ? eligibleParties.filter(party => [party.name, party.business_names, party.tax_id, party.email]
      .some(value => String(value ?? '').toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query)))
    : eligibleParties
  const selectedParty = uniqueParties.find(party => party.id === form.party_id)
  const visibleParties = matchingParties.slice(0, query ? 30 : 100)
  // Keep the current value in the menu even when it falls outside the result
  // limit or its role changed after the document was created.
  if (selectedParty && !visibleParties.some(party => party.id === selectedParty.id)) {
    visibleParties.unshift(selectedParty)
  }
  return visibleParties.map(party => ({
    label: partyOptionLabel(party),
    value: party.id
  }))
})

watch(partySearch, (value) => {
  const requestId = ++partySearchRequestId
  if (partySearchTimer) clearTimeout(partySearchTimer)
  partySearchController?.abort()
  const query = value.trim()
  if (query.length < 2) {
    remoteParties.value = []
    partySearching.value = false
    return
  }
  partySearching.value = true
  partySearchTimer = setTimeout(async () => {
    const controller = new AbortController()
    partySearchController = controller
    try {
      const results = await partiesService.search(
        query,
        props.moduleCode === 'SALES' ? ['CUSTOMER'] : [...payablePartyTypes],
        controller.signal
      )
      if (requestId === partySearchRequestId) remoteParties.value = results
    } catch (error: any) {
      if (requestId === partySearchRequestId && error?.name !== 'AbortError') remoteParties.value = []
    } finally {
      if (requestId === partySearchRequestId) partySearching.value = false
    }
  }, 180)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSaveShortcut, true)
  if (partySearchTimer) clearTimeout(partySearchTimer)
  partySearchController?.abort()
  if (productSearchTimer) clearTimeout(productSearchTimer)
  productSearchController?.abort()
})

function handleSaveShortcut(event: KeyboardEvent) {
  const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
  if (!isSaveShortcut || event.altKey || event.defaultPrevented || event.isComposing) return
  event.preventDefault()
  event.stopPropagation()
  submit()
}

// Filtrar productos según módulo (venta/compra)
const usageFilter = computed(() => {
  if (props.moduleCode === 'SALES') return 'sale' as const
  if (props.moduleCode === 'PURCHASES') return 'purchase' as const
  return null
})
const { items: productOptions } = useProducts(usageFilter.value)
let productSearchTimer: ReturnType<typeof setTimeout> | undefined
let productSearchController: AbortController | undefined

function searchProducts(query: string) {
  if (productSearchTimer) clearTimeout(productSearchTimer)
  productSearchController?.abort()
  if (query.trim().length < 2) return

  productSearchTimer = setTimeout(() => {
    productSearchController = new AbortController()
    void productsStore.search(query.trim(), usageFilter.value, productSearchController.signal)
      .catch((error: any) => {
        if (error?.name !== 'AbortError') {
          toast.add({
            title: 'No se pudo buscar productos',
            description: 'Reintentá cuando mejore la conexión.',
            color: 'warning'
          })
        }
      })
  }, 300)
}
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
const dateFieldLabel = computed(() => {
  if (props.category === 'REMITO') return 'Fecha de entrega / movimiento'
  if (props.category === 'QUOTE') return 'Fecha de emisión'
  return 'Fecha'
})

// ─── Form State ──────────────────────────────────────
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

watch(() => form.party_id, async (partyId) => {
  const requestId = ++selectedPartyLoadId
  selectedPartyFallback.value = null
  if (!partyId || [...remoteParties.value, ...parties.value].some(party => party.id === partyId)) return

  try {
    const party = await partiesService.findOne(partyId)
    if (requestId === selectedPartyLoadId && form.party_id === partyId) {
      selectedPartyFallback.value = party
    }
  } catch {
    // Keep the document's stored party_id; other form fields remain usable if
    // the party cannot be fetched (for example, an inactive historical record).
  }
})

const advancedWarehouseAssignment = ref(false)
const allWarehouseOptions = computed(() => warehouses.value
  .filter(warehouse => warehouse.active && !warehouse.is_virtual)
  .map(warehouse => ({ label: warehouse.name, value: warehouse.id })))
const stockByWarehouse = ref<Record<string, Record<string, number>>>({})
const regularizationOpen = ref(false)
const regularizationSaving = ref(false)
const regularizationItemIndex = ref<number | null>(null)
const regularizationItem = ref<FacturaItem | null>(null)
const regularizationForm = reactive({ warehouse_id: '', quantity: 0, notes: '' })

function openStockRegularization(index: number, item: FacturaItem) {
  regularizationItemIndex.value = index
  regularizationItem.value = item
  const required = Number(item.quantity || 0)
  Object.assign(regularizationForm, {
    warehouse_id: '',
    quantity: required,
    notes: ''
  })
  regularizationOpen.value = true
}

watch(() => regularizationForm.warehouse_id, (warehouseId) => {
  const item = regularizationItem.value
  if (!warehouseId || !item?.product_id) return
  const available = stockByWarehouse.value[warehouseId]?.[item.product_id] ?? 0
  regularizationForm.quantity = Math.max(Number(item.quantity || 0) - available, 0)
})

async function saveStockRegularization() {
  if (regularizationSaving.value) return
  const item = regularizationItem.value
  if (!item?.product_id || !regularizationForm.warehouse_id || regularizationForm.quantity <= 0 || !regularizationForm.notes.trim()) return
  regularizationSaving.value = true
  try {
    await stockService.createMovement({
      warehouse_id: regularizationForm.warehouse_id,
      product_id: item.product_id,
      movement_type: 'ADJUSTMENT',
      direction: 'IN',
      quantity: String(regularizationForm.quantity),
      reference_type: 'remito_regularization',
      notes: regularizationForm.notes.trim()
    })
    await loadStockAvailability()
    const available = stockByWarehouse.value[regularizationForm.warehouse_id]?.[item.product_id] ?? 0
    if (available >= Number(item.quantity || 0) && regularizationItemIndex.value !== null) {
      item.warehouse_id = regularizationForm.warehouse_id
      updateItemWarehouse(regularizationItemIndex.value, regularizationForm.warehouse_id)
    }
    regularizationOpen.value = false
    toast.add({ title: 'Stock regularizado', description: 'El depósito ya está disponible para seleccionarlo en el remito.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo regularizar el stock', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    regularizationSaving.value = false
  }
}

async function loadStockAvailability() {
  if (props.moduleCode !== 'SALES' || !affectsStock.value || !items.value.some(item => item.product_id)) return
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

const itemsWithoutWarehouseStock = computed(() => {
  if (props.moduleCode !== 'SALES' || !props.operationalMode || !affectsStock.value) return []
  return items.value.filter(item => item.product_id && warehouseOptionsForItem(item).length === 0)
})

const itemsWithoutSelectedWarehouse = computed(() => {
  if (props.moduleCode !== 'SALES' || !props.operationalMode || !affectsStock.value) return []
  return items.value.filter(item => item.product_id && !item.warehouse_id && !form.warehouse_id)
})

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

// ─── Reference Document (NC/ND → Factura) ────────────
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
      variant_id: item.variant_id ?? null,
      variant_name: item.product_variants?.name ?? null,
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

// ─── Exchange Rate: auto-resolve on currency change ─────────
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

const selectedParty = computed(() => selectedPartyFallback.value?.id === form.party_id
  ? selectedPartyFallback.value
  : [...remoteParties.value, ...parties.value].find((p) => p.id === form.party_id))
const partnerCondition = computed(() => (selectedParty.value?.vat_condition as string) ?? null)

const {
  filteredDocumentTypes: documentTypeOptions,
  isDocumentTypeValid,
  getValidationMessage,
  fetchIssuerCondition
} = useDocumentTypesForModule(moduleCode.value, partnerCondition)

const items = ref<FacturaItem[]>([])
const validationErrors = ref<Record<string, string>>({})
const validationErrorSummary = computed(() => Object.values(validationErrors.value))
watch(() => form.document_type_id, () => { delete validationErrors.value.document_type_id })
watch(() => form.party_id, () => { delete validationErrors.value.party_id })
watch(() => form.date, () => { delete validationErrors.value.date })
watch(() => form.descrip, () => { delete validationErrors.value.descrip })
watch(items, () => { delete validationErrors.value.items }, { deep: true })
const commercialAdjustments = ref<CommercialAdjustment[]>([])
const commercialAdjustmentConcepts = ref<CommercialAdjustmentConcept[]>([])
const commercialAdjustmentConceptsLoading = ref(false)
const commercialAdjustmentConceptsError = ref(false)
const selectedCommercialAdjustmentConceptId = ref<any>('')
const commercialAdjustmentConceptsService = useCommercialAdjustmentConceptsService()
const adjustmentTypeOptions = [
  { label: 'Porcentaje', value: 'PERCENTAGE' },
  { label: 'Importe fijo', value: 'AMOUNT' }
]
const adjustmentBasisOptions = [
  { label: 'Neto antes de impuestos', value: 'NET' },
  { label: 'Total con impuestos', value: 'GROSS' }
]
const selectedDocumentCategory = computed(() =>
  documentsTypes.value.find((documentType) => documentType.id === form.document_type_id)?.category ?? props.category
)
const canAddCommercialAdjustments = computed(() => {
  const documentTypeAccepts = documentsTypes.value
    .find((documentType) => documentType.id === form.document_type_id)?.accepts_commercial_adjustments === true
  const isExistingDocumentWithAdjustments = Boolean((props.initialValues as any)?.id && commercialAdjustments.value.length)
  return documentTypeAccepts || isExistingDocumentWithAdjustments
})
const commercialAdjustmentTransferBlocked = computed(() => Boolean(
  props.parentDocumentId
  && !(props.initialValues as any)?.id
  && commercialAdjustments.value.length
  && documentsTypes.value.find((documentType) => documentType.id === form.document_type_id)?.accepts_commercial_adjustments !== true
))
const commercialAdjustmentConceptOptions = computed(() => commercialAdjustmentConcepts.value.map((concept) => {
  const defaultValue = concept.default_value == null
    ? 'valor a definir'
    : concept.value_type === 'PERCENTAGE'
      ? `${Number(concept.default_value).toLocaleString('es-AR')}%`
      : `${new Intl.NumberFormat('es-AR').format(Number(concept.default_value))} (moneda del comprobante)`
  return { label: `${concept.name} · ${defaultValue}`, value: concept.id }
}))
const selectedCommercialAdjustmentConcept = computed(() => {
  const selectedId = typeof selectedCommercialAdjustmentConceptId.value === 'string'
    ? selectedCommercialAdjustmentConceptId.value
    : selectedCommercialAdjustmentConceptId.value?.value ?? selectedCommercialAdjustmentConceptId.value?.id
  return commercialAdjustmentConcepts.value.find((concept) => concept.id === selectedId)
})

watch(selectedCommercialAdjustmentConceptId, (selected) => {
  if (typeof selected !== 'string') {
    selectedCommercialAdjustmentConceptId.value = selected?.value ?? selected?.id ?? ''
  }
})

async function loadCommercialAdjustmentConcepts(moduleCode = props.moduleCode) {
  const module = moduleCode === 'PURCHASES' ? 'PURCHASES' : 'SALES'
  commercialAdjustmentConceptsLoading.value = true
  commercialAdjustmentConceptsError.value = false
  try {
    commercialAdjustmentConcepts.value = await commercialAdjustmentConceptsService.findAll({ module })
  } catch {
    commercialAdjustmentConcepts.value = []
    commercialAdjustmentConceptsError.value = true
  } finally {
    commercialAdjustmentConceptsLoading.value = false
  }
}

watch(
  () => [canAddCommercialAdjustments.value, moduleCode.value] as const,
  ([enabled, moduleCode]) => {
    if (enabled) void loadCommercialAdjustmentConcepts(moduleCode)
  },
  { immediate: true }
)

function addCommercialAdjustment() {
  commercialAdjustments.value.push({ concept: '', value_type: 'PERCENTAGE', basis: 'NET', value: 0 })
}

function addSelectedCommercialAdjustment() {
  const concept = selectedCommercialAdjustmentConcept.value
  if (!concept) return
  commercialAdjustments.value.push({
    concept: concept.name,
    value_type: concept.value_type,
    basis: concept.basis,
    value: Number(concept.default_value ?? 0)
  })
  selectedCommercialAdjustmentConceptId.value = ''
}

function removeCommercialAdjustment(index: number) {
  commercialAdjustments.value.splice(index, 1)
}

function validCommercialAdjustments() {
  return commercialAdjustments.value.filter((adjustment) =>
    adjustment.concept.trim() && Number(adjustment.value) > 0
  )
}

// ─── Punto de Venta (Secuencias) ─────────────────────────
const documentSequencesService = useDocumentSequencesService()
const sequences = ref<DocumentSequence[]>([])
const sequencesUsingCache = ref(false)
const sequencesRefreshFailed = ref(false)
// Keep only the UUID in the form state. USelectMenu can otherwise return either
// the whole option or its value depending on its configuration/version.
const selectedSequenceId = ref<string>('')
watch(selectedSequenceId, () => {
  delete validationErrors.value.document_sequence_id
  if (items.value.length && form.document_type_id) debouncedFetchPreview()
})
const sequencePreview = ref<{ formatted: string, source: 'SEQUENCE' | 'DOCUMENT_TYPE' } | null>(null)
const sequencePreviewLoading = ref(false)
const sequencePreviewError = ref<string | null>(null)
let sequencePreviewRequest = 0
const sequencePreviewCache = new Map<string, { formatted: string, source: 'SEQUENCE' | 'DOCUMENT_TYPE' }>()

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
      point_of_sale: s.point_of_sale,
      sales_order_tax_mode: s.sales_order_tax_mode ?? 'STANDARD'
    }))
})

const selectedDocumentSequence = computed(() =>
  sequences.value.find(sequence => sequence.id === selectedSequenceId.value)
)
const isNetSalesOrderSequence = computed(() =>
  moduleCode.value === 'SALES'
  && selectedDocumentCategory.value === 'ORDER'
  && selectedDocumentSequence.value?.sales_order_tax_mode === 'NET_ONLY'
)

async function loadDocumentSequences() {
  const companyId = authStore.selectedCompany?.id ?? 'unknown'
  const cacheKey = `document-sequences:${companyId}`
  if (import.meta.client) {
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        sequences.value = JSON.parse(cached)
        sequencesUsingCache.value = true
      }
    } catch { /* ignorar caché inválida */ }
  }
  try {
    const fresh = await documentSequencesService.findAll()
    sequences.value = fresh
    sequencesUsingCache.value = false
    sequencesRefreshFailed.value = false
    if (import.meta.client) sessionStorage.setItem(cacheKey, JSON.stringify(fresh))
  } catch {
    sequencesRefreshFailed.value = true
  }
}

async function loadSequencePreview() {
  const requestId = ++sequencePreviewRequest
  sequencePreview.value = null
  sequencePreviewError.value = null
  if (props.initialValues?.id || !form.document_type_id) return
  if (sequenceOptions.value.length > 1 && !selectedSequenceId.value) {
    sequencePreviewError.value = 'Elegí un punto de venta para conocer el próximo número.'
    return
  }

  // Las series ya vienen en la carga inicial. Calcular localmente evita una
  // petición adicional cada vez que el usuario cambia de punto de venta.
  if (selectedSequenceId.value) {
    const selected = sequences.value.find(item => item.id === selectedSequenceId.value)
    if (selected) {
      const nextNumber = Number(selected.current_number ?? 0) + 1
      if (selected.range_end != null && nextNumber > Number(selected.range_end)) {
        sequencePreviewError.value = 'La secuencia seleccionada está agotada.'
        return
      }
      const pointOfSale = String(selected.point_of_sale || '').padStart(4, '0')
      sequencePreview.value = {
        formatted: `${selected.prefix ? `${selected.prefix} ` : ''}${pointOfSale}-${String(nextNumber).padStart(8, '0')}`,
        source: 'SEQUENCE'
      }
      return
    }
  }

  const cacheKey = `${form.document_type_id}:${selectedSequenceId.value || 'none'}`
  const cached = sequencePreviewCache.get(cacheKey)
  if (cached) {
    sequencePreview.value = cached
    return
  }

  sequencePreviewLoading.value = true
  try {
    const result = await documentSequencesService.previewNextNumber(
      form.document_type_id,
      selectedSequenceId.value || undefined
    )
    if (requestId === sequencePreviewRequest) {
      sequencePreview.value = result
      sequencePreviewCache.set(cacheKey, result)
    }
  } catch (error: any) {
    if (requestId === sequencePreviewRequest) {
      sequencePreviewError.value = error?.data?.message || 'Sin conexión para anticipar el número. Se asignará correctamente al guardar.'
    }
  } finally {
    if (requestId === sequencePreviewRequest) sequencePreviewLoading.value = false
  }
}

// ─── Validación de comprobante ─────────────────────────
const documentTypeValidation = ref<string | null>(null)

// ─── Tax Engine Preview ───────────────────────────────
const lastPreview = ref<any>(null)
const partyIibbRegistrations = ref<BusinessPartyIibbRegistration[]>([])
const iibbPerceptionRules = ref<TaxRule[]>([])
const companyIibbJurisdictions = ref<CompanyTaxJurisdiction[]>([])
const manualIibbAmount = ref<number | null>(null)
const manualIibbReason = ref('')
const previewLoading = ref(false)
let isRecalculating = false
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null

type DocumentDraft = {
  baseUpdatedAt?: string
  form: typeof form
  items: FacturaItem[]
  commercialAdjustments: CommercialAdjustment[]
  selectedSequenceId: string
  referenceDocumentId?: string
  advancedWarehouseAssignment: boolean
  manualIibbAmount: number | null
  manualIibbReason: string
  extension?: Record<string, any>
}

const draftEnabled = computed(() => true)
const draftKey = computed(() => {
  const companyId = authStore.selectedCompany?.id || 'company'
  const userId = authStore.user?.id || 'user'
  const context = [
    props.moduleCode || 'DOCUMENT',
    props.category || 'INVOICE',
    props.initialValues?.id || props.parentDocumentId || 'NEW'
  ].join(':')
  return `asterisk:document-draft:${companyId}:${userId}:${context}`
})

const {
  availableDraft,
  status: draftStatus,
  lastSavedAt: draftSavedAt,
  restoreDraft: restoreLocalDraft,
  discardDraft,
  completeDraft
} = useLocalFormDraft<DocumentDraft>({
  key: draftKey,
  enabled: draftEnabled,
  source: () => ({
    baseUpdatedAt: props.initialValues?.updated_at,
    form: { ...form },
    items: items.value,
    commercialAdjustments: commercialAdjustments.value,
    selectedSequenceId: selectedSequenceId.value,
    referenceDocumentId: referenceDocumentId.value,
    advancedWarehouseAssignment: advancedWarehouseAssignment.value,
    manualIibbAmount: manualIibbAmount.value,
    manualIibbReason: manualIibbReason.value,
    extension: props.draftExtension ? { ...props.draftExtension } : undefined
  }),
  restore: (draft) => {
    Object.assign(form, draft.form)
    items.value = draft.items.map(item => ({ ...item }))
    commercialAdjustments.value = (draft.commercialAdjustments ?? []).map(adjustment => ({ ...adjustment }))
    selectedSequenceId.value = draft.selectedSequenceId || ''
    referenceDocumentId.value = draft.referenceDocumentId
    advancedWarehouseAssignment.value = draft.advancedWarehouseAssignment
    manualIibbAmount.value = draft.manualIibbAmount
    manualIibbReason.value = draft.manualIibbReason || ''
    if (draft.extension) emit('restoreExtension', draft.extension)
    toast.add({ title: 'Borrador recuperado', description: 'Podés continuar la carga donde la dejaste.', color: 'success' })
  },
  isMeaningful: draft => Boolean(
    draft.form.party_id
    || draft.form.descrip
    || draft.form.ref
    || draft.items.length
    || (draft.commercialAdjustments?.length ?? 0) > 0
    || Object.entries(draft.extension ?? {}).some(([key, value]) =>
      value !== '' && value !== null && value !== undefined && key !== 'priority' && key !== 'commission_base'
    )
  )
})

function restoreDocumentDraft() {
  const draftVersion = availableDraft.value?.data.baseUpdatedAt
  const currentVersion = props.initialValues?.updated_at
  if (draftVersion && currentVersion && draftVersion !== currentVersion) {
    toast.add({
      title: 'El documento cambió desde este borrador',
      description: 'Para evitar sobrescribir información más nueva, descartá este borrador y revisá la versión actual.',
      color: 'warning'
    })
    return
  }
  restoreLocalDraft()
}

const draftSavedLabel = computed(() => draftSavedAt.value
  ? new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(draftSavedAt.value)
  : '')

async function fetchPreview() {
  if (!items.value.length || !form.document_type_id) {
    lastPreview.value = null
    return
  }

  previewLoading.value = true
  isRecalculating = true
  try {
    const currentDocType = documentsTypes.value.find((d) => d.id === form.document_type_id)
    const result = await $fetch('/api/backend/tax-engine/calculate-preview', {
      method: 'POST',
      body: {
        issuerCompanyId: authStore.selectedCompany?.id ?? '',
        partnerId: form.party_id || undefined,
        partnerVatCondition: selectedParty.value?.vat_condition,
        documentTypeId: form.document_type_id,
        documentSequenceId: selectedSequenceId.value || undefined,
        documentLetterType: currentDocType?.letter_type,
        currency: form.currency_code,
        date: form.date,
        jurisdictionId: form.fiscal_jurisdiction_id || undefined,
        operationType: props.moduleCode === 'SALES' ? 'SALE' : 'PURCHASE',
        commercial_adjustments: validCommercialAdjustments().map((adjustment) => ({
          concept: adjustment.concept.trim(),
          value_type: adjustment.value_type,
          basis: adjustment.basis,
          value: Number(adjustment.value)
        })),
        items: items.value.map((i) => ({
          productId: i.product_id || undefined,
          quantity: Number(i.quantity),
          unitPrice: moduleCode.value === 'PURCHASES' && i.net_subtotal_override != null && Number(i.quantity) > 0
            ? Number(i.net_subtotal_override) / Number(i.quantity)
            : Number(i.unit_price) * (1 - Math.min(100, Math.max(0, Number(i.discount_percentage || 0))) / 100)
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
const originalSubtotal = computed(() => lastPreview.value?.document?.originalSubtotal ?? subtotal.value)
const appliedCommercialAdjustments = computed(() => lastPreview.value?.document?.commercial_adjustments ?? [])
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
const supplierTotalOverride = ref<number | null>(null)
const canOverrideSupplierTotal = computed(() => moduleCode.value === 'PURCHASES'
  && selectedDocumentCategory.value === 'INVOICE'
  && !props.operationalMode)
const displayedTotal = computed(() => canOverrideSupplierTotal.value && supplierTotalOverride.value != null
  ? Number(supplierTotalOverride.value.toFixed(2))
  : Number(total.value.toFixed(2)))
const supplierTotalDifference = computed(() => supplierTotalOverride.value == null
  ? 0
  : Number((supplierTotalOverride.value - total.value).toFixed(2)))

function updateSupplierTotal(value: unknown) {
  if (value == null || value === '') {
    supplierTotalOverride.value = null
    return
  }
  const amount = Number(value)
  if (Number.isFinite(amount) && amount >= 0) {
    supplierTotalOverride.value = Math.round((amount + Number.EPSILON) * 100) / 100
  }
}
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

watch(
  commercialAdjustments,
  () => {
    if (isRecalculating) return
    if (items.value.length > 0 && form.document_type_id) debouncedFetchPreview()
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
        item.net_subtotal_override = null
        item.subtotal_override = null
        item.discount_amount_override = null
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
        item.net_subtotal_override = null
        item.subtotal_override = null
        item.discount_amount_override = null
      } else {
        // No hay precio para esa currency → precio 0
        item.unit_price = 0
        item.net_subtotal_override = null
        item.subtotal_override = null
        item.discount_amount_override = null
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

// ─── Watch initialValues ──────────────────────────────────
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
    const existingTotalDifference = Number(val.total ?? 0)
      - Number(val.subtotal ?? 0)
      - Number(val.total_taxes ?? 0)
    supplierTotalOverride.value = moduleCode.value === 'PURCHASES'
      && val.id != null
      && val.total != null
      && Math.abs(existingTotalDifference) >= 0.005
      ? Number(val.total)
      : null
    form.warehouse_id = (val as any).warehouse_id ?? ''
    form.fiscal_jurisdiction_id = (val as any).fiscal_jurisdiction_id ?? ''
    commercialAdjustments.value = (val.commercial_adjustments ?? []).map((adjustment) => ({ ...adjustment }))
    const seqId = (val as any).document_sequence_id
    selectedSequenceId.value = seqId && sequenceOptions.value.some(s => s.value === seqId) ? seqId : ''

    // Mapear items del documento
    // Si vienen del mapper (items), usarlos directamente
    // Si vienen raw del backend (document_items), mapearlos
    const sourceItems = val.items?.length ? val.items : (val.document_items ?? [])
    const legacyGrossPrices = hasLegacyGrossLinePrices(val.subtotal, sourceItems)
    const savedCommercialAdjustments = Array.isArray(val.commercial_adjustments) ? val.commercial_adjustments : []
    const savedNetDiscounts = savedCommercialAdjustments.reduce(
      (sum: number, adjustment: any) => sum + Number(adjustment.net_discount ?? 0),
      0,
    )
    const subtotalAfterCommercialAdjustments = Number(val.subtotal ?? 0)
    const subtotalBeforeCommercialAdjustments = subtotalAfterCommercialAdjustments + savedNetDiscounts
    const commercialAdjustmentFactor = subtotalBeforeCommercialAdjustments > 0
      ? subtotalAfterCommercialAdjustments / subtotalBeforeCommercialAdjustments
      : 1
    const mapNetSubtotalOverride = (item: any) => {
      if (moduleCode.value !== 'PURCHASES') return item
      const originalUnitPrice = Number(item.original_unit_price ?? item.unit_price ?? 0)
      const quantity = Number(item.quantity ?? 0)
      const discountPercentage = Number(item.discount_percentage ?? 0)
      const calculatedSubtotal = quantity * originalUnitPrice * (1 - discountPercentage / 100)
      const netLineSubtotal = getDocumentLineAmounts(item, legacyGrossPrices).subtotal
        / Math.max(0.000001, commercialAdjustmentFactor)
      const itemTaxes = item.document_item_taxes ?? item.taxes ?? []
      const includedTaxFactor = Math.max(0.000001, 1 - itemTaxes
        .filter((tax: any) => tax.is_included_in_price)
        .reduce((sum: number, tax: any) => {
          const rate = Number(tax.tax_rate ?? tax.rate ?? 0)
          return sum + rate / (100 + rate)
        }, 0))
      const rawLineAmount = netLineSubtotal / includedTaxFactor
      const shouldOverride = Math.abs(rawLineAmount - calculatedSubtotal) > 0.02
      const netSubtotalOverride = shouldOverride ? rawLineAmount : null
      const subtotalOverride = shouldOverride ? netLineSubtotal : null
      const discountAmountOverride = shouldOverride
        ? Math.max(0, originalUnitPrice * quantity - rawLineAmount)
        : null
      const lineTaxes = Number(item.total_taxes ?? (item.taxes ?? []).reduce(
        (sum: number, tax: any) => sum + Number(tax.tax_amount ?? 0),
        0,
      ))
      return {
        ...item,
        unit_price: originalUnitPrice,
        net_subtotal_override: netSubtotalOverride,
        subtotal_override: subtotalOverride,
        discount_amount_override: discountAmountOverride,
        price: netLineSubtotal,
        subtotal: subtotalOverride ?? calculatedSubtotal,
        total: (subtotalOverride ?? calculatedSubtotal) + lineTaxes
      }
    }

    if (val.items?.length) {
      items.value = val.items.map(mapNetSubtotalOverride)
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

      items.value = sourceItems.map((item: any) => {
        const originalUnitPrice = Number(item.original_unit_price ?? item.unit_price ?? 0)
        const discountPercentage = Number(item.discount_percentage ?? 0)
        const mappedItem = mapNetSubtotalOverride(item)
        const subtotal = Number(mappedItem.subtotal_override ?? Number(item.quantity ?? 0) * originalUnitPrice * (1 - discountPercentage / 100))

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
          ...mappedItem,
          product_id: item.product_id,
          variant_id: item.variant_id ?? null,
          variant_name: item.product_variants?.name ?? null,
          warehouse_id: item.warehouse_id ?? null,
          product_name: item.products?.name || item.products?.description || 'Producto',
          quantity: Number(item.quantity ?? 0),
          unit_price: originalUnitPrice,
          discount_percentage: discountPercentage,
          net_subtotal_override: mappedItem.net_subtotal_override ?? null,
          subtotal_override: mappedItem.subtotal_override ?? null,
          discount_amount_override: mappedItem.discount_amount_override ?? null,
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

// ─── Auto-select Document Type by Context (categoría) ──
// ORDER → OV/OC, QUOTE → PRES, REMITO → REM-V/REM-C según dirección del módulo
function getContextDocumentTypeCode(): string | null {
  const direction = moduleCode.value === 'SALES' ? 1 : -1
  if (props.category === 'ORDER') return direction === 1 ? 'OV' : 'OC'
  if (props.category === 'QUOTE') return 'PRES'
  if (props.category === 'REMITO') return direction === 1 ? 'REM-V' : 'REM-C'
  return null
}

// ─── Auto-select Document Type by VAT Condition ───────
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
  // Validar compatibilidad emisor ↔ comprobante
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
      selectedSequenceId.value = sequenceOptions.value.length === 1
        ? sequenceOptions.value[0]?.value ?? ''
        : ''
    }
  }

  if (items.value.length > 0) {
    fetchPreview()
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleSaveShortcut, true)
  fetchMyPermissionsIfNeeded()
  const requestId = ++partySearchRequestId
  partySearching.value = true
  void partiesService.search('', props.moduleCode === 'SALES' ? ['CUSTOMER'] : [...payablePartyTypes])
    .then((results) => {
      if (requestId === partySearchRequestId && !partySearch.value.trim()) remoteParties.value = results
    })
    .catch(() => {})
    .finally(() => {
      if (requestId === partySearchRequestId) partySearching.value = false
    })
  productsStore.hydrateCache()
  void productsStore.search('', usageFilter.value).catch((error: any) => {
    // Compatibilidad durante despliegues escalonados: si el frontend nuevo llega
    // antes que el endpoint de búsqueda, usar temporalmente el catálogo clásico.
    if (error?.status === 404 || error?.statusCode === 404) {
      void productsStore.fetchAll().catch(() => {})
    }
    // Ante otros fallos se conservan los productos disponibles en caché.
  })
  void documentsTypesStore.fetchAll().catch(() => {
    // Los demás bloques del formulario continúan disponibles si falla la red.
  })
  void initCurrencies().catch(() => {})
  void fetchIssuerCondition().catch(() => {})
  void loadDocumentSequences()
  void depositosStore.fetchAll()
    .then(() => loadStockAvailability())
    .catch(() => {})
  void fiscalService.getTaxRules('IIBB')
    .then(rows => { iibbPerceptionRules.value = rows })
    .catch(() => {})
  void fiscalService.getCompanyJurisdictions()
    .then(rows => { companyIibbJurisdictions.value = rows })
    .catch(() => {})
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

watch(
  () => [form.document_type_id, selectedSequenceId.value, sequenceOptions.value.map(option => option.value).join(',')],
  () => {
    if (!props.initialValues?.id) {
      if (sequenceOptions.value.length === 1 && selectedSequenceId.value !== sequenceOptions.value[0]?.value) {
        selectedSequenceId.value = sequenceOptions.value[0]?.value ?? ''
        return
      }
      void loadSequencePreview()
    }
  },
  { immediate: true }
)

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
    tax_id: p.tax_id || '—',
    vat_condition: p.vat_condition || '—',
    email: p.email || '—'
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
      if (price !== null) {
        item.unit_price = price
        item.net_subtotal_override = null
        item.subtotal_override = null
        item.discount_amount_override = null
      }
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
    variant_name: prod.variant_name ?? null,
    product_name: prod.product_name,
    quantity,
    purchase_unit_id: props.moduleCode === 'PURCHASES' ? (prod.purchase_unit_id ?? null) : null,
    unit_conversion_factor: props.moduleCode === 'PURCHASES' ? Number(prod.purchase_to_stock_factor ?? 1) : 1,
    stock_quantity: props.moduleCode === 'PURCHASES' ? quantity * Number(prod.purchase_to_stock_factor ?? 1) : quantity,
    unit_price: unitPrice,
    discount_percentage: 0,
    net_subtotal_override: null,
    subtotal_override: null,
    discount_amount_override: null,
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
  const errors: Record<string, string> = {}
  if (!form.document_type_id) errors.document_type_id = 'Seleccioná el tipo de comprobante.'
  if (!form.party_id) errors.party_id = moduleCode.value === 'SALES' ? 'Seleccioná un cliente.' : 'Seleccioná un proveedor o entidad.'
  if (!form.date || Number.isNaN(Date.parse(`${form.date}T12:00:00`))) errors.date = 'Ingresá una fecha válida.'
  if (form.descrip.length > 500) errors.descrip = 'La referencia admite hasta 500 caracteres.'
  if (sequenceOptions.value.length > 1 && !selectedSequenceId.value) errors.document_sequence_id = 'Elegí el punto de venta para numerar el comprobante.'
  if (documentTypeValidation.value) errors.document_type_id = documentTypeValidation.value
  if (showReferencePicker.value && !referenceDocumentId.value) errors.reference_document_id = 'Seleccioná la factura de referencia.'
  if (!items.value.length && selectedDocumentCategory.value !== 'OPENING_BALANCE') {
    errors.items = 'Agregá al menos un producto o concepto.'
  } else if (items.value.some(item => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
    errors.items = 'Cada renglón debe tener una cantidad mayor que cero.'
  } else if (items.value.some(item => !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0)) {
    errors.items = 'Revisá los precios: deben ser números iguales o mayores que cero.'
  }

  validationErrors.value = errors
  if (Object.keys(errors).length) {
    toast.add({
      title: 'Revisá los datos del comprobante',
      description: Object.values(errors).join(' '),
      color: 'warning'
    })
    return
  }

  const incompleteAdjustment = commercialAdjustments.value.some((adjustment) =>
    !adjustment.concept.trim() || Number(adjustment.value) <= 0 ||
    (adjustment.value_type === 'PERCENTAGE' && Number(adjustment.value) > 100)
  )
  if (incompleteAdjustment) {
    toast.add({
      title: 'Revisá los conceptos agregados',
      description: 'Completá el nombre y un importe mayor que cero; los porcentajes no pueden superar el 100%.',
      color: 'warning'
    })
    return
  }

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
    commercial_adjustments: commercialAdjustments.value.map((adjustment) => ({
      concept: adjustment.concept.trim(),
      value_type: adjustment.value_type,
      basis: adjustment.basis,
      value: Number(adjustment.value)
    })),
    ...(canOverrideSupplierTotal.value && supplierTotalOverride.value != null
      ? { supplier_total: Number(supplierTotalOverride.value) }
      : {}),
    items: items.value.map((i, idx) => ({
      product_id: i.product_id,
      variant_id: i.variant_id || undefined,
      warehouse_id: props.operationalMode
        ? (i.warehouse_id || form.warehouse_id || undefined)
        : affectsStock.value
          ? (moduleCode.value === 'SALES' ? (i.warehouse_id || undefined) : (advancedWarehouseAssignment.value ? (i.warehouse_id || undefined) : (form.warehouse_id || undefined)))
          : undefined,
      quantity: Number(i.quantity),
      purchase_unit_id: moduleCode.value === 'PURCHASES' ? (i.purchase_unit_id || undefined) : undefined,
      unit_conversion_factor: moduleCode.value === 'PURCHASES' ? Number(i.unit_conversion_factor || 1) : undefined,
      unit_price: Number(i.unit_price),
      discount_percentage: Math.min(100, Math.max(0, Number(i.discount_percentage || 0))),
      ...(moduleCode.value === 'PURCHASES' && i.net_subtotal_override != null
        ? { net_subtotal_override: Number(i.net_subtotal_override) }
        : {}),
      taxes: previewPayload?.items?.[idx]?.taxes?.map((t: any) => ({
        tax_id: t.tax_id,
        tax_rate: t.rate,
        tax_amount: t.amount
      })) ?? []
    }))
  }

  emit('submit', payload)
}

const onEditBussinessParty = async () => {
  if (!selectedCustomer.value?.value) return
  partyEditLoading.value = true
  try {
    const partyId = selectedCustomer.value.value
    selectedBusinessParty.value = await partiesService.findOne(partyId)
    showBusinessPartiesModal.value = true
  } catch (error: any) {
    toast.add({
      title: 'No se pudo cargar la ficha',
      description: error?.data?.message || 'Intentá nuevamente antes de editar el cliente o proveedor.',
      color: 'error'
    })
  } finally {
    partyEditLoading.value = false
  }
}

function handlePartyUpdated(party: BusinessParty) {
  remoteParties.value = remoteParties.value.map((current) => current.id === party.id ? party : current)
  selectedBusinessParty.value = party
}

async function copySelectedPartyName() {
  const name = selectedParty.value?.name?.trim()
  if (!name) return

  try {
    await navigator.clipboard.writeText(name)
    toast.add({ title: 'Nombre copiado', description: name, color: 'success' })
  } catch {
    toast.add({ title: 'No se pudo copiar', description: 'El navegador no permitió acceder al portapapeles.', color: 'warning' })
  }
}

defineExpose({ submit, completeDraft })
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-5">
    <UAlert
      v-if="availableDraft"
      color="warning"
      variant="subtle"
      icon="i-lucide-file-clock"
      title="Encontramos una carga sin terminar"
      :description="`Fue guardada en este dispositivo el ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(availableDraft.savedAt)}.`"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton label="Recuperar borrador" icon="i-lucide-rotate-ccw" size="sm" @click="restoreDocumentDraft" />
          <UButton label="Descartar" icon="i-lucide-trash-2" size="sm" color="neutral" variant="outline" @click="discardDraft" />
        </div>
      </template>
    </UAlert>

    <div v-else-if="draftStatus !== 'idle'" class="flex items-center justify-end gap-1.5 text-xs text-muted" aria-live="polite">
      <UIcon :name="draftStatus === 'saving' ? 'i-lucide-loader-circle' : 'i-lucide-check-circle-2'" :class="{ 'animate-spin': draftStatus === 'saving' }" />
      <span>{{ draftStatus === 'saving' ? 'Guardando borrador…' : `Borrador guardado en este dispositivo${draftSavedLabel ? ` · ${draftSavedLabel}` : ''}` }}</span>
    </div>
    <!-- Header: Party + Document Type + PV + Currency + Date -->
    <UAlert
      v-if="validationErrorSummary.length"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="No se pudo guardar todavía"
      :description="validationErrorSummary.join(' ')"
    />
    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold">Datos del comprobante</h2>
          <p class="mt-1 text-sm text-muted">Seleccioná el tercero y los datos que determinan la numeración y el cálculo fiscal.</p>
        </div>
      </template>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <UFormField :label="moduleCode === 'SALES' ? 'Cliente' : 'Proveedor o entidad'" :error="validationErrors.party_id" class="min-w-0 md:col-span-2 xl:col-span-12">
          <div class="flex min-w-0 gap-2">
            <USelectMenu
              v-model="selectedCustomer"
              :items="partyOptions"
              :placeholder="moduleCode === 'SALES' ? 'Buscar cliente...' : 'Buscar proveedor, servicio o ente impositivo...'"
              searchable
              v-model:search-term="partySearch"
              :loading="partySearching"
              size="lg"
              class="min-w-0 flex-1"
            />
            <UTooltip text="Copiar nombre completo del cliente/proveedor">
              <UButton
                icon="i-lucide-copy"
                variant="outline"
                size="lg"
                square
                class="shrink-0"
                aria-label="Copiar nombre completo del cliente o proveedor"
                :disabled="!selectedParty?.name"
                @click="copySelectedPartyName"
              />
            </UTooltip>
            <UButton icon="i-lucide-plus" variant="outline" size="lg" square class="shrink-0" aria-label="Crear cliente o proveedor" @click="showBusinessPartiesModal = true" />
            <UButton
              icon="i-lucide-pencil"
              variant="outline"
              size="lg"
              square
              class="shrink-0"
              aria-label="Editar cliente o proveedor"
              :disabled="!selectedCustomer"
              :loading="partyEditLoading"
              @click="onEditBussinessParty"
            />
          </div>
          <p class="mt-1 text-xs text-muted">Escribí al menos 2 caracteres para buscar en toda la lista por nombre, razón social o CUIT.</p>
        </UFormField>

        <UFormField label="Tipo de documento" :error="validationErrors.document_type_id" class="min-w-0 xl:col-span-6">
          <USelectMenu
            v-model="selectedDocumentType"
            :items="documentTypeOptions"
            placeholder="Seleccionar tipo..."
            size="lg"
            class="w-full min-w-0"
          />
        </UFormField>

        <UFormField label="Punto de venta" :error="validationErrors.document_sequence_id" class="min-w-0 xl:col-span-3">
          <USelectMenu
            v-model="selectedSequenceId"
            :items="sequenceOptions"
            value-key="value"
            placeholder="Seleccionar PV..."
            size="lg"
            class="w-full min-w-0"
            :disabled="sequenceOptions.length === 1"
          />
          <div v-if="!initialValues?.id" class="mt-2 min-h-5">
            <div v-if="sequencePreviewLoading" class="flex items-center gap-2 text-xs text-muted">
              <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" /> Calculando próximo número…
            </div>
            <div v-else-if="sequencePreview" class="flex flex-wrap items-center gap-1.5 text-xs">
              <span class="text-muted">Próximo comprobante:</span>
              <UBadge :label="sequencePreview.formatted" color="primary" variant="subtle" size="sm" />
              <UTooltip text="El número se confirma al guardar; otro usuario podría crear un documento antes.">
                <UIcon name="i-lucide-info" class="size-3.5 text-muted" />
              </UTooltip>
            </div>
            <p v-else-if="sequencePreviewError" class="flex items-center gap-1 text-xs text-warning">
              <UIcon name="i-lucide-circle-alert" class="size-3.5 shrink-0" /> {{ sequencePreviewError }}
            </p>
            <p v-if="sequencesUsingCache || sequencesRefreshFailed" class="mt-1 flex items-center gap-1 text-xs text-muted">
              <UIcon name="i-lucide-cloud-off" class="size-3.5 shrink-0" />
              {{ sequencesRefreshFailed ? 'Usando las series guardadas por conexión inestable.' : 'Series disponibles desde la caché local.' }}
            </p>
          </div>
          <UAlert
            v-if="isNetSalesOrderSequence"
            class="mt-2"
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Orden de venta en neto"
            description="Esta secuencia no suma IVA a la OV. Si generás una factura, sus impuestos se calculan según la configuración del tipo de factura."
          />
        </UFormField>

        <UFormField :label="dateFieldLabel" :error="validationErrors.date" class="min-w-0 xl:col-span-3">
          <UInput v-model="form.date" type="date" size="lg" class="w-full min-w-0" />
        </UFormField>

        <UFormField v-if="!operationalMode" label="Moneda del comprobante" class="min-w-0 xl:col-span-3">
          <USelect
            v-model="form.currency_code"
            :items="currencyOptions"
            placeholder="Moneda"
            size="lg"
            class="w-full min-w-0"
          />
        </UFormField>

        <UFormField label="Referencia" :error="validationErrors.descrip" :class="['min-w-0', operationalMode ? 'md:col-span-2 xl:col-span-12' : 'xl:col-span-9']">
          <UInput v-model="form.descrip" maxlength="500" placeholder="Referencia u observación (opcional)" class="w-full min-w-0" />
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
        <div v-if="partyInfo.email !== '—'">
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

    <slot name="document-details" />

    <UAlert
      v-if="validationErrors.reference_document_id || validationErrors.items"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="[validationErrors.reference_document_id, validationErrors.items].filter(Boolean).join(' ')"
    />

    <!-- Items Table -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-semibold">Detalle de productos</h2>
            <p class="mt-1 text-sm text-muted">{{ operationalMode ? (moduleCode === 'SALES' ? 'Indicá las cantidades y el depósito desde el que sale cada producto.' : 'Indicá las cantidades y el depósito en el que ingresa cada producto.') : 'La bonificación se aplica sobre cada artículo antes de calcular IVA e IIBB.' }}</p>
          </div>
          <UBadge color="neutral" variant="soft">
            {{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}
          </UBadge>
        </div>
      </template>
      <div v-if="itemsWithoutWarehouseStock.length" class="mb-4">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-warehouse"
          title="Hay productos sin depósito disponible"
          :description="`${itemsWithoutWarehouseStock.length === 1 ? 'El producto no tiene' : `${itemsWithoutWarehouseStock.length} productos no tienen`} un depósito con stock suficiente. Usá el botón junto al selector para regularizarlo.`"
        />
      </div>
      <div v-else-if="itemsWithoutSelectedWarehouse.length" class="mb-4">
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-map-pin"
          title="Falta seleccionar el depósito de salida"
          description="Elegí el depósito de cada producto antes de guardar el remito."
        />
      </div>
      <UAlert
        v-if="moduleCode === 'PURCHASES' && commercialAdjustments.length"
        class="mb-4"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="Bonificación por renglón calculada automáticamente"
        description="Las bonificaciones y los netos manuales por producto se conservan y se aplican antes de estos conceptos. Mientras haya conceptos, quedan bloqueados para evitar cambios accidentales. Quitalos para volver a editarlos."
      />
      <FacturaItemsTable
        :items="items"
        :product-options="productOptions"
        :currency-code="form.currency_code"
        :warehouses="warehouseOptions"
        :warehouse-options-for-item="warehouseOptionsForItem"
        :show-warehouse-column="moduleCode === 'SALES' ? operationalMode && affectsStock : affectsStock && advancedWarehouseAssignment"
        :default-warehouse-id="form.warehouse_id"
        :show-amounts="!operationalMode"
        :is-purchase-document="moduleCode === 'PURCHASES' && !operationalMode"
        :lock-purchase-adjustments="moduleCode === 'PURCHASES' && commercialAdjustments.length > 0"
        :can-regularize-stock="canRegularizeStock"
        @remove="removeItem"
        @add="addItem"
        @update:warehouse="updateItemWarehouse"
        @regularize-stock="openStockRegularization"
        @search-products="searchProducts"
      />
    </UCard>

    <UAlert
      v-if="commercialAdjustmentTransferBlocked"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="El documento de destino no acepta los conceptos de origen"
      description="Para transferirlos, activá “Acepta conceptos comerciales” en la configuración de este tipo de documento. No se descartarán al guardar."
    />

    <UCard v-if="canAddCommercialAdjustments">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">Descuentos y bonificaciones</h2>
            <p class="mt-1 text-sm text-muted">Elegí una plantilla o agregá un concepto puntual. Podés ajustar cada dato antes de guardar.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <USelectMenu
              v-model="selectedCommercialAdjustmentConceptId"
              :items="commercialAdjustmentConceptOptions"
              value-key="value"
              searchable
              :loading="commercialAdjustmentConceptsLoading"
              :disabled="commercialAdjustmentConceptsLoading || !commercialAdjustmentConceptOptions.length"
              placeholder="Elegir del catálogo..."
              class="w-full sm:w-64"
            />
            <UButton icon="i-lucide-plus" label="Agregar" color="primary" variant="outline" :disabled="!selectedCommercialAdjustmentConcept" @click="addSelectedCommercialAdjustment" />
            <UButton icon="i-lucide-pencil-line" label="Manual" color="neutral" variant="ghost" @click="addCommercialAdjustment" />
            <UButton v-if="canManageCommercialAdjustmentConcepts" icon="i-lucide-settings-2" label="Catálogo" color="neutral" variant="ghost" to="/erp/settings/commercial-adjustment-concepts" />
          </div>
        </div>
      </template>

      <div v-if="commercialAdjustments.length" class="flex flex-col gap-3">
        <div
          v-for="(adjustment, index) in commercialAdjustments"
          :key="index"
          class="grid grid-cols-1 items-end gap-3 rounded-lg border border-default p-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_minmax(130px,0.8fr)_minmax(140px,0.8fr)_minmax(180px,1fr)_auto]"
        >
          <UFormField label="Concepto" required>
            <UInput v-model="adjustment.concept" placeholder="Ej.: Bonificación comercial" class="w-full" />
          </UFormField>
          <UFormField label="Tipo de descuento">
            <USelect v-model="adjustment.value_type" :items="adjustmentTypeOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField :label="adjustment.value_type === 'PERCENTAGE' ? 'Porcentaje' : 'Importe fijo'" required>
            <UInput
              v-model.number="adjustment.value"
              type="number"
              min="0.01"
              :max="adjustment.value_type === 'PERCENTAGE' ? 100 : undefined"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Calcular sobre">
            <USelect v-model="adjustment.basis" :items="adjustmentBasisOptions" value-key="value" class="w-full" />
          </UFormField>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            aria-label="Quitar concepto"
            @click="removeCommercialAdjustment(index)"
          />
        </div>
        <p class="text-xs text-muted">El neto antes de impuestos es la base recomendada. No cargues acá descuentos de pronto pago condicionados: solo conceptos ya otorgados en la factura.</p>
      </div>
      <div v-else class="rounded-lg border border-dashed border-default px-4 py-5 text-sm text-muted">
        No hay descuentos ni bonificaciones. Podés aplicar una plantilla del catálogo o crear un concepto manual. Cada uno recalcula impuestos y el total.
      </div>
      <UAlert v-if="commercialAdjustmentConceptsError" class="mt-3" color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="No se pudo cargar el catálogo" description="Podés continuar con un concepto manual. Si necesitás plantillas, verificá tu permiso de lectura o la configuración de la empresa." />
      <p v-else-if="!commercialAdjustmentConceptsLoading && !commercialAdjustmentConcepts.length" class="mt-3 text-xs text-muted">Todavía no hay plantillas activas para este circuito. Podés agregarlas desde Configuración de documentos.</p>
    </UCard>

    <UModal v-model:open="regularizationOpen" title="Regularizar stock para el remito" description="Registrá un ingreso manual auditable para poder seleccionar el depósito de salida.">
      <template #body>
        <div class="space-y-4">
          <UAlert color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Este movimiento modifica el stock" description="Usalo únicamente si la mercadería existe físicamente y todavía no fue registrada en el sistema." />
          <div class="rounded-lg bg-muted/40 p-3">
            <p class="font-medium">{{ regularizationItem?.product_name || 'Producto' }}</p>
            <p class="text-sm text-muted">El remito requiere {{ Number(regularizationItem?.quantity || 0).toLocaleString('es-AR') }} unidades.</p>
          </div>
          <UAlert v-if="allWarehouseOptions.length === 0" color="warning" variant="subtle" icon="i-lucide-warehouse" title="No hay depósitos físicos disponibles" description="Primero creá o activá un depósito para registrar el stock.">
            <template #actions><UButton to="/productos/warehouses" label="Administrar depósitos" size="xs" variant="outline" /></template>
          </UAlert>
          <UFormField label="Depósito físico" required>
            <USelectMenu v-model="regularizationForm.warehouse_id" :items="allWarehouseOptions" value-key="value" searchable :disabled="allWarehouseOptions.length === 0" placeholder="Seleccionar depósito" class="w-full" />
          </UFormField>
          <UFormField label="Cantidad a ingresar" required description="Indicá solamente la cantidad que falta registrar, no el saldo final del depósito.">
            <UInput v-model.number="regularizationForm.quantity" type="number" min="0.001" step="0.001" class="w-full" />
          </UFormField>
          <UFormField label="Motivo del ajuste" required description="Quedará registrado en el historial de movimientos.">
            <UTextarea v-model="regularizationForm.notes" :rows="3" placeholder="Ej. Stock inicial verificado físicamente" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="outline" :disabled="regularizationSaving" @click="() => { regularizationOpen = false }" />
          <UButton label="Registrar y seleccionar" icon="i-lucide-package-plus" :loading="regularizationSaving" :disabled="regularizationSaving || !regularizationForm.warehouse_id || regularizationForm.quantity <= 0 || !regularizationForm.notes.trim()" @click="saveStockRegularization" />
        </div>
      </template>
    </UModal>

    <!-- Totals -->
    <div v-if="!operationalMode" class="flex min-w-0 justify-end">
      <UCard class="w-full border-t-2 border-primary lg:max-w-xl">
        <div v-if="canOverrideSupplierTotal" class="mb-4 rounded-lg border border-default bg-muted/20 p-3">
          <UFormField label="Total de la factura del proveedor" description="Los impuestos siguen calculándose automáticamente. La diferencia se guarda separada del cálculo fiscal.">
            <div class="flex flex-wrap items-center gap-2">
              <UInput
                :model-value="supplierTotalOverride ?? Number(total.toFixed(2))"
                type="number"
                min="0"
                step="0.01"
                class="w-full sm:max-w-xs"
                @update:model-value="updateSupplierTotal"
              />
              <UButton
                v-if="supplierTotalOverride != null"
                label="Usar total calculado"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="supplierTotalOverride = null"
              />
            </div>
          </UFormField>
          <div v-if="supplierTotalOverride != null && Math.abs(supplierTotalDifference) >= 0.005" class="mt-2 flex justify-between gap-3 text-sm">
            <span class="text-muted">Diferencia contra subtotal e impuestos</span>
            <span :class="supplierTotalDifference >= 0 ? 'font-medium text-warning' : 'font-medium text-error'">
              {{ supplierTotalDifference >= 0 ? '+' : '−' }} {{ Math.abs(supplierTotalDifference).toLocaleString('es-AR', { style: 'currency', currency: form.currency_code }) }}
            </span>
          </div>
        </div>
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
          :original-subtotal="originalSubtotal"
          :commercial-adjustments="appliedCommercialAdjustments"
          :taxes="taxesSummary"
          :total="displayedTotal"
          :show-breakdown="showTaxBreakdown"
          :currency-code="form.currency_code"
          :exchange-rate="form.exchange_rate"
          :converted-total="form.exchange_rate ? convertAmount(displayedTotal) : null"
        />
      </UCard>
    </div>
  </div>

  <BusinessPartyModal v-model:open="showBusinessPartiesModal" v-model:business-party="selectedBusinessParty" @success="handlePartyUpdated" />
</template>
