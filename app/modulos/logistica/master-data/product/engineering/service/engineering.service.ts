import type {
  EngineeringTreeNode,
  EngineeringCalculationResult,
  CreateEngineeringComponentDto
} from '~/modulos/logistica/master-data/product/engineering/types/engineering.types'

// engineering/services/engineering.service.ts
const urlBase = '/api/backend/master-data/engineering'

export const useEngineeringService = () => {
  const getTree = (productId: string, variantId?: string, currencyId?: string) => $fetch<EngineeringTreeNode[]>(`${urlBase}/tree/${productId}`, {
    query: { variantId, currencyId }
  })

  const calculate = (productId: string, variantId?: string) =>
    $fetch<EngineeringCalculationResult>(`${urlBase}/calculate/${productId}`, {
      method: 'POST',
      query: variantId ? { variantId } : undefined
    })

  const customizeVariantStructure = (productId: string, variantId: string) =>
    $fetch<{ customized: boolean, component_count: number }>(`${urlBase}/tree/${productId}/variants/${variantId}/customize`, { method: 'POST' })

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
    customizeVariantStructure,
    createComponent,
    updateComponent,
    deleteComponent,
    reorderComponents,
    moveComponent
  }
}
