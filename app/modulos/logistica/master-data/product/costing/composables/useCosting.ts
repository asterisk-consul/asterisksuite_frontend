import { useCostingStore } from '../store/costing.store'
import { useCostTemplatesStore } from '../../cost-templates/store/cost-templates.store'
import type { CalculateProductCostDto, ParetoMode } from '../types/costing.types'

export const useCosting = (productId: string, currencyId: string) => {
  const costingStore = useCostingStore()
  const templatesStore = useCostTemplatesStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await Promise.all([costingStore.fetchHistory(productId), templatesStore.fetchAll()])
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = async (saveSnapshot = true) => {
    const dto: CalculateProductCostDto = {
      product_id: productId,
      currency_id: currencyId,
      save_snapshot: saveSnapshot
    }
    return costingStore.calculate(dto)
  }

  // =========================
  // PARETO
  // =========================

  const loadPareto = async (mode: ParetoMode = 'materials') => {
    return costingStore.fetchPareto(productId, currencyId, mode)
  }

  // =========================
  // FORMAT
  // =========================

  const formatCurrency = (value: string | number, symbol = '$') => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return `${symbol} 0,00`
    return `${symbol} ${new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  // =========================
  // TEMPLATE ASIGNADO
  // =========================

  const assignedTemplate = computed(() => {
    const snapshot = costingStore.latestSnapshot
    if (!snapshot?.cost_template_id) return null
    return templatesStore.templates.find((t) => t.id === snapshot.cost_template_id) ?? null
  })

  return {
    // store state
    history: computed(() => costingStore.history),
    pareto: computed(() => costingStore.pareto),
    lastCalculated: computed(() => costingStore.lastCalculated),

    loading: costingStore.loading,
    calculating: costingStore.calculating,
    error: costingStore.error,

    latestSnapshot: costingStore.latestSnapshot,

    latestCost: costingStore.latestCost,
    latestMaterialCost: costingStore.latestMaterialCost,
    latestLaborCost: costingStore.latestLaborCost,
    latestOverheadCost: costingStore.latestOverheadCost,

    hasHistory: costingStore.hasHistory,
    // template
    assignedTemplate,

    // actions
    init,
    calculate,
    loadPareto,

    // utils
    formatCurrency,
    formatPercentage
  }
}
