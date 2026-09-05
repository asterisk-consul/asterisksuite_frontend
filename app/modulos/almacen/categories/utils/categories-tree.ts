import type {
  Category,
  CategoryTreeNode
} from '~/modulos/almacen/categories/types/categories.types'

export const buildCategoryTree = (
  categories: Category[]
): CategoryTreeNode[] => {
  const map = new Map<string, CategoryTreeNode>()

  for (const category of categories) {
    map.set(category.id, {
      ...category,
      children: [],
      level: 0
    })
  }

  const roots: CategoryTreeNode[] = []

  for (const category of map.values()) {
    if (category.parent_id) {
      const parent = map.get(category.parent_id)

      if (parent) {
        category.level =
          (parent.level || 0) + 1

        parent.children.push(category)
      } else {
        roots.push(category)
      }
    } else {
      roots.push(category)
    }
  }

  const sortTree = (
    nodes: CategoryTreeNode[]
  ) => {
    nodes.sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    for (const node of nodes) {
      sortTree(node.children)
    }
  }

  sortTree(roots)

  return roots
}

export const flattenCategoryTree = (
  tree: CategoryTreeNode[]
): CategoryTreeNode[] => {
  const result: CategoryTreeNode[] = []

  const walk = (
    nodes: CategoryTreeNode[]
  ) => {
    for (const node of nodes) {
      result.push(node)

      if (node.children.length) {
        walk(node.children)
      }
    }
  }

  walk(tree)

  return result
}
