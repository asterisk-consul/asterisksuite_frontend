import type { Ref, ComputedRef } from 'vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { useDocumentPermissions } from './useDocumentPermissions'

type Doc = Record<string, any> | null

type DocumentActionsConfig = {
  doc: Ref<Doc>
  category: ComputedRef<string | undefined>
  router: ReturnType<typeof useRouter>
  store: {
    confirm: (id: string, options?: { updateProductPrices?: boolean }) => Promise<any>
    cancel: (id: string) => Promise<any>
    changeStatus: (id: string, status: number) => Promise<any>
    fetchOne: (id: string) => Promise<any>
    accept?: (id: string) => Promise<any>
    deliver?: (id: string) => Promise<any>
  }
  routeId: string | ComputedRef<string>
  /** Module prefix for routing: 'sales' or 'purchases' */
  module?: 'sales' | 'purchases'
  /** Override default transitions from getValidTransitions */
  customTransitions?: Array<{ label: string; status: number; color: string }>
  /** Print function from usePrint() composable */
  printElement?: (elementId: string, options?: { title?: string; copies?: number }) => void
}

export function useDocumentActions(config: DocumentActionsConfig) {
  const { doc, category, router, store, routeId } = config
  const module = config.module ?? 'sales'

  const toast = useToast()
  const { can: canDocument } = useDocumentPermissions()

  // ─── State ──────────────────────────────────────────────
  const processing = ref(false)
  const confirmModalOpen = ref(false)
  const cancelModalOpen = ref(false)
  const statusModalOpen = ref(false)
  const acceptModalOpen = ref(false)
  const deliverModalOpen = ref(false)
  const updateProductPrices = ref(false)

  // ─── Derived ────────────────────────────────────────────
  const isDraft = computed(() => doc.value?.status === 0)
  const isPending = computed(() => doc.value?.status === 1)
  const isConfirmed = computed(() => doc.value?.status === 2)

  const operationAccountingApplies = computed(() => {
    const basis = doc.value?.commercial_operation?.accounting_basis
    if (!basis) return Boolean(doc.value?.document_types?.affects_accounting)
    if (category.value === 'ORDER') return ['ORDER', 'ORDER_THEN_INVOICE'].includes(basis)
    if (category.value === 'INVOICE') return ['INVOICE', 'ORDER_THEN_INVOICE'].includes(basis)
    return Boolean(doc.value?.document_types?.affects_accounting)
  })

  const operationPaymentApplies = computed(() => {
    const basis = doc.value?.commercial_operation?.payment_document_basis
    if (!basis) return Boolean(doc.value?.document_types?.affects_payment)
    if (basis === 'BOTH') return ['ORDER', 'INVOICE'].includes(category.value ?? '')
    return basis === category.value
  })

  const hasPendingBalance = computed(() => {
    const operation = doc.value?.commercial_operation
    const total = Number(operation?.ordered_total ?? doc.value?.total ?? 0)
    const paid = Number(operation?.paid_total ?? doc.value?.paid_amount ?? 0)
    return total - paid > 0.01
  })

  const settlementDocumentId = computed(() => {
    const operation = doc.value?.commercial_operation
    if (operation?.payment_document_basis === 'BOTH' && category.value === 'INVOICE') {
      return operation.root_document_id ?? doc.value?.id
    }
    return doc.value?.id
  })

  const validTransitions = computed(() => {
    if (config.customTransitions) return config.customTransitions
    if (!doc.value) return []
    return getValidTransitions(category.value, doc.value.status).map(s => ({
      label: getStatusLabel(category.value, s),
      status: s,
      color: getStatusColor(category.value, s),
    }))
  })

  const invoiceState = computed(() => {
    const children = doc.value?.child_documents ?? []
    const invoices = children.filter((c: any) => c.document_types?.category === 'INVOICE' && c.status >= 1)
    if (!invoices.length) return null
    const hasDraft = invoices.some((c: any) => c.status < 2)
    if (hasDraft) return 'partial'

    const operation = doc.value?.commercial_operation
    const orderedTotal = Number(operation?.ordered_total ?? doc.value?.total ?? 0)
    const invoicedTotal = Number(operation?.invoiced_total ?? invoices.reduce((sum: number, invoice: any) => sum + Number(invoice.total ?? 0), 0))
    return invoicedTotal + 0.01 >= orderedTotal ? 'invoiced' : 'partial'
  })

  // Number of print copies: facturas/OV=2 (DUPLICADO+ORIGINAL), remitos=3 (TRIPLICADO+DUPLICADO+ORIGINAL)
  const copyCount = computed(() => {
    const cat = category.value
    if (['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'ORDER'].includes(cat)) return 2
    if (cat === 'REMITO') return 3
    return 1
  })

  const id = computed(() => typeof routeId === 'string' ? routeId : routeId.value)

  // ─── Primary Actions ────────────────────────────────────
  const primaryActions = computed(() => {
    const items: any[] = []

    if ((isDraft.value || isPending.value) && canDocument(module, category.value, 'update')) {
      items.push({
        label: 'Editar',
        icon: 'i-lucide-pencil',
        help: 'Permite modificar los datos del documento. Solo disponible en borrador o pendiente.',
        onClick: () => {
          if (module === 'purchases') {
            router.push(`/erp/purchases/purchases-documents/${id.value}/edit`)
          } else {
            router.push(`/erp/sales/${id.value}/edit`)
          }
        }
      })
    }

    items.push({
      label: 'Imprimir',
      icon: 'i-lucide-printer',
      help: 'Abre una nueva ventana con la vista de impresión del documento.',
      onClick: () => {
        if (config.printElement) {
          config.printElement('printable-document', {
            title: doc.value?.document_types?.description ?? 'Documento',
            copies: copyCount.value,
          })
        }
      }
    })

    if (isDraft.value && canDocument(module, category.value, 'confirm')) {
      items.push({
        label: 'Confirmar',
        icon: 'i-lucide-check-circle',
        color: 'success',
        help: 'Confirma el documento fiscalmente.',
        onClick: () => { confirmModalOpen.value = true }
      })
    }

    // En una operación configurada, OV y factura pueden cobrar contra un único saldo.
    if (isConfirmed.value && module === 'sales' && operationPaymentApplies.value
      && doc.value?.party_id && hasPendingBalance.value) {
      items.push({
        label: 'Registrar cobro',
        icon: 'i-lucide-wallet',
        color: 'success',
        help: 'El cobro se descuenta del saldo único de la operación comercial.',
        onClick: () => {
          router.push(`/erp/treasury/payments/create?party_id=${doc.value!.party_id}&document_id=${settlementDocumentId.value}&type=COLLECTION`)
        }
      })
    }

    // Pagar: factura confirmada sin pago asociado (compras)
    if (isConfirmed.value && module === 'purchases' && category.value === 'INVOICE'
      && operationPaymentApplies.value && doc.value?.party_id && hasPendingBalance.value) {
      items.push({
        label: 'Pagar',
        icon: 'i-lucide-wallet',
        color: 'success',
        help: 'Creá un pago para esta factura.',
        onClick: () => {
          router.push(`/erp/treasury/payments/create?party_id=${doc.value!.party_id}&document_id=${doc.value!.id}&type=PAYMENT`)
        }
      })
    }

    return items
  })

  // ─── Secondary Actions ──────────────────────────────────
  const secondaryActions = computed(() => {
    const items: any[] = []
    const isOrderActive = category.value === 'ORDER' && doc.value?.status >= 1 && doc.value?.status < 7
    const canCreateRemito = canDocument(module, 'REMITO', 'create')
    const canCreateInvoice = canDocument(module, 'INVOICE', 'create')

    if (isDraft.value && canDocument(module, category.value, 'cancel')) {
      items.push([{ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onClick: () => { cancelModalOpen.value = true } }])
    }

    if (validTransitions.value.length > 0 && canDocument(module, category.value, 'update')) {
      items.push([{ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', onClick: () => { statusModalOpen.value = true } }])
    }

    // Sales-specific: Aceptar → OV
    if (category.value === 'QUOTE' && isConfirmed.value && module === 'sales' && canDocument('sales', 'QUOTE', 'update') && canDocument('sales', 'ORDER', 'create')) {
      items.push([{ label: 'Aceptar → OV', icon: 'i-lucide-check-circle', color: 'success', onClick: () => { acceptModalOpen.value = true } }])
    }

    // Desde una OV activa se puede elegir Remito o Factura.
    if (isOrderActive && module === 'sales' && canCreateRemito) {
      items.push([{ label: 'Crear Remito', icon: 'i-lucide-truck', color: 'success', onClick: () => { deliverModalOpen.value = true } }])
    }

    // Por defecto la factura nace desde la OV. Un remito no origina facturas.
    if (isOrderActive && canCreateInvoice) {
      const createUrl = module === 'sales'
        ? `/erp/sales/new?category=INVOICE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?parent_order_id=${id.value}`
      items.push([{ label: 'Crear Factura', icon: 'i-lucide-file-text', color: 'info', onClick: () => router.push(createUrl) }])
    }

    // Crear NC/ND (from INVOICE confirmed)
    if (isConfirmed.value && category.value === 'INVOICE') {
      const ncUrl = module === 'sales'
        ? `/erp/sales/new?category=CREDIT_NOTE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?category=CREDIT_NOTE&parent_order_id=${id.value}`
      const ndUrl = module === 'sales'
        ? `/erp/sales/new?category=DEBIT_NOTE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?category=DEBIT_NOTE&parent_order_id=${id.value}`
      if (canDocument(module, 'CREDIT_NOTE', 'create')) items.push([{ label: 'Crear NC', icon: 'i-lucide-file-text', color: 'warning', onClick: () => router.push(ncUrl) }])
      if (canDocument(module, 'DEBIT_NOTE', 'create')) items.push([{ label: 'Crear ND', icon: 'i-lucide-file-text', color: 'info', onClick: () => router.push(ndUrl) }])
    }

    // Cuenta corriente
    if (isConfirmed.value && doc.value?.party_id && operationAccountingApplies.value) {
      items.push([{
        label: 'Cuenta corriente',
        icon: 'i-lucide-arrow-right-circle',
        color: 'primary',
        onClick: () => {
          const currency = doc.value!.currency_code ?? 'ARS'
          router.push(`/erp/treasury/current-accounts/${doc.value!.party_id}?currency=${currency}`)
        }
      }])
    }

    return items
  })

  // ─── Handlers ───────────────────────────────────────────
  async function handleConfirm() {
    try {
      processing.value = true
      const options = updateProductPrices.value ? { updateProductPrices: true } : undefined
      await store.confirm(id.value, options)
      await store.fetchOne(id.value)
      toast.add({ title: 'Documento confirmado', color: 'success' })
      confirmModalOpen.value = false
      updateProductPrices.value = false
    } catch (e: any) {
      toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
    } finally { processing.value = false }
  }

  async function handleCancel() {
    try {
      processing.value = true
      await store.cancel(id.value)
      await store.fetchOne(id.value)
      toast.add({ title: 'Documento anulado', color: 'success' })
      cancelModalOpen.value = false
    } catch (e: any) {
      toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
    } finally { processing.value = false }
  }

  async function handleStatus(status: number) {
    try {
      processing.value = true
      await store.changeStatus(id.value, status)
      await store.fetchOne(id.value)
      toast.add({ title: 'Estado actualizado', color: 'success' })
      statusModalOpen.value = false
    } catch (e: any) {
      toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
    } finally { processing.value = false }
  }

  async function handleAccept() {
    if (!store.accept) return
    try {
      processing.value = true
      const newDoc = await store.accept(id.value)
      toast.add({ title: 'OV creada', color: 'success' })
      acceptModalOpen.value = false
      router.push(`/erp/orders/${newDoc.id}`)
    } catch (e: any) {
      toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
    } finally { processing.value = false }
  }

  async function handleDeliver() {
    if (!store.deliver) return
    try {
      processing.value = true
      const newDoc = await store.deliver(id.value)
      toast.add({ title: 'Remito creado', color: 'success' })
      deliverModalOpen.value = false
      router.push(`/erp/remitos/${newDoc.id}`)
    } catch (e: any) {
      toast.add({ title: 'Error', description: e?.data?.message, color: 'error' })
    } finally { processing.value = false }
  }

  return {
    // State
    processing,
    confirmModalOpen,
    cancelModalOpen,
    statusModalOpen,
    acceptModalOpen,
    deliverModalOpen,
    updateProductPrices,

    // Derived
    isDraft,
    isPending,
    isConfirmed,
    validTransitions,
    invoiceState,

    // Actions
    primaryActions,
    secondaryActions,

    // Handlers
    handleConfirm,
    handleCancel,
    handleStatus,
    handleAccept,
    handleDeliver,
  }
}
