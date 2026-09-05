import { defineStore } from 'pinia'
import { useProductSuppliersService } from '../services/product-suppliers.service'
import type {
  ProductSupplier,
  CreateProductSupplierInput,
  UpdateProductSupplierInput
} from '../types/product-supplier.types'

export const useProductSuppliersStore = defineStore('productSuppliers', () => {
  const items = ref<ProductSupplier[]>([])
  const loading = ref(false)
  const service = useProductSuppliersService()

  const fetchAll = async (productId?: string) => {
    loading.value = true
    try {
      items.value = await service.getAll(productId)
    } finally {
      loading.value = false
    }
  }

  const create = async (data: CreateProductSupplierInput) => {
    const item = await service.create(data)
    items.value.unshift(item)
    return item
  }

  const update = async (id: string, data: UpdateProductSupplierInput) => {
    const updated = await service.update(id, data)
    const index = items.value.findIndex((i) => i.id === id)
    if (index !== -1) items.value[index] = updated
    return updated
  }

  const remove = async (id: string) => {
    await service.remove(id)
    items.value = items.value.filter((i) => i.id !== id)
  }

  return { items, loading, fetchAll, create, update, remove }
})
