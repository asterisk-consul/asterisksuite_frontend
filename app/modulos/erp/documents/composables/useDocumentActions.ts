import type { Ref, ComputedRef } from 'vue'
import { getStatusLabel, getStatusColor, getValidTransitions } from '~/modulos/erp/documents/types/document-statuses'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

type Doc = Record<string, any> | null

type DocumentActionsConfig = {
  doc: Ref<Doc>
  category: ComputedRef<string | undefined>
  router: ReturnType<typeof useRouter>
  store: {
    confirm: (id: string) => Promise<any>
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
}

export function useDocumentActions(config: DocumentActionsConfig) {
  const { doc, category, router, store, routeId } = config
  const module = config.module ?? 'sales'

  const toast = useToast()
  const { hasPermission } = useRoles()
  const { isOwnerOrAdmin } = useCompanyRole()

  // ─── State ──────────────────────────────────────────────
  const processing = ref(false)
  const confirmModalOpen = ref(false)
  const cancelModalOpen = ref(false)
  const statusModalOpen = ref(false)
  const acceptModalOpen = ref(false)
  const deliverModalOpen = ref(false)

  // ─── Derived ────────────────────────────────────────────
  const isDraft = computed(() => doc.value?.status === 0)
  const isPending = computed(() => doc.value?.status === 1)
  const isConfirmed = computed(() => doc.value?.status === 2)

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
    return hasDraft ? 'partial' : 'invoiced'
  })

  const id = computed(() => typeof routeId === 'string' ? routeId : routeId.value)

  // ─── Primary Actions ────────────────────────────────────
  const primaryActions = computed(() => {
    const items: any[] = []

    if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.update'))) {
      items.push({
        label: 'Editar',
        icon: 'i-lucide-pencil',
        help: 'Permite modificar los datos del documento. Solo disponible mientras esté en borrador.',
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
      onClick: () => { document.dispatchEvent(new CustomEvent('print-document')) }
    })

    if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.confirm'))) {
      items.push({
        label: 'Confirmar',
        icon: 'i-lucide-check-circle',
        color: 'success',
        help: 'Confirma el documento fiscalmente.',
        onClick: () => { confirmModalOpen.value = true }
      })
    }

    // Cobrar: factura confirmada sin cobro asociado
    if (isConfirmed.value && module === 'sales' && category.value === 'INVOICE'
      && doc.value?.party_id && !doc.value?.payment_documents?.length) {
      items.push({
        label: 'Cobrar',
        icon: 'i-lucide-wallet',
        color: 'success',
        help: 'Creá un cobro para esta factura.',
        onClick: () => {
          router.push(`/erp/treasury/payments/create?party_id=${doc.value!.party_id}&document_id=${doc.value!.id}&type=COLLECTION`)
        }
      })
    }

    // Pagar: factura confirmada sin pago asociado (compras)
    if (isConfirmed.value && module === 'purchases' && category.value === 'INVOICE'
      && doc.value?.party_id && !doc.value?.payment_documents?.length) {
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

    if (isDraft.value && (isOwnerOrAdmin.value || hasPermission('documents.cancel'))) {
      items.push([{ label: 'Anular', icon: 'i-lucide-x-circle', color: 'error', onClick: () => { cancelModalOpen.value = true } }])
    }

    if (validTransitions.value.length > 0) {
      items.push([{ label: 'Cambiar estado', icon: 'i-lucide-arrow-right-circle', color: 'primary', onClick: () => { statusModalOpen.value = true } }])
    }

    // Sales-specific: Aceptar → OV
    if (category.value === 'QUOTE' && isConfirmed.value && module === 'sales') {
      items.push([{ label: 'Aceptar → OV', icon: 'i-lucide-check-circle', color: 'success', onClick: () => { acceptModalOpen.value = true } }])
    }

    // Sales-specific: Despachar → Remito
    if (category.value === 'ORDER' && isConfirmed.value && module === 'sales') {
      items.push([{ label: 'Despachar → Remito', icon: 'i-lucide-truck', color: 'success', onClick: () => { deliverModalOpen.value = true } }])
    }

    // Crear Factura (from ORDER active or REMITO confirmed)
    const isOrderActive = category.value === 'ORDER' && doc.value?.status >= 1 && doc.value?.status < 7
    const isRemitoConfirmed = category.value === 'REMITO' && isConfirmed.value
    if ((isOrderActive || isRemitoConfirmed) && (isOwnerOrAdmin.value || hasPermission(`${module === 'sales' ? 'sales' : 'purchases'}.create`))) {
      const createUrl = module === 'sales'
        ? `/erp/sales/new?category=INVOICE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?parent_order_id=${id.value}`
      items.push([{ label: 'Crear Factura', icon: 'i-lucide-file-text', color: 'info', onClick: () => router.push(createUrl) }])
    }

    // Crear NC/ND (from INVOICE confirmed)
    if (isConfirmed.value && category.value === 'INVOICE' && (isOwnerOrAdmin.value || hasPermission(`${module === 'sales' ? 'sales' : 'purchases'}.create`))) {
      const ncUrl = module === 'sales'
        ? `/erp/sales/new?category=CREDIT_NOTE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?category=CREDIT_NOTE&parent_order_id=${id.value}`
      const ndUrl = module === 'sales'
        ? `/erp/sales/new?category=DEBIT_NOTE&parent_order_id=${id.value}`
        : `/erp/purchases/purchases-documents/new?category=DEBIT_NOTE&parent_order_id=${id.value}`
      items.push([{ label: 'Crear NC', icon: 'i-lucide-file-text', color: 'warning', onClick: () => router.push(ncUrl) }])
      items.push([{ label: 'Crear ND', icon: 'i-lucide-file-text', color: 'info', onClick: () => router.push(ndUrl) }])
    }

    // Cuenta corriente
    if (isConfirmed.value && doc.value?.party_id && ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(doc.value?.document_types?.category)) {
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
      await store.confirm(id.value)
      await store.fetchOne(id.value)
      toast.add({ title: 'Documento confirmado', color: 'success' })
      confirmModalOpen.value = false
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
