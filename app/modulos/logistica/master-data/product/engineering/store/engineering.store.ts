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
  // CALCULATE
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

      // Refrescar árbol después de agregar componente
      await fetchTree(dto.parent_product_id)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear componente'
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
    fetchTree,
    calculate,
    createComponent,
    reset
  }
})
