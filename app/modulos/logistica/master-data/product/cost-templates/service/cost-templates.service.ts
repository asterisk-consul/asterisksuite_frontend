import type {
  CostComponent,
  CostTemplate,
  CreateCostComponentDto,
  CreateCostTemplateDto,
  UpdateCostTemplateDto,
  UpdateTemplateComponentDto,
  AddTemplateComponentDto
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'

const urlBase = '/api/cost-templates'

export const useCostTemplatesService = () => {
  // =========================
  // COMPONENTS — GLOBAL
  // =========================

  const getComponents = () => {
    return $fetch<CostComponent[]>(`${urlBase}/components`)
  }

  const createComponent = (dto: CreateCostComponentDto) => {
    return $fetch<CostComponent>(`${urlBase}/components`, {
      method: 'POST',
      body: dto
    })
  }

  const updateComponent = (id: string, dto: Partial<CreateCostComponentDto>) => {
    return $fetch<CostComponent>(`${urlBase}/components/${id}`, {
      method: 'PATCH',
      body: dto
    })
  }

  const deleteComponent = (id: string) => {
    return $fetch<void>(`${urlBase}/components/${id}`, {
      method: 'DELETE'
    })
  }

  // =========================
  // TEMPLATES
  // =========================

  const getAll = () => {
    return $fetch<CostTemplate[]>(`${urlBase}`)
  }

  const getOne = (id: string) => {
    return $fetch<CostTemplate>(`${urlBase}/${id}`)
  }

  const create = (dto: CreateCostTemplateDto) => {
    return $fetch<CostTemplate>(`${urlBase}`, {
      method: 'POST',
      body: dto
    })
  }

  const update = (id: string, dto: UpdateCostTemplateDto) => {
    return $fetch<CostTemplate>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: dto
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  // =========================
  // COMPONENTS — IN TEMPLATE
  // =========================

  const addComponent = (templateId: string, dto: AddTemplateComponentDto) => {
    return $fetch<CostTemplate>(`${urlBase}/${templateId}/components`, {
      method: 'POST',
      body: dto
    })
  }

  const updateTemplateComponent = (templateId: string, componentId: string, dto: UpdateTemplateComponentDto) => {
    return $fetch<CostTemplate>(`${urlBase}/${templateId}/components/${componentId}`, { method: 'PATCH', body: dto })
  }

  const removeTemplateComponent = (templateId: string, componentId: string) => {
    return $fetch<void>(`${urlBase}/${templateId}/components/${componentId}`, { method: 'DELETE' })
  }

  // =========================
  // ASSIGN TO PRODUCT
  // =========================

  const assignToProduct = (templateId: string, productId: string) => {
    return $fetch<{ id: string; name: string; sku: string | null; cost_template_id: string }>(
      `${urlBase}/${templateId}/products/${productId}`,
      { method: 'POST' }
    )
  }

  const removeFromProduct = (productId: string) => {
    return $fetch<{ id: string; name: string; sku: string | null; cost_template_id: null }>(
      `${urlBase}/products/${productId}`,
      { method: 'DELETE' }
    )
  }

  return {
    getComponents,
    createComponent,
    updateComponent,
    deleteComponent,
    getAll,
    getOne,
    create,
    update,
    remove,
    addComponent,
    updateTemplateComponent,
    removeTemplateComponent,
    assignToProduct,
    removeFromProduct
  }
}
