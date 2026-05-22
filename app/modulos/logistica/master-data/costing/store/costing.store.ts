import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useCostingService } from '~/modulos/logistica/master-data/costing/service/costing.service'

import type {
  ProductCostCalculation,
  ProductCostHistory,
  CalculateProductCostInput
} from '~/modulos/logistica/master-data/costing/types/costing.types'

export const useCostingStore = defineStore('costing', () => {
  const service = useCostingService()

  const currentCalculation = ref<ProductCostCalculation | null>(null)

  const history = ref<ProductCostHistory[]>([])

  const loading = ref(false)

  // =========================
  // COMPUTEDS
  // =========================

  const latestCost = computed(() => history.value?.[0]?.total_cost ?? 0)

  const latestMaterialCost = computed(
    () => history.value?.[0]?.material_cost ?? 0
  )

  const latestLaborCost = computed(() => history.value?.[0]?.labor_cost ?? 0)

  const latestOverheadCost = computed(
    () => history.value?.[0]?.overhead_cost ?? 0
  )

  // =========================
  // CALCULATE
  // =========================

  const calculate = async (payload: CalculateProductCostInput) => {
    try {
      loading.value = true

      const result = await service.calculate(payload)

      currentCalculation.value = result

      return result
    } finally {
      loading.value = false
    }
  }

  // =========================
  // HISTORY
  // =========================

  const fetchHistory = async (productId: string) => {
    try {
      loading.value = true

      const result = await service.getHistory(productId)

      history.value = result

      return result
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    currentCalculation,
    history,
    loading,

    // computed
    latestCost,
    latestMaterialCost,
    latestLaborCost,
    latestOverheadCost,

    // actions
    calculate,
    fetchHistory
  }
})
