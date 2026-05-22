import type {
  ProductCostHistory,
  ProductCostCalculation,
  CalculateProductCostInput
} from '~/modulos/logistica/master-data/costing/types/costing.types'

const urlBase = '/api/logistica/master-data/costing'

export const useCostingService = () => {
  // =========================
  // CALCULATE
  // =========================

  const calculate = (data: CalculateProductCostInput) => {
    return $fetch<ProductCostCalculation>(`${urlBase}/calculate`, {
      method: 'POST',
      body: data
    })
  }

  // =========================
  // HISTORY
  // =========================

  const getHistory = (productId: string) => {
    return $fetch<ProductCostHistory[]>(`${urlBase}/${productId}/history`)
  }

  return {
    calculate,
    getHistory
  }
}
