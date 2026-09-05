import type {
  CostComponent,
  CostTemplate,
  CreateCostComponentDto,
  CreateCostTemplateDto,
  UpdateCostTemplateDto,
  UpdateTemplateComponentDto,
  AddTemplateComponentDto
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'

const urlBase = '/api/logistica/master-data/cost-templates'

export const useCostTemplatesService = () => {
  // COMPONENTS — GLOBAL
  const getComponents = () => $fetch<CostComponent[]>(`${urlBase}/components`) // GET    components/index.get.ts

  const createComponent = (dto: CreateCostComponentDto) =>
    $fetch<CostComponent>(`${urlBase}/components`, { method: 'POST', body: dto }) // POST   components/index.post.ts

  const updateComponent = (id: string, dto: Partial<CreateCostComponentDto>) =>
    $fetch<CostComponent>(`${urlBase}/components/${id}`, { method: 'PATCH', body: dto }) // PATCH  components/[id]/index.patch.ts

  const deleteComponent = (id: string) => $fetch<void>(`${urlBase}/components/${id}`, { method: 'DELETE' }) // DELETE components/[id]/index.delete.ts

  // TEMPLATES
  const getAll = () => $fetch<CostTemplate[]>(`${urlBase}`) // GET    index.get.ts

  const getOne = (id: string) => $fetch<CostTemplate>(`${urlBase}/${id}`) // GET    [id].get.ts

  const create = (dto: CreateCostTemplateDto) => $fetch<CostTemplate>(`${urlBase}`, { method: 'POST', body: dto }) // POST   index.post.ts

  const update = (id: string, dto: UpdateCostTemplateDto) =>
    $fetch<CostTemplate>(`${urlBase}/${id}`, { method: 'PATCH', body: dto }) // PATCH  [id].patch.ts

  const remove = (id: string) => $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' }) // DELETE [id].delete.ts

  // COMPONENTS — IN TEMPLATE
  const addComponent = (templateId: string, dto: AddTemplateComponentDto) =>
    $fetch<CostTemplate>(`${urlBase}/${templateId}/components`, { method: 'POST', body: dto }) // POST   [templateId]/components/index.post.ts

  const updateTemplateComponent = (templateId: string, componentId: string, dto: UpdateTemplateComponentDto) =>
    $fetch<CostTemplate>(`${urlBase}/${templateId}/components/${componentId}`, { method: 'PATCH', body: dto }) // PATCH  [templateId]/components/[componentId].patch.ts

  const removeTemplateComponent = (templateId: string, componentId: string) =>
    $fetch<void>(`${urlBase}/${templateId}/components/${componentId}`, { method: 'DELETE' }) // DELETE [templateId]/components/[componentId].delete.ts

  // ASSIGN TO PRODUCT
  const assignToProduct = (templateId: string, productId: string) =>
    $fetch<{ id: string; name: string; sku: string | null; cost_template_id: string }>(
      `${urlBase}/${templateId}/products/${productId}`,
      { method: 'POST' } // POST   [templateId]/products/[productId].post.ts
    )

  const removeFromProduct = (productId: string) =>
    $fetch<{ id: string; name: string; sku: string | null; cost_template_id: null }>(
      `${urlBase}/products/${productId}/template`,
      { method: 'DELETE' } // DELETE products/[productId]/template.delete.ts
    )

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
