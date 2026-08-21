import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEngineeringService } from '~/modulos/logistica/master-data/product/engineering/service/engineering.service'
import type {
  EngineeringTreeNode,
  EngineeringCalculationResult,
  CreateEngineeringComponentDto
} from '../types/engineering.types'

export const useEngineeringStore = defineStore('engineering', () => {
  const service = useEngineeringService()

  // =========================
  // STATE
  // =========================

  const tree = ref<EngineeringTreeNode[]>([])
  const calculation = ref<EngineeringCalculationResult | null>(null)
  const loading = ref(false)
  const calculating = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // FETCH TREE
  // =========================

  const fetchTree = async (productId: string) => {
    try {
      loading.value = true
      error.value = null

      tree.value = await service.getTree(productId)

      return tree.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar árbol de ingeniería'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CALCULATE (solo para snapshot de costing)
  // =========================

  const calculate = async (productId: string) => {
    try {
      calculating.value = true
      error.value = null

      const result = await service.calculate(productId)
      calculation.value = result

      return result
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al calcular ingeniería'
      throw err
    } finally {
      calculating.value = false
    }
  }

  // =========================
  // CREATE COMPONENT
  // =========================

  const createComponent = async (dto: CreateEngineeringComponentDto) => {
    try {
      loading.value = true
      error.value = null

      const created = await service.createComponent(dto)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const reorder = async (items: { id: string; order: number }[]) => {
    try {
      loading.value = true
      error.value = null
      return await service.reorderComponents(items)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al reordenar'
      throw err
    } finally {
      loading.value = false
    }
  }

  const moveComponent = async (componentId: string, newParentProductId: string | null, productRootId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await service.moveComponent(componentId, newParentProductId, productRootId)
      await fetchTree(productRootId)
      return result
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al mover componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateComponent = async (id: string, dto: Partial<CreateEngineeringComponentDto>, parentProductId: string) => {
    try {
      loading.value = true
      error.value = null
      const updated = await service.updateComponent(id, dto)
      await fetchTree(parentProductId)
      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteComponent = async (id: string, parentProductId: string) => {
    try {
      loading.value = true
      error.value = null
      await service.deleteComponent(id)
      await fetchTree(parentProductId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // RESET
  // =========================

  const reset = () => {
    tree.value = []
    calculation.value = null
    error.value = null
  }

  return {
    // state
    tree,
    calculation,
    loading,
    calculating,
    error,

    // actions
    moveComponent,
    updateComponent,
    deleteComponent,
    reorder,
    fetchTree,
    calculate,
    createComponent,
    reset
  }
})
