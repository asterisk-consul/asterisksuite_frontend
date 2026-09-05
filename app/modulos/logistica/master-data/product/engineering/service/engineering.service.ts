import type {
  EngineeringTreeNode,
  EngineeringCalculationResult,
  CreateEngineeringComponentDto
} from '~/modulos/logistica/master-data/product/engineering/types/engineering.types'

// engineering/services/engineering.service.ts
const urlBase = '/api/logistica/master-data/engineering'

export const useEngineeringService = () => {
  const getTree = (productId: string) => $fetch<EngineeringTreeNode[]>(`${urlBase}/${productId}/tree`)

  const calculate = (productId: string) =>
    $fetch<EngineeringCalculationResult>(`${urlBase}/${productId}/calculate`, {
      method: 'POST'
    })

  const createComponent = (dto: CreateEngineeringComponentDto) =>
    $fetch<EngineeringTreeNode>(`${urlBase}/components`, {
      method: 'POST',
      body: dto
    })

  const updateComponent = (id: string, dto: Partial<CreateEngineeringComponentDto>) =>
    $fetch<EngineeringTreeNode>(`${urlBase}/components/${id}`, {
      method: 'PATCH',
      body: dto
    })

  const deleteComponent = (id: string) =>
    $fetch<void>(`${urlBase}/components/${id}`, {
      method: 'DELETE'
    })

  const reorderComponents = (items: { id: string; order: number }[]) =>
    $fetch(`${urlBase}/components/reorder`, {
      method: 'PATCH',
      body: { items }
    })

  const moveComponent = (componentId: string, newParentProductId: string | null, productRootId: string) => {
    return $fetch(`${urlBase}/components/${componentId}/move`, {
      method: 'PATCH',
      body: {
        new_parent_product_id: newParentProductId,
        product_root_id: productRootId
      }
    })
  }

  return {
    getTree,
    calculate,
    createComponent,
    updateComponent,
    deleteComponent,
    reorderComponents,
    moveComponent
  }
}
