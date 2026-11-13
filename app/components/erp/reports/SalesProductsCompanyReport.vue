<script setup lang="ts">
import { h, nextTick, watch } from 'vue'
import { UButton } from '#components'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { useManagementReportsService } from '~/modulos/erp/management-reports/management-reports.service'
import type { SalesProductsCompanySummary, SalesProductsCurrencySummary, SalesProductsDetail, SalesProductsGroupRow, SalesProductsMovement, SalesProductsProductRow, SalesProductsSummary } from '~/modulos/erp/management-reports/sales-products-report.types'
import { getStatusLabel } from '~/modulos/erp/documents/types/document-statuses'

interface CompanyCurrencyRow extends SalesProductsCurrencySummary {
  company_id: string
  company_name: string
  subdomain: string
  id: string
}

interface ActiveDetail {
  company_id: string
  company_name: string
  currency_code: string
  group_type: 'POINT_OF_SALE'
  group_key: string
  label: string
}

interface ProductTreeRow {
  id: string
  kind: 'CATEGORY' | 'PRODUCT' | 'MOVEMENT' | 'PAGER' | 'LOADING' | 'ERROR' | 'EMPTY'
  depth: number
  category?: SalesProductsGroupRow
  product?: SalesProductsProductRow
  movement?: SalesProductsMovement
  page?: number
  total?: number
}

const service = useManagementReportsService()
const toast = useToast()
const today = new Date()
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const filters = reactive({
  date_from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  date_to: localDate(today),
  search: '',
})
const companies = ref<Awaited<ReturnType<typeof service.getConsolidatedCompanies>>>([])
const selectedCompanyIds = ref<string[]>([])
const ovStatusOptions = [
  { value: 1, label: 'Aprobada' }, { value: 2, label: 'En preparación' },
  { value: 3, label: 'Lista para despacho' }, { value: 4, label: 'Entrega parcial' },
  { value: 5, label: 'Entregada' }, { value: 6, label: 'Facturada' }, { value: 7, label: 'Cerrada' },
]
const selectedStatuses = ref([1, 4, 5, 7])
const summary = ref<SalesProductsSummary | null>(null)
const activeCompanyKey = ref('')
const loadingCompanies = ref(false)
const loadingSummary = ref(false)
const exporting = ref(false)
const summaryError = ref('')
const detailSection = ref<HTMLElement | null>(null)
const activeDetail = ref<ActiveDetail | null>(null)
const detail = ref<SalesProductsDetail | null>(null)
const detailPage = ref(1)
const detailLoading = ref(false)
const detailError = ref('')
const activeCompanyView = ref<'CATEGORY' | 'POINT_OF_SALE'>('CATEGORY')
const expandedCategoryKeys = ref<Record<string, boolean>>({})
const activeProductKey = ref('')
const productDetail = ref<SalesProductsDetail | null>(null)
const productDetailPage = ref(1)
const productDetailLoading = ref(false)
const productDetailError = ref('')
let productRequestId = 0
const pageSize = 25

const companyOptions = computed(() => companies.value.map(company => ({ label: `${company.name} · ${company.subdomain}`, value: company.id })))
const canGenerate = computed(() => selectedCompanyIds.value.length > 0 && selectedStatuses.value.length > 0 && filters.date_from <= filters.date_to)
const statusLabel = computed(() => selectedStatuses.value.length === ovStatusOptions.length
  ? 'Todos los estados' : `${selectedStatuses.value.length} estados`)
const summaryRows = computed<CompanyCurrencyRow[]>(() => (summary.value?.companies ?? []).flatMap((company: SalesProductsCompanySummary) =>
  company.currencies.map(currency => ({ ...currency, company_id: company.company_id, company_name: company.company_name, subdomain: company.subdomain, id: `${company.company_id}:${currency.currency_code}` })),
))
const activeCompanyRow = computed(() => summaryRows.value.find(row => row.id === activeCompanyKey.value) ?? null)

const formatMoney = (value: string | number, currency: string) => {
  const amount = Number(value) || 0
  try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount) }
  catch { return `${currency} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(amount)}` }
}
const formatNumber = (value: string | number, digits = 2) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(Number(value) || 0)
const formatDate = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))

function clearResults() {
  summary.value = null
  activeCompanyKey.value = ''
  activeDetail.value = null
  detail.value = null
  summaryError.value = ''
  detailError.value = ''
  activeCompanyView.value = 'CATEGORY'
  expandedCategoryKeys.value = {}
  activeProductKey.value = ''
  productDetail.value = null
  productDetailPage.value = 1
  productDetailLoading.value = false
  productDetailError.value = ''
  productRequestId++
}

async function loadCompanies() {
  loadingCompanies.value = true
  try {
    companies.value = await service.getConsolidatedCompanies()
    selectedCompanyIds.value = companies.value.slice(0, 20).map(company => company.id)
  } catch (error: any) {
    summaryError.value = error?.data?.message ?? error?.message ?? 'No se pudieron cargar las empresas.'
  } finally {
    loadingCompanies.value = false
  }
}

async function generateReport() {
  if (!canGenerate.value || loadingSummary.value) return
  loadingSummary.value = true
  summaryError.value = ''
  activeDetail.value = null
  detail.value = null
  activeCompanyKey.value = ''
  clearProductExpansion()
  try {
    summary.value = await service.getSalesProducts({
      company_ids: selectedCompanyIds.value,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: [...selectedStatuses.value].sort((a, b) => a - b),
      search: filters.search.trim() || undefined,
    })
  } catch (error: any) {
    summary.value = null
    summaryError.value = error?.data?.message ?? error?.message ?? 'No se pudo generar el reporte.'
  } finally {
    loadingSummary.value = false
  }
}

function toggleCompany(row: CompanyCurrencyRow) {
  activeCompanyKey.value = activeCompanyKey.value === row.id ? '' : row.id
  activeDetail.value = null
  detail.value = null
  activeCompanyView.value = 'CATEGORY'
  expandedCategoryKeys.value = {}
  clearProductExpansion()
}

function clearProductExpansion() {
  activeProductKey.value = ''
  productDetail.value = null
  productDetailPage.value = 1
  productDetailLoading.value = false
  productDetailError.value = ''
  productRequestId++
}

function getProductKey(row: CompanyCurrencyRow, category: SalesProductsGroupRow, product: SalesProductsProductRow) {
  return `${row.company_id}:${row.currency_code}:${category.key}:${product.product_key}`
}

const activeProductContext = computed(() => {
  const row = activeCompanyRow.value
  if (!row || !activeProductKey.value) return null
  for (const category of row.categories) {
    for (const product of category.products ?? []) {
      if (getProductKey(row, category, product) === activeProductKey.value) return { row, category, product }
    }
  }
  return null
})

function closeProductExpansion() {
  clearProductExpansion()
}

async function loadProductPage(page: number) {
  const selected = activeProductContext.value
  if (!selected || productDetailLoading.value) return
  const requestId = ++productRequestId
  activeProductKey.value = getProductKey(selected.row, selected.category, selected.product)
  productDetailLoading.value = true
  productDetailError.value = ''
  productDetail.value = null
  productDetailPage.value = page
  try {
    const result = await service.getSalesProductsDetail({
      company_ids: selectedCompanyIds.value,
      company_id: selected.row.company_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: [...selectedStatuses.value].sort((a, b) => a - b),
      search: filters.search.trim() || undefined,
      group_type: 'PRODUCT',
      group_key: selected.product.product_key,
      currency_code: selected.row.currency_code,
      page,
      page_size: pageSize,
    })
    if (requestId !== productRequestId) return
    productDetail.value = result
  } catch (error: any) {
    if (requestId !== productRequestId) return
    productDetailError.value = error?.data?.message ?? error?.message ?? 'No se pudieron cargar los comprobantes del artículo.'
  } finally {
    if (requestId === productRequestId) productDetailLoading.value = false
  }
}

function toggleCategory(category: SalesProductsGroupRow) {
  if (expandedCategoryKeys.value[category.key]) {
    delete expandedCategoryKeys.value[category.key]
    if (activeProductContext.value?.category.key === category.key) closeProductExpansion()
    return
  }
  expandedCategoryKeys.value[category.key] = true
}

async function toggleProduct(category: SalesProductsGroupRow, product: SalesProductsProductRow) {
  const row = activeCompanyRow.value
  if (!row) return
  const key = getProductKey(row, category, product)
  if (activeProductKey.value === key) {
    closeProductExpansion()
    return
  }
  clearProductExpansion()
  activeProductKey.value = key
  await nextTick()
  if (activeProductKey.value !== key) return
  await loadProductPage(1)
}

async function openGroup(row: CompanyCurrencyRow, group: SalesProductsGroupRow) {
  const label = group.point_of_sale
  activeDetail.value = {
    company_id: row.company_id,
    company_name: row.company_name,
    currency_code: row.currency_code,
    group_type: 'POINT_OF_SALE',
    group_key: group.key,
    label,
  }
  detailPage.value = 1
  await loadDetail(1)
  await nextTick()
  detailSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const productTreeRows = computed<ProductTreeRow[]>(() => {
  const row = activeCompanyRow.value
  if (!row) return []
  const result: ProductTreeRow[] = []
  for (const category of row.categories) {
    result.push({ id: `CATEGORY:${category.key}`, kind: 'CATEGORY', depth: 0, category })
    if (!expandedCategoryKeys.value[category.key]) continue
    for (const product of category.products ?? []) {
      const key = getProductKey(row, category, product)
      result.push({ id: `PRODUCT:${key}`, kind: 'PRODUCT', depth: 1, category, product })
      if (activeProductKey.value !== key) continue
      if (productDetailLoading.value) {
        result.push({ id: `LOADING:${key}`, kind: 'LOADING', depth: 2, category, product })
        continue
      }
      if (productDetailError.value) {
        result.push({ id: `ERROR:${key}`, kind: 'ERROR', depth: 2, category, product })
        continue
      }
      if (!productDetail?.value?.items.length) {
        if (productDetail.value) result.push({ id: `EMPTY:${key}`, kind: 'EMPTY', depth: 2, category, product })
        continue
      }
      for (const movement of productDetail.value.items) {
        result.push({ id: `MOVEMENT:${movement.id}`, kind: 'MOVEMENT', depth: 2, category, product, movement })
      }
      result.push({ id: `PAGER:${key}`, kind: 'PAGER', depth: 2, category, product, page: productDetail.value.page, total: productDetail.value.total_rows })
    }
  }
  return result
})

function changeProductPage(page: number) {
  if (!productDetail.value || page < 1 || page > Math.ceil(productDetail.value.total_rows / pageSize)) return
  void loadProductPage(page)
}

async function loadDetail(page: number) {
  const selected = activeDetail.value
  if (!selected) return
  detailPage.value = page
  detailLoading.value = true
  detailError.value = ''
  try {
    detail.value = await service.getSalesProductsDetail({
      company_ids: selectedCompanyIds.value,
      company_id: selected.company_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: [...selectedStatuses.value].sort((a, b) => a - b),
      search: filters.search.trim() || undefined,
      group_type: selected.group_type,
      group_key: selected.group_key,
      currency_code: selected.currency_code,
      page,
      page_size: pageSize,
    })
  } catch (error: any) {
    detail.value = null
    detailError.value = error?.data?.message ?? error?.message ?? 'No se pudieron cargar los movimientos.'
  } finally {
    detailLoading.value = false
  }
}

async function exportExcel() {
  if (!canGenerate.value || exporting.value) return
  exporting.value = true
  try {
    const blob = await service.exportSalesProducts({
      company_ids: selectedCompanyIds.value,
      date_from: filters.date_from,
      date_to: filters.date_to,
      ov_statuses: [...selectedStatuses.value].sort((a, b) => a - b),
      search: filters.search.trim() || undefined,
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `productos-vendidos-empresas-${filters.date_from}-${filters.date_to}.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error: any) {
    toast.add({ title: 'No se pudo exportar el reporte', description: error?.data?.message ?? error?.message ?? 'Probá acotando el período o la búsqueda.', color: 'error' })
  } finally {
    exporting.value = false
  }
}

const summaryColumns = computed<ExtendedColumn<CompanyCurrencyRow>[]>(() => [
  {
    accessorKey: 'company_name', header: 'Empresa', meta: { label: 'Empresa', filter: false },
    cell: ({ row }: any) => h(UButton, {
      label: row.original.company_name,
      icon: activeCompanyKey.value === row.original.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
      variant: 'link', color: 'primary', size: 'sm', class: 'h-auto max-w-64 justify-start px-0 py-0 text-left font-semibold',
      onClick: () => toggleCompany(row.original),
    }),
  },
  { accessorKey: 'currency_code', header: 'Moneda', meta: { label: 'Moneda', filter: false } },
  { accessorKey: 'document_count', header: 'OVs', meta: { label: 'OVs', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.document_count, 0)) },
  { accessorKey: 'line_count', header: 'Renglones', meta: { label: 'Renglones', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.line_count, 0)) },
  { accessorKey: 'subtotal', header: 'Neto', meta: { label: 'Neto', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.subtotal, row.original.currency_code)) },
  { accessorKey: 'vat', header: 'IVA', meta: { label: 'IVA', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums text-muted' }, formatMoney(row.original.vat, row.original.currency_code)) },
  { accessorKey: 'line_total', header: 'Total renglones', meta: { label: 'Total renglones', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right font-semibold tabular-nums text-primary' }, formatMoney(row.original.line_total, row.original.currency_code)) },
  { accessorKey: 'document_total', header: 'Total de OV', meta: { label: 'Total de OV', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.document_total, row.original.currency_code)) },
  { accessorKey: 'document_difference', header: 'Diferencia', meta: { label: 'Diferencia', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums text-warning' }, formatMoney(row.original.document_difference, row.original.currency_code)) },
])

const pointColumns = computed<ExtendedColumn<SalesProductsGroupRow>[]>(() => [
  { accessorKey: 'point_of_sale', header: 'Punto de venta', meta: { label: 'Punto de venta', filter: false }, cell: ({ row }: any) => h('span', { class: 'font-medium text-highlighted' }, row.original.point_of_sale) },
  { accessorKey: 'document_count', header: 'OVs', meta: { label: 'OVs', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.document_count, 0)) },
  { accessorKey: 'line_count', header: 'Renglones', meta: { label: 'Renglones', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.line_count, 0)) },
  { accessorKey: 'quantity', header: 'Unidades', meta: { label: 'Unidades', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.quantity, 3)) },
  { accessorKey: 'subtotal', header: 'Neto', meta: { label: 'Neto', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.subtotal, activeCompanyRow.value?.currency_code ?? 'ARS')) },
  { accessorKey: 'vat', header: 'IVA', meta: { label: 'IVA', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.vat, activeCompanyRow.value?.currency_code ?? 'ARS')) },
  { accessorKey: 'line_total', header: 'Total', meta: { label: 'Total', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right font-medium tabular-nums' }, formatMoney(row.original.line_total, activeCompanyRow.value?.currency_code ?? 'ARS')) },
  { accessorKey: 'percent_of_company_total', header: '%', meta: { label: '%', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums text-muted' }, `${formatNumber(row.original.percent_of_company_total)}%`) },
  { accessorKey: 'action', header: '', meta: { label: 'Acción', filter: false, disableColumnVisibility: true }, cell: ({ row }: any) => h(UButton, { label: 'Ver OVs', icon: 'i-lucide-list-tree', color: 'neutral', variant: 'outline', size: 'xs', onClick: () => { if (activeCompanyRow.value) void openGroup(activeCompanyRow.value, row.original) } }) },
])

const productTreeColumns = computed<ExtendedColumn<ProductTreeRow>[]>(() => [
  {
    accessorKey: 'label', header: 'Categoría / artículo / OV', meta: { label: 'Categoría / artículo / OV', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      if (item.kind === 'CATEGORY' && item.category) {
        const expanded = Boolean(expandedCategoryKeys.value[item.category.key])
        return h('div', { class: 'flex min-w-64 items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5' }, [
          h(UButton, { icon: expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right', variant: 'ghost', color: 'primary', size: 'xs', class: 'shrink-0', 'aria-label': expanded ? 'Contraer categoría' : 'Expandir categoría', onClick: () => toggleCategory(item.category!) }),
          h('div', { class: 'min-w-0' }, [h('div', { class: 'truncate font-semibold text-highlighted' }, item.category.category), h('div', { class: 'truncate text-[11px] text-muted' }, `${item.category.category_path} · ${formatNumber(item.category.product_count, 0)} artículos · ${activeCompanyRow.value?.currency_code ?? ''}`)]),
        ])
      }
      if (item.kind === 'PRODUCT' && item.category && item.product) {
        const expanded = activeProductKey.value === getProductKey(activeCompanyRow.value!, item.category, item.product)
        const children = [h(UButton, { icon: expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right', label: item.product.product_name, variant: 'link', color: 'neutral', size: 'xs', class: 'h-auto min-w-0 justify-start truncate px-0 text-left font-medium text-highlighted', onClick: () => void toggleProduct(item.category!, item.product!) })]
        if (item.product.product_id) children.push(h(UButton, { icon: 'i-lucide-arrow-up-right', to: `/productos/${encodeURIComponent(item.product.product_id)}`, variant: 'ghost', color: 'primary', size: 'xs', class: 'shrink-0', title: 'Abrir ficha del artículo', 'aria-label': 'Abrir ficha del artículo' }))
        if (item.product.sku) children.push(h('span', { class: 'shrink-0 text-[10px] text-muted' }, `· ${item.product.sku}`))
        return h('div', { class: 'flex min-w-64 items-center gap-2 pl-8' }, children)
      }
      if (item.kind === 'MOVEMENT' && item.movement) {
        return h('div', { class: 'flex min-w-64 flex-col pl-16' }, [
          h(UButton, { label: item.movement.document_reference, icon: 'i-lucide-file-text', to: `/erp/orders/${encodeURIComponent(item.movement.document_id)}`, variant: 'link', color: 'primary', size: 'xs', class: 'h-auto justify-start px-0 font-medium' }),
          h('span', { class: 'text-[11px] text-muted' }, `${formatDate(item.movement.date)} · ${item.movement.party_name}`),
        ])
      }
      if (item.kind === 'PAGER' && productDetail.value) {
        const totalPages = Math.max(1, Math.ceil(productDetail.value.total_rows / pageSize))
        const first = (productDetail.value.page - 1) * pageSize + 1
        const last = Math.min(productDetail.value.page * pageSize, productDetail.value.total_rows)
        return h('div', { class: 'flex min-w-64 items-center gap-2 pl-16 text-xs text-muted' }, [
          h('span', `${formatNumber(first, 0)}–${formatNumber(last, 0)} de ${formatNumber(productDetail.value.total_rows, 0)}`),
          h(UButton, { label: 'Anterior', icon: 'i-lucide-chevron-left', color: 'neutral', variant: 'outline', size: 'xs', disabled: productDetail.value.page <= 1 || productDetailLoading.value, onClick: () => changeProductPage(productDetail.value!.page - 1) }),
          h(UButton, { label: 'Siguiente', trailingIcon: 'i-lucide-chevron-right', color: 'neutral', variant: 'outline', size: 'xs', disabled: productDetail.value.page >= totalPages || productDetailLoading.value, onClick: () => changeProductPage(productDetail.value!.page + 1) }),
        ])
      }
      if (item.kind === 'LOADING') return h('span', { class: 'pl-16 text-xs text-muted' }, 'Cargando comprobantes…')
      if (item.kind === 'ERROR') return h(UButton, { label: productDetailError.value || 'No se pudieron cargar los comprobantes. Reintentar', icon: 'i-lucide-refresh-cw', color: 'error', variant: 'link', size: 'xs', class: 'pl-16', onClick: () => void loadProductPage(productDetailPage.value) })
      if (item.kind === 'EMPTY') return h('span', { class: 'pl-16 text-xs text-muted' }, 'Este artículo no tiene renglones para los filtros seleccionados.')
      return null
    },
  },
  {
    accessorKey: 'documents', header: 'OVs', meta: { label: 'OVs', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      if (item.kind === 'CATEGORY' && item.category) return h('span', { class: 'block rounded bg-primary/10 px-2 py-1.5 text-right font-semibold tabular-nums' }, formatNumber(item.category.document_count, 0))
      if (item.kind === 'PRODUCT' && item.product) return h('span', { class: 'block text-right tabular-nums' }, formatNumber(item.product.document_count, 0))
      if (item.kind === 'MOVEMENT' && item.movement) return h('span', { class: 'block text-right text-xs text-muted' }, getStatusLabel('ORDER', item.movement.document_status))
      return null
    },
  },
  {
    accessorKey: 'quantity', header: 'Unidades', meta: { label: 'Unidades', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      const amount = item.kind === 'CATEGORY' ? item.category?.quantity : item.kind === 'PRODUCT' ? item.product?.quantity : item.movement?.quantity
      return amount === undefined ? null : h('span', { class: `block text-right tabular-nums ${item.kind === 'CATEGORY' ? 'rounded bg-primary/10 px-2 py-1.5 font-semibold' : ''}` }, formatNumber(amount, 3))
    },
  },
  {
    accessorKey: 'subtotal', header: 'Neto', meta: { label: 'Neto', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      const amount = item.kind === 'CATEGORY' ? item.category?.subtotal : item.kind === 'PRODUCT' ? item.product?.subtotal : item.movement?.subtotal
      return amount === undefined ? null : h('span', { class: `block text-right tabular-nums ${item.kind === 'CATEGORY' ? 'rounded bg-primary/10 px-2 py-1.5 font-semibold' : ''}` }, formatMoney(amount, activeCompanyRow.value?.currency_code ?? 'ARS'))
    },
  },
  {
    accessorKey: 'vat', header: 'IVA', meta: { label: 'IVA', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      const amount = item.kind === 'CATEGORY' ? item.category?.vat : item.kind === 'PRODUCT' ? item.product?.vat : item.movement?.vat
      return amount === undefined ? null : h('span', { class: `block text-right tabular-nums ${item.kind === 'CATEGORY' ? 'rounded bg-primary/10 px-2 py-1.5 font-semibold text-highlighted' : 'text-muted'}` }, formatMoney(amount, activeCompanyRow.value?.currency_code ?? 'ARS'))
    },
  },
  {
    accessorKey: 'line_total', header: 'Total', meta: { label: 'Total', filter: false },
    cell: ({ row }: any) => {
      const item = row.original as ProductTreeRow
      const amount = item.kind === 'CATEGORY' ? item.category?.line_total : item.kind === 'PRODUCT' ? item.product?.line_total : item.movement?.line_total
      return amount === undefined ? null : h('span', { class: `block text-right font-medium tabular-nums ${item.kind === 'CATEGORY' ? 'rounded bg-primary/10 px-2 py-1.5 font-semibold' : ''}` }, formatMoney(amount, activeCompanyRow.value?.currency_code ?? 'ARS'))
    },
  },
])

const movementColumns = computed<ExtendedColumn<SalesProductsMovement>[]>(() => [
  { accessorKey: 'date', header: 'Fecha OV', meta: { label: 'Fecha OV', filter: false }, cell: ({ row }: any) => formatDate(row.original.date) },
  { accessorKey: 'document_reference', header: 'OV', meta: { label: 'OV', filter: false }, cell: ({ row }: any) => h(UButton, { label: row.original.document_reference, to: `/erp/orders/${encodeURIComponent(row.original.document_id)}`, variant: 'link', color: 'primary', size: 'xs', class: 'px-0 font-medium' }) },
  { accessorKey: 'document_id', header: 'UUID OV', meta: { label: 'UUID OV', filter: false }, cell: ({ row }: any) => h('span', { class: 'font-mono text-[10px] text-muted', title: row.original.document_id }, row.original.document_id) },
  { accessorKey: 'party_name', header: 'Cliente', meta: { label: 'Cliente', filter: false } },
  { accessorKey: 'document_status', header: 'Estado', meta: { label: 'Estado', filter: false }, cell: ({ row }: any) => getStatusLabel('ORDER', row.original.document_status) },
  { accessorKey: 'product_name', header: 'Producto', meta: { label: 'Producto', filter: false }, cell: ({ row }: any) => row.original.product_id ? h(UButton, { label: row.original.product_name, to: `/productos/${encodeURIComponent(row.original.product_id)}`, variant: 'link', color: 'primary', size: 'xs', class: 'max-w-60 justify-start truncate px-0' }) : row.original.product_name },
  { accessorKey: 'sku', header: 'SKU', meta: { label: 'SKU', filter: false } },
  { accessorKey: 'id', header: 'UUID renglón', meta: { label: 'UUID renglón', filter: false }, cell: ({ row }: any) => h('span', { class: 'font-mono text-[10px] text-muted', title: row.original.id }, row.original.id) },
  { accessorKey: 'quantity', header: 'Cantidad', meta: { label: 'Cantidad', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatNumber(row.original.quantity, 3)) },
  { accessorKey: 'unit_price', header: 'Precio unit. neto', meta: { label: 'Precio unit. neto', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.unit_price, row.original.currency_code)) },
  { accessorKey: 'subtotal', header: 'Neto', meta: { label: 'Neto', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.subtotal, row.original.currency_code)) },
  { accessorKey: 'vat', header: 'IVA registrado', meta: { label: 'IVA registrado', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.vat, row.original.currency_code)) },
  { accessorKey: 'unit_price_with_vat', header: 'Precio unit. c/IVA', meta: { label: 'Precio unit. c/IVA', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right tabular-nums' }, formatMoney(row.original.unit_price_with_vat, row.original.currency_code)) },
  { accessorKey: 'line_total', header: 'Total c/IVA', meta: { label: 'Total c/IVA', filter: false }, cell: ({ row }: any) => h('span', { class: 'block text-right font-semibold tabular-nums' }, formatMoney(row.original.line_total, row.original.currency_code)) },
])

watch([selectedCompanyIds, selectedStatuses, () => filters.search], clearResults, { deep: true })

onMounted(loadCompanies)
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1800px] px-4 pb-10 sm:px-6 lg:px-8">
    <div class="flex min-w-0 flex-col gap-4">
      <AppPageHeader title="Productos vendidos por empresa" description="Compará cantidades e importes de OV por empresa; abrí las categorías y artículos para consultar sus comprobantes en el mismo desglose.">
        <template #links>
          <UButton label="Exportar Excel" icon="i-lucide-download" color="neutral" variant="outline" :loading="exporting" :disabled="!summary" @click="exportExcel" />
        </template>
      </AppPageHeader>

      <section class="rounded-xl border border-default bg-elevated/20 p-3 sm:p-4">
        <div class="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.3fr)_minmax(135px,.65fr)_minmax(135px,.65fr)_minmax(180px,.9fr)_minmax(210px,1fr)_auto]">
          <UFormField label="Empresas"><USelectMenu v-model="selectedCompanyIds" :items="companyOptions" value-key="value" multiple searchable placeholder="Elegir empresas" class="w-full" :disabled="loadingCompanies"><template #default><span class="block min-w-0 truncate text-left">{{ selectedCompanyIds.length }} de {{ companies.length }} empresas</span></template></USelectMenu></UFormField>
          <UFormField label="Desde"><UInput v-model="filters.date_from" type="date" class="w-full" :disabled="loadingSummary" @update:model-value="clearResults" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="filters.date_to" type="date" class="w-full" :disabled="loadingSummary" @update:model-value="clearResults" /></UFormField>
          <UFormField label="Estados de OV"><USelectMenu v-model="selectedStatuses" :items="ovStatusOptions" value-key="value" multiple class="w-full" :disabled="loadingSummary"><template #default><span class="block min-w-0 truncate text-left">{{ statusLabel }}</span></template></USelectMenu></UFormField>
          <UFormField label="Buscar"><UInput v-model="filters.search" icon="i-lucide-search" placeholder="Producto, SKU, cliente, OV..." class="w-full" :disabled="loadingSummary" @keydown.enter="generateReport" /></UFormField>
          <UButton label="Generar" icon="i-lucide-file-chart-column" class="w-full justify-center xl:w-auto" :loading="loadingSummary" :disabled="!canGenerate || loadingCompanies" @click="generateReport" />
        </div>
        <p v-if="filters.date_from > filters.date_to" class="mt-2 text-xs text-error">La fecha inicial debe ser anterior o igual a la fecha final.</p>
        <p class="mt-2 flex items-start gap-2 text-xs text-muted"><UIcon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-primary" /><span>Neto = importe guardado en la OV. El IVA suma solo impuestos de tipo IVA registrados en cada renglón; si falta ese detalle se muestra $0 y la diferencia contra el total de la OV queda visible. Las monedas no se convierten.</span></p>
      </section>

      <UAlert v-if="summaryError" color="error" variant="soft" title="No se pudo generar el reporte" :description="summaryError" icon="i-lucide-triangle-alert" />
      <div v-if="loadingSummary" class="space-y-2"><USkeleton class="h-10 w-full" /><USkeleton class="h-10 w-full" /><USkeleton class="h-24 w-full" /></div>

      <template v-if="summary && !loadingSummary">
        <section class="rounded-xl border border-default bg-elevated/20 p-3 sm:p-4">
          <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><h2 class="font-semibold text-highlighted">Resumen por empresa</h2><p class="mt-0.5 text-xs text-muted">{{ summary.period.from }} al {{ summary.period.to }} · {{ summary.companies.length }} empresas · Hacé clic en una empresa para abrir sus categorías y puntos de venta.</p></div>
            <UBadge color="primary" variant="subtle">OV {{ summary.criteria.ov_statuses.join(', ') }}</UBadge>
          </div>
          <div v-if="!summaryRows.length" class="rounded-lg border border-dashed border-default px-4 py-8 text-center text-sm text-muted">No hay OV para las empresas, fechas y estados seleccionados.</div>
          <div v-else class="min-w-0 overflow-x-auto">
            <AsteriskTable compact hide-toolbar hide-footer storage-key="sales-products-company-summary" :data="summaryRows" :columns="summaryColumns" :get-row-id="(row: CompanyCurrencyRow) => row.id" :table-min-width="1200" />
          </div>
          <div v-if="summary.totals.length" class="mt-3 flex flex-wrap gap-2 border-t border-default pt-3">
            <div v-for="total in summary.totals" :key="total.currency_code" class="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs tabular-nums">
              <strong class="text-primary">Total seleccionado · {{ total.currency_code }}</strong><span>{{ formatNumber(total.document_count, 0) }} OVs</span><span>{{ formatNumber(total.line_count, 0) }} renglones</span><span>Neto {{ formatMoney(total.subtotal, total.currency_code) }}</span><span>IVA {{ formatMoney(total.vat, total.currency_code) }}</span><strong>Total {{ formatMoney(total.line_total, total.currency_code) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="activeCompanyRow" class="rounded-xl border border-default bg-elevated/20 p-3 sm:p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h2 class="font-semibold text-highlighted">{{ activeCompanyRow.company_name }} · {{ activeCompanyRow.currency_code }}</h2><p class="text-xs text-muted">{{ activeCompanyView === 'CATEGORY' ? 'Expandí una categoría y después un artículo para ver sus OVs debajo.' : 'Consultá el resumen y abrí los puntos de venta para revisar sus OVs.' }}</p></div>
            <div class="flex items-center gap-1 rounded-lg border border-default bg-muted/30 p-1" role="tablist" aria-label="Tipo de desglose">
              <UButton label="Productos por categoría" icon="i-lucide-list-tree" size="xs" :color="activeCompanyView === 'CATEGORY' ? 'primary' : 'neutral'" :variant="activeCompanyView === 'CATEGORY' ? 'soft' : 'ghost'" role="tab" :aria-selected="activeCompanyView === 'CATEGORY'" @click="activeCompanyView = 'CATEGORY'; activeDetail = null; detail = null" />
              <UButton label="Puntos de venta" icon="i-lucide-store" size="xs" :color="activeCompanyView === 'POINT_OF_SALE' ? 'primary' : 'neutral'" :variant="activeCompanyView === 'POINT_OF_SALE' ? 'soft' : 'ghost'" role="tab" :aria-selected="activeCompanyView === 'POINT_OF_SALE'" @click="activeCompanyView = 'POINT_OF_SALE'; closeProductExpansion(); activeDetail = null; detail = null" />
            </div>
          </div>
          <section v-if="activeCompanyView === 'CATEGORY'" class="min-w-0" role="tabpanel">
            <div class="mb-2 flex items-baseline justify-between gap-2"><h3 class="text-sm font-semibold text-highlighted">Productos por categoría</h3><span class="text-xs text-muted">{{ activeCompanyRow.categories.length }} categorías · {{ formatNumber(activeCompanyRow.line_count, 0) }} renglones</span></div>
            <div v-if="!activeCompanyRow.categories.length" class="rounded-md border border-dashed border-default p-4 text-center text-xs text-muted">Sin categorías en los filtros seleccionados.</div>
            <div v-else class="min-w-0 overflow-x-auto"><AsteriskTable compact hide-toolbar hide-footer storage-key="sales-products-company-category-tree" :data="productTreeRows" :columns="productTreeColumns" :get-row-id="(row: ProductTreeRow) => row.id" :table-min-width="1100" /></div>
          </section>
          <section v-else class="min-w-0" role="tabpanel">
            <div class="mb-2 flex items-baseline justify-between gap-2"><h3 class="text-sm font-semibold text-highlighted">Por punto de venta</h3><span class="text-xs text-muted">{{ activeCompanyRow.points_of_sale.length }} puntos</span></div>
            <div v-if="!activeCompanyRow.points_of_sale.length" class="rounded-md border border-dashed border-default p-4 text-center text-xs text-muted">Sin puntos de venta en los filtros seleccionados.</div>
            <div v-else class="min-w-0 overflow-x-auto"><AsteriskTable compact hide-toolbar hide-footer storage-key="sales-products-points-of-sale" :data="activeCompanyRow.points_of_sale" :columns="pointColumns" :get-row-id="(row: SalesProductsGroupRow) => row.key" :table-min-width="880" /></div>
          </section>
        </section>

        <section v-if="activeDetail" ref="detailSection" class="scroll-mt-24 rounded-xl border border-primary/25 bg-elevated/20 p-3 sm:p-4" aria-live="polite">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div class="flex flex-wrap items-center gap-2"><h2 class="font-semibold text-highlighted">{{ activeDetail.label }}</h2><UBadge color="primary" variant="subtle">Punto de venta</UBadge><UBadge color="neutral" variant="subtle">{{ activeDetail.currency_code }}</UBadge></div><p class="mt-0.5 text-xs text-muted">{{ activeDetail.company_name }} · Movimientos de OV del período · {{ detail?.total_rows ?? 0 }} renglones</p></div><UButton label="Cerrar detalle" icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="activeDetail = null; detail = null" /></div>
          <UAlert v-if="detailError" class="mb-3" color="error" variant="soft" title="No se pudo cargar el detalle" :description="detailError" />
          <div v-if="detailLoading && !detail" class="space-y-2"><USkeleton class="h-9 w-full" /><USkeleton class="h-9 w-full" /></div>
          <div v-else-if="detail && !detail.items.length" class="rounded-md border border-dashed border-default p-6 text-center text-sm text-muted">No hay renglones para este grupo.</div>
          <div v-else-if="detail" class="min-w-0 overflow-x-auto"><AsteriskTable compact server-side hide-toolbar storage-key="sales-products-company-movements" :data="detail.items" :columns="movementColumns" :get-row-id="(row: SalesProductsMovement) => row.id" :page-size="pageSize" :page="detailPage" :total-rows="detail.total_rows" :table-min-width="2150" @update:page="loadDetail" /></div>
        </section>
      </template>
    </div>
  </UPage>
</template>
