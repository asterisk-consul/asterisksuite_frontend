import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCostingService } from '~/modulos/logistica/master-data/product/costing/service/costing.service'
import type {
  CalculatedCost,
  CalculateProductCostDto,
  CostHistoryRow,
  CostParetoResult,
  ParetoMode
} from '../types/costing.types'

export const useCostingStore = defineStore('costing', () => {
  const service = useCostingService()

  // =========================
  // STATE
  // =========================

  const history = ref<CostHistoryRow[]>([])
  const pareto = ref<CostParetoResult | null>(null)
  const lastCalculated = ref<CalculatedCost | null>(null)
  const loading = ref(false)
  const calculating = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // COMPUTED
  // =========================

  const latestSnapshot = computed(() => history.value[0] ?? null)

  const latestCost = computed(() => (latestSnapshot.value ? Number(latestSnapshot.value.total_cost) : 0))

  const latestMaterialCost = computed(() => (latestSnapshot.value ? Number(latestSnapshot.value.material_cost) : 0))

  const latestLaborCost = computed(() => (latestSnapshot.value ? Number(latestSnapshot.value.labor_cost) : 0))

  const latestOverheadCost = computed(() => (latestSnapshot.value ? Number(latestSnapshot.value.overhead_cost) : 0))

  const hasHistory = computed(() => history.value.length > 0)

  // =========================
  // FETCH HISTORY
  // =========================

  const fetchHistory = async (productId: string) => {
    try {
      loading.value = true
      error.value = null

      history.value = await service.getHistory(productId)
      console.log('history:', history.value)

      return history.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar historial de costos'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = async (dto: CalculateProductCostDto) => {
    try {
      calculating.value = true
      error.value = null

      const result = await service.calculate(dto)

      lastCalculated.value = result

      // Refrescar historial automáticamente si se guardó snapshot
      if (dto.save_snapshot !== false) {
        await fetchHistory(dto.product_id)
      }

      return result
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al calcular costo'
      throw err
    } finally {
      calculating.value = false
    }
  }

  // =========================
  // FETCH PARETO
  // =========================

  const fetchPareto = async (productId: string, currencyId: string, mode: ParetoMode = 'materials') => {
    try {
      loading.value = true
      error.value = null

      pareto.value = await service.getPareto(productId, currencyId, mode)

      return pareto.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar pareto'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // RESET
  // =========================

  const reset = () => {
    history.value = []
    pareto.value = null
    lastCalculated.value = null
    error.value = null
  }

  return {
    // state
    history,
    pareto,
    lastCalculated,
    loading,
    calculating,
    error,

    // computed
    latestSnapshot,
    latestCost,
    latestMaterialCost,
    latestLaborCost,
    latestOverheadCost,
    hasHistory,

    // actions
    fetchHistory,
    calculate,
    fetchPareto,
    reset
  }
})
