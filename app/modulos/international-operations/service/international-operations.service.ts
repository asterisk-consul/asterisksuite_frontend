import type {
  InternationalOperation,
  OperationListResponse,
  OperationSummary,
  CreateOperationInput,
  UpdateOperationInput,
  InternationalContainer,
  CreateContainerInput,
  UpdateContainerInput,
  ContainerEvent,
  CreateEventInput
} from '~/modulos/international-operations/types/international-operations.types'

const baseUrl = '/api/international-operations'

export const useInternationalOperationsService = () => {
  const findAll = (params?: {
    status?: string
    supplier_id?: string
    search?: string
    page?: number
    limit?: number
  }) =>
    $fetch<OperationListResponse>(`${baseUrl}`, { query: params })

  const findOne = (id: string) =>
    $fetch<InternationalOperation>(`${baseUrl}/${id}`)

  const create = (payload: CreateOperationInput) =>
    $fetch<InternationalOperation>(`${baseUrl}`, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdateOperationInput) =>
    $fetch<InternationalOperation>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const updateStatus = (id: string, status: string) =>
    $fetch<InternationalOperation>(`${baseUrl}/${id}/status`, {
      method: 'PATCH',
      body: { status }
    })

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, { method: 'DELETE' })

  const getSummary = (id: string) =>
    $fetch<OperationSummary>(`${baseUrl}/${id}/summary`)

  const associateDocument = (operationId: string, documentId: string, expenseType?: string, containerId?: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/documents`, {
      method: 'POST',
      body: { document_id: documentId, expense_type: expenseType, container_id: containerId }
    })

  const disassociateDocument = (operationId: string, documentId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/documents/${documentId}`, {
      method: 'DELETE'
    })

  const associatePayment = (operationId: string, paymentId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/payments`, {
      method: 'POST',
      body: { payment_id: paymentId }
    })

  const disassociatePayment = (operationId: string, paymentId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/payments/${paymentId}`, {
      method: 'DELETE'
    })

  const associatePurchaseOrder = (operationId: string, documentId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/purchase-orders`, {
      method: 'POST',
      body: { document_id: documentId }
    })

  const disassociatePurchaseOrder = (operationId: string, documentId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/purchase-orders/${documentId}`, {
      method: 'DELETE'
    })

  const createContainer = (operationId: string, payload: CreateContainerInput) =>
    $fetch<InternationalContainer>(`${baseUrl}/${operationId}/containers`, {
      method: 'POST',
      body: payload
    })

  const findAllContainers = (operationId: string) =>
    $fetch<InternationalContainer[]>(`${baseUrl}/${operationId}/containers`)

  const findOneContainer = (containerId: string) =>
    $fetch<InternationalContainer>(`${baseUrl}/containers/${containerId}`)

  const updateContainer = (containerId: string, payload: UpdateContainerInput) =>
    $fetch<InternationalContainer>(`${baseUrl}/containers/${containerId}`, {
      method: 'PATCH',
      body: payload
    })

  const removeContainer = (containerId: string) =>
    $fetch<void>(`${baseUrl}/containers/${containerId}`, { method: 'DELETE' })

  const createEvent = (containerId: string, payload: CreateEventInput) =>
    $fetch<ContainerEvent>(`${baseUrl}/containers/${containerId}/events`, {
      method: 'POST',
      body: payload
    })

  const findAllEvents = (containerId: string) =>
    $fetch<ContainerEvent[]>(`${baseUrl}/containers/${containerId}/events`)

  const removeEvent = (eventId: string) =>
    $fetch<void>(`${baseUrl}/events/${eventId}`, { method: 'DELETE' })

  const associateQuote = (operationId: string, documentId: string) =>
    $fetch(`${baseUrl}/${operationId}/quotes`, { method: 'POST', body: { document_id: documentId } })

  const updateQuoteStatus = (operationId: string, quoteId: string, status: string) =>
    $fetch(`${baseUrl}/${operationId}/quotes/${quoteId}/status`, { method: 'PATCH', body: { status } })

  const disassociateQuote = (operationId: string, quoteId: string) =>
    $fetch<void>(`${baseUrl}/${operationId}/quotes/${quoteId}`, { method: 'DELETE' })

  return {
    findAll,
    findOne,
    create,
    update,
    updateStatus,
    remove,
    getSummary,
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
    findAllContainers,
    findOneContainer,
    updateContainer,
    removeContainer,
    createEvent,
    findAllEvents,
    removeEvent
  }
}
