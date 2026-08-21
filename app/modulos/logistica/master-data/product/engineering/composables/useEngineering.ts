import { computed } from 'vue'

import { useEngineeringStore } from '../store/engineering.store'

import type { CreateEngineeringComponentDto } from '../types/engineering.types'

export const useEngineering = (productId: string) => {
  const store = useEngineeringStore()

  // =========================
  // INIT
  // =========================

  const init = async () => {
    await store.fetchTree(productId)
  }

  // =========================
  // TREE
  // =========================

  const loadTree = async () => {
    return store.fetchTree(productId)
  }

  // =========================
  // CALCULATE
  // =========================

  const calculate = async () => {
    return store.calculate(productId)
  }

  // =========================
  // CREATE
  // =========================

  const addComponent = async (
    dto: Omit<CreateEngineeringComponentDto, 'parent_product_id'>,
    parentId?: string | null
  ) => {
    const result = await store.createComponent({
      ...dto,
      parent_product_id: parentId ?? productId
    })
    await loadTree()
    return result
  }

  // =========================
  // UPDATE
  // =========================

  const updateComponent = async (componentId: string, dto: Partial<CreateEngineeringComponentDto>) => {
    return store.updateComponent(componentId, dto, productId)
  }

  // =========================
  // DELETE
  // =========================

  const deleteComponent = async (componentId: string) => {
    return store.deleteComponent(componentId, productId)
  }

  // =========================
  // MOVE
  // =========================

  const moveComponent = async (componentId: string, newParentProductId: string | null) => {
    return store.moveComponent(componentId, newParentProductId, productId)
  }

  // =========================
  // REORDER
  // =========================

  const reorderComponents = async (items: { id: string; order: number }[]) => {
    return store.reorder(items)
  }

  // =========================
  // HELPERS UI
  // =========================

  const totalMaterials = computed(() => store.calculation?.materials?.length ?? 0)

  const hasTree = computed(() => store.tree.length > 0)

  const flattenTree = (nodes = store.tree, depth = 0): Array<{ node: (typeof nodes)[0]; depth: number }> => {
    const result: Array<{
      node: (typeof nodes)[0]
      depth: number
    }> = []

    for (const node of nodes) {
      result.push({ node, depth })

      if (node.children?.length) {
        result.push(...flattenTree(node.children, depth + 1))
      }
    }

    return result
  }

  return {
    // state
    tree: computed(() => store.tree),
    calculation: computed(() => store.calculation),
    loading: computed(() => store.loading),
    calculating: computed(() => store.calculating),
    error: computed(() => store.error),

    // computed
    hasTree,
    totalMaterials,

    // actions
    init,
    loadTree,
    calculate,
    addComponent,
    updateComponent,
    deleteComponent,
    moveComponent,
    reorderComponents,

    // utils
    flattenTree
  }
}
