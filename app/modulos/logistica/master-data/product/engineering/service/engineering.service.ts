import type {
  EngineeringTreeNode,
  EngineeringCalculationResult,
  CreateEngineeringComponentDto
} from '~/modulos/logistica/master-data/product/engineering/types/engineering.types'

const urlBase = '/api/engineering'

export const useEngineeringService = () => {
  // =========================
  // TREE
  // =========================

  const getTree = (productId: string) => {
    return $fetch<EngineeringTreeNode[]>(`${urlBase}/${productId}/tree`)
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = (productId: string) => {
    return $fetch<EngineeringCalculationResult>(`${urlBase}/${productId}/calculate`, { method: 'POST' })
  }

  // =========================
  // CREATE COMPONENT
  // =========================

  const createComponent = (dto: CreateEngineeringComponentDto) => {
    return $fetch<EngineeringTreeNode>(`${urlBase}/components`, {
      method: 'POST',
      body: dto
    })
  }

  return {
    getTree,
    calculate,
    createComponent
  }
}
