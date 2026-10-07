import type {
  CalculatedCost,
  CalculateProductCostDto,
  CostHistoryRow,
  CostParetoResult,
  ParetoMode
} from '~/modulos/logistica/master-data/product/costing/types/costing.types'

const urlBase = '/api/backend/master-data/costing'

export const useCostingService = () => {
  // =========================
  // CALCULATE
  // =========================

  const calculate = (dto: CalculateProductCostDto) => {
    return $fetch<CalculatedCost>(`${urlBase}/calculate`, {
      method: 'POST',
      body: dto
    })
  }

  const setManualCost = (productId: string, data: { current_cost: number, currency_id: string, notes?: string }) =>
    $fetch(`${urlBase}/${productId}/manual-cost`, { method: 'POST', body: { ...data, cost_source: 'MANUAL' } })

  // =========================
  // HISTORY
  // =========================

  const getHistory = (productId: string) => {
    return $fetch<CostHistoryRow[]>(`${urlBase}/${productId}/history`)
  }

  // =========================
  // PARETO
  // =========================

  const getPareto = (productId: string, currencyId: string, mode: ParetoMode = 'materials') => {
    return $fetch<CostParetoResult>(`${urlBase}/${productId}/pareto`, {
      query: { currencyId, mode }
    })
  }

  return {
    calculate,
    setManualCost,
    getHistory,
    getPareto
  }
}
