export interface ProductCategoryTaxonomy {
  id: string
  name: string
  parent_id?: string | null
  deleted_at?: string | null
}

export interface ProductTagTaxonomy {
  id: string
  name: string
  deleted_at?: string | null
}

export interface ProductCategoryFilterOption {
  label: string
  value: string
  path: string
  parentPath: string
  depth: number
}

export function buildProductCategoryFilterOptions(categories: ProductCategoryTaxonomy[]): ProductCategoryFilterOption[] {
  const activeCategories = categories.filter(category => !category.deleted_at)
  const categoriesById = new Map(activeCategories.map(category => [category.id, category]))

  const getPathParts = (category: ProductCategoryTaxonomy) => {
    const path: string[] = []
    const visited = new Set<string>()
    let current: ProductCategoryTaxonomy | undefined = category

    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      path.unshift(current.name)
      current = current.parent_id ? categoriesById.get(current.parent_id) : undefined
    }

    return path
  }

  return activeCategories
    .map((category) => {
      const path = getPathParts(category)
      return {
        label: category.name,
        value: category.id,
        path: path.join(' › '),
        parentPath: path.slice(0, -1).join(' › '),
        depth: Math.max(0, path.length - 1),
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path, 'es-AR'))
}

export function buildProductTagFilterOptions(tags: ProductTagTaxonomy[]) {
  return tags
    .filter(tag => !tag.deleted_at)
    .map(tag => ({ label: tag.name, value: tag.id }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es-AR'))
}
