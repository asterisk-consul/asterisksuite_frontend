import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCostTemplatesService } from '~/modulos/logistica/master-data/product/cost-templates/service/cost-templates.service'
import type {
  CostComponent,
  CostTemplate,
  CreateCostComponentDto,
  CreateCostTemplateDto,
  UpdateCostTemplateDto,
  UpdateTemplateComponentDto,
  AddTemplateComponentDto
} from '../types/cost-template.types'

export const useCostTemplatesStore = defineStore('costTemplates', () => {
  const service = useCostTemplatesService()

  // =========================
  // STATE
  // =========================

  const templates = ref<CostTemplate[]>([])
  const components = ref<CostComponent[]>([])
  const current = ref<CostTemplate | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =========================
  // COMPUTED
  // =========================

  const defaultTemplate = computed(() => templates.value.find((t) => t.is_default) ?? null)

  const activeTemplates = computed(() => templates.value.filter((t) => t.active))

  // =========================
  // FETCH COMPONENTS
  // =========================

  const fetchComponents = async () => {
    try {
      loading.value = true
      error.value = null

      components.value = await service.getComponents()

      return components.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar componentes'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createComponent = async (dto: CreateCostComponentDto) => {
    try {
      loading.value = true
      error.value = null

      const created = await service.createComponent(dto)

      components.value.push(created)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateComponent = async (id: string, dto: Partial<CreateCostComponentDto>) => {
    try {
      loading.value = true
      error.value = null

      const updated = await service.updateComponent(id, dto)

      const idx = components.value.findIndex((c) => c.id === id)
      if (idx !== -1) components.value[idx] = updated

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteComponent = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      await service.deleteComponent(id)

      components.value = components.value.filter((c) => c.id !== id)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // FETCH TEMPLATES
  // =========================

  const fetchAll = async () => {
    try {
      loading.value = true
      error.value = null

      templates.value = await service.getAll()

      return templates.value
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar templates'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      const data = await service.getOne(id)

      current.value = data

      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar template'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (dto: CreateCostTemplateDto) => {
    try {
      loading.value = true
      error.value = null

      const created = await service.create(dto)

      // Si es default, actualizar el anterior
      if (created.is_default) {
        templates.value = templates.value.map((t) => ({
          ...t,
          is_default: false
        }))
      }

      templates.value.unshift(created)

      return created
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al crear template'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, dto: UpdateCostTemplateDto) => {
    try {
      loading.value = true
      error.value = null

      const updated = await service.update(id, dto)

      // Si se marcó como default, limpiar el anterior
      if (updated.is_default) {
        templates.value = templates.value.map((t) => ({
          ...t,
          is_default: t.id === id
        }))
      }

      const idx = templates.value.findIndex((t) => t.id === id)
      if (idx !== -1) templates.value[idx] = updated

      if (current.value?.id === id) current.value = updated

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar template'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      loading.value = true
      error.value = null

      await service.remove(id)

      templates.value = templates.value.filter((t) => t.id !== id)

      if (current.value?.id === id) current.value = null
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar template'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // TEMPLATE COMPONENTS
  // =========================

  const addComponent = async (templateId: string, dto: AddTemplateComponentDto) => {
    try {
      loading.value = true
      error.value = null

      const updated = await service.addComponent(templateId, dto)

      const idx = templates.value.findIndex((t) => t.id === templateId)
      if (idx !== -1) templates.value[idx] = updated

      if (current.value?.id === templateId) current.value = updated

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al agregar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTemplateComponent = async (templateId: string, componentId: string, dto: UpdateTemplateComponentDto) => {
    try {
      loading.value = true
      error.value = null

      const updated = await service.updateTemplateComponent(templateId, componentId, dto)

      const idx = templates.value.findIndex((t) => t.id === templateId)
      if (idx !== -1) templates.value[idx] = updated

      if (current.value?.id === templateId) current.value = updated

      return updated
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al actualizar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeTemplateComponent = async (templateId: string, componentId: string) => {
    try {
      loading.value = true
      error.value = null

      await service.removeTemplateComponent(templateId, componentId)

      // Actualizar el template en el store removiendo el componente
      const idx = templates.value.findIndex((t) => t.id === templateId)

      if (idx !== -1) {
        const template = templates.value[idx]

        if (template) {
          template.components = template.components.filter((c) => c.cost_component_id !== componentId)
        }
      }

      if (current.value?.id === templateId) {
        current.value.components = current.value.components.filter((c) => c.cost_component_id !== componentId)
      }
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al eliminar componente'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // ASSIGN TO PRODUCT
  // =========================

  const assignToProduct = async (templateId: string, productId: string) => {
    try {
      loading.value = true
      error.value = null

      return await service.assignToProduct(templateId, productId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al asignar template'
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromProduct = async (productId: string) => {
    try {
      loading.value = true
      error.value = null

      return await service.removeFromProduct(productId)
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al quitar template'
      throw err
    } finally {
      loading.value = false
    }
  }

  // =========================
  // RESET
  // =========================

  const reset = () => {
    templates.value = []
    components.value = []
    current.value = null
    error.value = null
  }

  return {
    // state
    templates,
    components,
    current,
    loading,
    error,

    // computed
    defaultTemplate,
    activeTemplates,

    // components
    fetchComponents,
    createComponent,
    updateComponent,
    deleteComponent,

    // templates
    fetchAll,
    fetchOne,
    create,
    update,
    remove,

    // template components
    addComponent,
    updateTemplateComponent,
    removeTemplateComponent,

    // product assignment
    assignToProduct,
    removeFromProduct,

    reset
  }
})
