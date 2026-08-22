import type {
  ProductSupplier,
  CreateProductSupplierInput,
  UpdateProductSupplierInput
} from '../types/product-supplier.types'

export const useProductSuppliersService = () => {
  const urlBase = '/api/pricing/product-suppliers'

  const getAll = (productId?: string) =>
    $fetch<ProductSupplier[]>(urlBase, { query: productId ? { product_id: productId } : {} })

  const getById = (id: string) =>
    $fetch<ProductSupplier>(`${urlBase}/${id}`)

  const create = (body: CreateProductSupplierInput) =>
    $fetch<ProductSupplier>(urlBase, { method: 'POST', body })

  const update = (id: string, body: UpdateProductSupplierInput) =>
    $fetch<ProductSupplier>(`${urlBase}/${id}`, { method: 'PATCH', body })

  const remove = (id: string) =>
    $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' })

  return { getAll, getById, create, update, remove }
}
