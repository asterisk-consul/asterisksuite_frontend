import { defineStore } from 'pinia'
import { useListPricesService } from '../services/list-prices.service'
import type {
  ProductListPrice,
  CreateListPriceInput,
  UpdateListPriceInput
} from '../types/list-price.types'

export const useListPricesStore = defineStore('listPrices', () => {
  const items = ref<ProductListPrice[]>([])
  const loading = ref(false)
  const service = useListPricesService()

  const fetchAll = async (priceListId?: string, productId?: string) => {
    loading.value = true
    try {
      items.value = await service.getAll(priceListId, productId)
    } finally {
      loading.value = false
    }
  }

  const create = async (data: CreateListPriceInput) => {
    const item = await service.create(data)
    items.value.unshift(item)
    return item
  }

  const update = async (id: string, data: UpdateListPriceInput) => {
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
