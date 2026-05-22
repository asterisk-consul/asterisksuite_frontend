import type {
  EngineeringTree,
  EngineeringCalculation,
  CreateEngineeringComponentInput
} from '~/modulos/logistica/master-data/engineering/types/engineering.types'

const urlBase = '/api/erp/engineering'

export const useEngineeringService = () => {
  // =========================
  // CREATE COMPONENT
  // =========================

  const createComponent = (data: CreateEngineeringComponentInput) => {
    return $fetch(`${urlBase}/components`, {
      method: 'POST',
      body: data
    })
  }

  // =========================
  // TREE
  // =========================

  const getEngineeringTree = (productId: string) => {
    return $fetch<EngineeringTree>(`${urlBase}/tree/${productId}`)
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = (productId: string) => {
    return $fetch<EngineeringCalculation>(`${urlBase}/calculate/${productId}`, {
      method: 'POST'
    })
  }

  return {
    createComponent,
    getEngineeringTree,
    calculate
  }
}
