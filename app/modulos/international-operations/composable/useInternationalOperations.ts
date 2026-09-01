import { computed } from 'vue'
import { useInternationalOperationsStore } from '../store/international-operations.store'
import { formatDate } from '~/utils/dates'
import type {
  InternationalOperation,
  OperationStatus,
  ContainerStatus,
  CreateOperationInput,
  UpdateOperationInput,
  CreateContainerInput,
  UpdateContainerInput,
  CreateEventInput,
  InternationalExpenseType,
  ContainerType
} from '~/modulos/international-operations/types/international-operations.types'

export function useInternationalOperations() {
  const store = useInternationalOperationsStore()

  const init = async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    await store.fetchAll(params)
  }

  const create = async (payload: CreateOperationInput) => store.create(payload)
  const update = async (id: string, payload: UpdateOperationInput) => store.update(id, payload)
  const updateStatus = async (id: string, status: string) => store.updateStatus(id, status)
  const remove = async (id: string) => store.remove(id)
  const fetchOne = async (id: string) => store.fetchOne(id)
  const fetchSummary = async (id: string) => store.fetchSummary(id)

  const associateDocument = async (opId: string, docId: string, expenseType?: InternationalExpenseType, containerId?: string) => store.associateDocument(opId, docId, expenseType, containerId)
  const disassociateDocument = async (opId: string, docId: string) => store.disassociateDocument(opId, docId)
  const associatePayment = async (opId: string, payId: string) => store.associatePayment(opId, payId)
  const disassociatePayment = async (opId: string, payId: string) => store.disassociatePayment(opId, payId)
  const associatePurchaseOrder = async (opId: string, docId: string) => store.associatePurchaseOrder(opId, docId)
  const disassociatePurchaseOrder = async (opId: string, docId: string) => store.disassociatePurchaseOrder(opId, docId)

  const associateQuote = async (opId: string, docId: string) => store.associateQuote(opId, docId)
  const updateQuoteStatus = async (opId: string, quoteId: string, status: string) => store.updateQuoteStatus(opId, quoteId, status)
  const disassociateQuote = async (opId: string, quoteId: string) => store.disassociateQuote(opId, quoteId)

  const createContainer = async (opId: string, payload: CreateContainerInput) => store.createContainer(opId, payload)
  const findOneContainer = async (containerId: string) => store.findOneContainer(containerId)
  const updateContainer = async (containerId: string, payload: UpdateContainerInput) => store.updateContainer(containerId, payload)
  const removeContainer = async (containerId: string) => store.removeContainer(containerId)
  const createEvent = async (containerId: string, payload: CreateEventInput) => store.createEvent(containerId, payload)
  const removeEvent = async (eventId: string) => store.removeEvent(eventId)

  const statusOptions = [
    { label: 'Planificada', value: 'PLANNED', color: 'neutral' },
    { label: 'En Preparación', value: 'IN_PREPARATION', color: 'info' },
    { label: 'Embarcada', value: 'SHIPPED', color: 'info' },
    { label: 'En Tránsito', value: 'IN_TRANSIT', color: 'warning' },
    { label: 'Arribada', value: 'ARRIVED', color: 'warning' },
    { label: 'Aduana', value: 'CUSTOMS', color: 'primary' },
    { label: 'Liberada', value: 'RELEASED', color: 'success' },
    { label: 'Entregada', value: 'DELIVERED', color: 'success' },
    { label: 'Cerrada', value: 'CLOSED', color: 'success' },
    { label: 'Cancelada', value: 'CANCELLED', color: 'error' }
  ]

  const containerStatusOptions = [
    { label: 'Preparando', value: 'PREPARING', color: 'neutral' },
    { label: 'Cargado', value: 'LOADED', color: 'info' },
    { label: 'Embarcado', value: 'SHIPPED', color: 'info' },
    { label: 'En Tránsito', value: 'IN_TRANSIT', color: 'warning' },
    { label: 'Arribado', value: 'ARRIVED', color: 'warning' },
    { label: 'Aduana', value: 'CUSTOMS', color: 'primary' },
    { label: 'Liberado', value: 'RELEASED', color: 'success' },
    { label: 'Entregado', value: 'DELIVERED', color: 'success' },
    { label: 'Cerrado', value: 'CLOSED', color: 'success' }
  ]

  const containerTypeOptions = [
    { label: '20\' Dry Van', value: 'TWENTY_DV' },
    { label: '40\' Dry Van', value: 'FORTY_DV' },
    { label: '40\' High Cube', value: 'FORTY_HC' },
    { label: '45\' High Cube', value: 'FORTY_FIVE_HC' },
    { label: 'Otro', value: 'OTHER' }
  ]

  const containerTypeLabel = (type: ContainerType): string => {
    return containerTypeOptions.find((t) => t.value === type)?.label ?? type
  }

  const statusColor = (status: OperationStatus): string => {
    const map: Record<OperationStatus, string> = {
      PLANNED: 'neutral',
      IN_PREPARATION: 'info',
      SHIPPED: 'info',
      IN_TRANSIT: 'warning',
      ARRIVED: 'warning',
      CUSTOMS: 'primary',
      RELEASED: 'success',
      DELIVERED: 'success',
      CLOSED: 'success',
      CANCELLED: 'error'
    }
    return map[status] ?? 'neutral'
  }

  const containerStatusColor = (status: ContainerStatus): string => {
    const map: Record<ContainerStatus, string> = {
      PREPARING: 'neutral',
      LOADED: 'info',
      SHIPPED: 'info',
      IN_TRANSIT: 'warning',
      ARRIVED: 'warning',
      CUSTOMS: 'primary',
      RELEASED: 'success',
      DELIVERED: 'success',
      CLOSED: 'success'
    }
    return map[status] ?? 'neutral'
  }

  const statusLabel = (status: OperationStatus): string => {
    return statusOptions.find((s) => s.value === status)?.label ?? status
  }

  const containerStatusLabel = (status: ContainerStatus): string => {
    return containerStatusOptions.find((s) => s.value === status)?.label ?? status
  }

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const expenseTypeOptions = [
    { label: 'Mercadería', value: 'MERCHANDISE' },
    { label: 'Flete Internacional', value: 'INTERNATIONAL_FREIGHT' },
    { label: 'Seguro', value: 'INSURANCE' },
    { label: 'Despachante', value: 'CUSTOMS_BROKER' },
    { label: 'Agente Comercial', value: 'COMMERCIAL_AGENT' },
    { label: 'Gastos Portuarios', value: 'PORT_EXPENSE' },
    { label: 'Almacenaje', value: 'STORAGE' },
    { label: 'Transporte Interno', value: 'LOCAL_TRANSPORT' },
    { label: 'Derechos de Aduana', value: 'CUSTOMS_DUTIES' },
    { label: 'Nacionalización', value: 'NACIONALIZACION' },
    { label: 'Otros', value: 'OTHER' }
  ]

  const expenseTypeLabel = (type: InternationalExpenseType): string => {
    return expenseTypeOptions.find((e) => e.value === type)?.label ?? type
  }

  const statusDescriptions: Record<string, { label: string; description: string }> = {
    PLANNED: { label: 'Planificada', description: 'Cargada al sistema, aún sin preparación de mercadería.' },
    IN_PREPARATION: { label: 'En Preparación', description: 'Mercadería en depósito, pendiente de despacho al puerto de origen.' },
    SHIPPED: { label: 'Embarcada', description: 'La mercadería fue entregada al transportista en el puerto de origen.' },
    IN_TRANSIT: { label: 'En Tránsito', description: 'En viaje hacia el país de destino.' },
    ARRIVED: { label: 'Arribada', description: 'Llegó al puerto o punto de entrada del país de destino.' },
    CUSTOMS: { label: 'En Aduana', description: 'En proceso de despacho aduanero.' },
    RELEASED: { label: 'Liberada', description: 'Aduana liberada: lista para retiro o entrega.' },
    DELIVERED: { label: 'Entregada', description: 'Mercadería entregada al destinatario final.' },
    CLOSED: { label: 'Cerrada', description: 'Operación finalizada, sin acciones pendientes.' },
    CANCELLED: { label: 'Cancelada', description: 'Operación anulada: no se concretó.' }
  }

  const containerStatusDescriptions: Record<string, { label: string; description: string }> = {
    PREPARING: { label: 'Preparando', description: 'Cargando mercadería en el contenedor.' },
    LOADED: { label: 'Cargado', description: 'Contenedor lleno y precintado, listo para el embarque.' },
    SHIPPED: { label: 'Embarcado', description: 'A bordo del buque o transporte internacional.' },
    IN_TRANSIT: { label: 'En Tránsito', description: 'En viaje hacia el puerto de destino.' },
    ARRIVED: { label: 'Arribado', description: 'Llegó al puerto de destino.' },
    CUSTOMS: { label: 'En Aduana', description: 'En proceso de despacho aduanero.' },
    RELEASED: { label: 'Liberado', description: 'Autorizado por aduana, pronto a retirar.' },
    DELIVERED: { label: 'Entregado', description: 'Descargado en el depósito o destino final.' },
    CLOSED: { label: 'Cerrado', description: 'Ciclo completado: vacío devuelto o fuera de uso.' }
  }

  return {
    items: computed(() => store.items),
    current: computed(() => store.current),
    summary: computed(() => store.summary),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    pagination: computed(() => store.pagination),

    statusOptions,
    containerStatusOptions,
    containerTypeOptions,
    expenseTypeOptions,
    statusDescriptions,
    containerStatusDescriptions,
    statusColor,
    containerStatusColor,
    statusLabel,
    containerStatusLabel,
    containerTypeLabel,
    expenseTypeLabel,
    formatCurrency,
    formatDate,

    init,
    create,
    update,
    updateStatus,
    remove,
    fetchOne,
    fetchSummary,
    associateDocument,
    disassociateDocument,
    associatePayment,
    disassociatePayment,
    associatePurchaseOrder,
    disassociatePurchaseOrder,
    associateQuote,
    updateQuoteStatus,
    disassociateQuote,
    createContainer,
    findOneContainer,
    updateContainer,
    removeContainer,
    createEvent,
    removeEvent
  }
}
