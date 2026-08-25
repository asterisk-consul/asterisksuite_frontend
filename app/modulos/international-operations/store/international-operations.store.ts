import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'
import type {
  InternationalOperation,
  OperationListResponse,
  OperationSummary,
  CreateOperationInput,
  UpdateOperationInput,
  InternationalContainer,
  CreateContainerInput,
  UpdateContainerInput,
  CreateEventInput,
  ContainerEvent,
  InternationalExpenseType
} from '~/modulos/international-operations/types/international-operations.types'

export const useInternationalOperationsStore = defineStore('international-operations', () => {
  const service = useInternationalOperationsService()

  const items = ref<InternationalOperation[]>([])
  const current = ref<InternationalOperation | null>(null)
  const summary = ref<OperationSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({ total: 0, page: 1, limit: 20, pages: 0 })

  const fetchAll = async (params?: {
    status?: string
    supplier_id?: string
    search?: string
    page?: number
    limit?: number
  }) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.findAll(params)
      items.value = data.items
      pagination.value = { total: data.total, page: data.page, limit: data.limit, pages: data.pages }
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar operaciones'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.findOne(id)
      current.value = data
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar operación'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchSummary = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.getSummary(id)
      summary.value = data
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar resumen'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (payload: CreateOperationInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.create(payload)
      items.value.unshift(created)
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear operación'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, payload: UpdateOperationInput) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.update(id, payload)
      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) items.value[index] = updated
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar operación'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.updateStatus(id, status)
      const index = items.value.findIndex((i) => i.id === id)
      if (index !== -1) items.value[index] = updated
      if (current.value?.id === id) current.value = updated
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cambiar estado'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await service.remove(id)
      items.value = items.value.filter((i) => i.id !== id)
      if (current.value?.id === id) current.value = null
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar operación'
      throw err
    } finally {
      loading.value = false
    }
  }

  const associateDocument = async (operationId: string, documentId: string, expenseType?: InternationalExpenseType, containerId?: string) => {
    try {
      loading.value = true
      error.value = null
      await service.associateDocument(operationId, documentId, expenseType, containerId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al asociar documento'
      throw err
    } finally {
      loading.value = false
    }
  }

  const disassociateDocument = async (operationId: string, documentId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.disassociateDocument(operationId, documentId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al desasociar documento'
      throw err
    } finally {
      loading.value = false
    }
  }

  const associatePayment = async (operationId: string, paymentId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.associatePayment(operationId, paymentId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al asociar pago'
      throw err
    } finally {
      loading.value = false
    }
  }

  const disassociatePayment = async (operationId: string, paymentId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.disassociatePayment(operationId, paymentId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al desasociar pago'
      throw err
    } finally {
      loading.value = false
    }
  }

  const associatePurchaseOrder = async (operationId: string, documentId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.associatePurchaseOrder(operationId, documentId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al asociar orden de compra'
      throw err
    } finally {
      loading.value = false
    }
  }

  const disassociatePurchaseOrder = async (operationId: string, documentId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.disassociatePurchaseOrder(operationId, documentId)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al desasociar orden de compra'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createContainer = async (operationId: string, payload: CreateContainerInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.createContainer(operationId, payload)
      if (current.value?.id === operationId) {
        await fetchOne(operationId)
      }
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear contenedor'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateContainer = async (containerId: string, payload: UpdateContainerInput) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.updateContainer(containerId, payload)
      if (current.value) {
        await fetchOne(current.value.id)
      }
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar contenedor'
      throw err
    } finally {
      loading.value = false
    }
  }

  const findOneContainer = async (containerId: string) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.findOneContainer(containerId)
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar contenedor'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeContainer = async (containerId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.removeContainer(containerId)
      if (current.value) {
        await fetchOne(current.value.id)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar contenedor'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createEvent = async (containerId: string, payload: CreateEventInput) => {
    try {
      loading.value = true
      error.value = null
      const created = await service.createEvent(containerId, payload)
      if (current.value) {
        await fetchOne(current.value.id)
      }
      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear evento'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeEvent = async (eventId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.removeEvent(eventId)
      if (current.value) {
        await fetchOne(current.value.id)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar evento'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    current,
    summary,
    loading,
    error,
    pagination,
    fetchAll,
    fetchOne,
    fetchSummary,
    create,
    update,
    updateStatus,
    remove,
    associateDocument,
    disassociateDocument,
    associatePayment,
    disassociatePayment,
    associatePurchaseOrder,
    disassociatePurchaseOrder,
    createContainer,
    findOneContainer,
    updateContainer,
    removeContainer,
    createEvent,
    removeEvent
  }
})
