import { useCostTemplatesStore } from '../store/cost-templates.store'
import type {
  CostTemplate,
  CreateCostTemplateDto,
  UpdateCostTemplateDto,
  CreateCostComponentDto,
  AddTemplateComponentDto,
  UpdateTemplateComponentDto,
  CostComponentType,
  CostValueType
} from '../types/cost-template.types'

import {
  COST_COMPONENT_TYPE_LABELS,
  COST_VALUE_TYPE_LABELS,
  COST_COMPONENT_TYPE_COLORS
} from '../types/cost-template.types'

export interface SelectItem {
  label: string
  value: string
}

export const useCostTemplates = () => {
  const store = useCostTemplatesStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await Promise.all([store.fetchAll(), store.fetchComponents()])
  }

  const costComponentTypeItems: SelectItem[] = Object.entries(COST_COMPONENT_TYPE_LABELS).map(([value, label]) => ({
    label,
    value
  }))

  const costValueTypeItems: SelectItem[] = Object.entries(COST_VALUE_TYPE_LABELS).map(([value, label]) => ({
    label,
    value
  }))
  // =========================
  // TEMPLATE ACTIONS
  // =========================

  const createTemplate = async (dto: CreateCostTemplateDto) => {
    return store.create(dto)
  }

  const updateTemplate = async (id: string, dto: UpdateCostTemplateDto) => {
    return store.update(id, dto)
  }

  const deleteTemplate = async (id: string) => {
    return store.remove(id)
  }

  const setDefault = async (id: string) => {
    return store.update(id, { is_default: true })
  }

  // =========================
  // COMPONENT ACTIONS
  // =========================

  const createComponent = async (dto: CreateCostComponentDto) => {
    return store.createComponent(dto)
  }

  const updateComponent = async (id: string, dto: Partial<CreateCostComponentDto>) => {
    return store.updateComponent(id, dto)
  }

  const deleteComponent = async (id: string) => {
    return store.deleteComponent(id)
  }

  // =========================
  // TEMPLATE COMPONENT ACTIONS
  // =========================

  const addComponentToTemplate = async (templateId: string, dto: AddTemplateComponentDto) => {
    return store.addComponent(templateId, dto)
  }

  const updateComponentInTemplate = async (
    templateId: string,
    componentId: string,
    dto: UpdateTemplateComponentDto
  ) => {
    return store.updateTemplateComponent(templateId, componentId, dto)
  }

  const removeComponentFromTemplate = async (templateId: string, componentId: string) => {
    return store.removeTemplateComponent(templateId, componentId)
  }

  // =========================
  // PRODUCT ASSIGNMENT
  // =========================

  const assignTemplateToProduct = async (templateId: string, productId: string) => {
    return store.assignToProduct(templateId, productId)
  }

  const removeTemplateFromProduct = async (productId: string) => {
    return store.removeFromProduct(productId)
  }

  // =========================
  // HELPERS UI
  // =========================

  const getTypeLabel = (type: CostComponentType) => COST_COMPONENT_TYPE_LABELS[type] ?? type

  const getValueTypeLabel = (valueType: CostValueType) => COST_VALUE_TYPE_LABELS[valueType] ?? valueType

  const getTypeColor = (type: CostComponentType) => COST_COMPONENT_TYPE_COLORS[type] ?? 'neutral'

  const formatComponentValue = (
    valueType: CostValueType,
    value: number | null,
    override: number | null = null
  ): string => {
    const raw = override ?? value
    if (raw === null || raw === undefined) return '—'

    const effectiveValue = Number(raw) // ← fix: castear siempre

    if (isNaN(effectiveValue)) return '—'

    switch (valueType) {
      case 'FROM_BOM':
        return 'Desde BOM'
      case 'PERCENTAGE_OF_MATERIAL':
      case 'PERCENTAGE_OF_TOTAL':
        return `${effectiveValue.toFixed(2)}%`
      case 'FIXED_PER_UNIT':
        return new Intl.NumberFormat('es-AR', {
          minimumFractionDigits: 2
        }).format(effectiveValue)
      default:
        return String(effectiveValue)
    }
  }
  const getTemplateById = (id: string): CostTemplate | undefined => store.templates.find((t) => t.id === id)

  return {
    // store state
    templates: computed(() => store.templates),
    components: computed(() => store.components),
    current: computed(() => store.current),
    loading: computed(() => store.loading),
    error: computed(() => store.error),
    defaultTemplate: computed(() => store.defaultTemplate),
    activeTemplates: computed(() => store.activeTemplates),

    // computed
    costComponentTypeItems,
    costValueTypeItems,

    // template actions
    init,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefault,

    // component actions
    createComponent,
    updateComponent,
    deleteComponent,

    // template component actions
    addComponentToTemplate,
    updateComponentInTemplate,
    removeComponentFromTemplate,

    // product assignment
    assignTemplateToProduct,
    removeTemplateFromProduct,

    // ui helpers
    getTypeLabel,
    getValueTypeLabel,
    getTypeColor,
    formatComponentValue,
    getTemplateById
  }
}
