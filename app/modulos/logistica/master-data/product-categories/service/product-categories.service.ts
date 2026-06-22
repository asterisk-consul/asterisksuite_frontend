import type {
  ProductCategory,
  AssignProductCategoryInput,
  BulkAssignProductCategoriesInput
} from '~/modulos/logistica/master-data/product-categories/types/product-categories.types'

const urlBase =
  '/api/logistica/master-data/product-categories'

export const useProductCategoriesService =
  () => {
    const assign = (
      data: AssignProductCategoryInput
    ) => {
      return $fetch<ProductCategory>(
        urlBase,
        {
          method: 'POST',
          body: data
        }
      )
    }

    const bulkAssign = (
      data: BulkAssignProductCategoriesInput
    ) => {
      return $fetch<ProductCategory[]>(
        `${urlBase}/bulk`,
        {
          method: 'POST',
          body: data
        }
      )
    }

    const getProductCategories = (
      productId: string
    ) => {
      return $fetch<ProductCategory[]>(
        `${urlBase}/product/${productId}`
      )
    }

    const remove = (
      productId: string,
      categoryId: string
    ) => {
      return $fetch<void>(
        `${urlBase}/${productId}/${categoryId}`,
        {
          method: 'DELETE'
        }
      )
    }

    return {
      assign,
      bulkAssign,
      getProductCategories,
      remove
    }
  }
