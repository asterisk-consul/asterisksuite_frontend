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
  // CREATE COMPONENT
  // =========================

  const addComponent = async (dto: Omit<CreateEngineeringComponentDto, 'parent_product_id'>) => {
    return store.createComponent({
      ...dto,
      parent_product_id: productId
    })
  }

  // =========================
  // HELPERS UI
  // =========================

  const getTotalMaterials = computed(() => store.calculation?.total_items ?? 0)

  const hasTree = computed(() => store.tree.length > 0)

  const flattenTree = (nodes = store.tree, depth = 0): Array<{ node: (typeof nodes)[0]; depth: number }> => {
    const result: Array<{ node: (typeof nodes)[0]; depth: number }> = []

    for (const node of nodes) {
      result.push({ node, depth })
      if (node.children?.length) {
        result.push(...flattenTree(node.children, depth + 1))
      }
    }

    return result
  }

  return {
    // store state
    tree: computed(() => store.tree),
    calculation: computed(() => store.calculation),
    loading: computed(() => store.loading),
    calculating: computed(() => store.calculating),
    error: computed(() => store.error),

    // computed
    hasTree,
    getTotalMaterials,

    // actions
    init,
    loadTree,
    calculate,
    addComponent,

    // utils
    flattenTree
  }
}
