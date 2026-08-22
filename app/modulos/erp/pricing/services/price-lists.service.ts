import type {
  PriceList,
  CreatePriceListInput,
  UpdatePriceListInput
} from '../types/price-list.types'

export const usePriceListsService = () => {
  const urlBase = '/api/pricing/price-lists'

  const getAll = (type?: string) =>
    $fetch<PriceList[]>(urlBase, { query: type ? { type } : {} })

  const getById = (id: string) =>
    $fetch<PriceList>(`${urlBase}/${id}`)

  const create = (body: CreatePriceListInput) =>
    $fetch<PriceList>(urlBase, { method: 'POST', body })

  const update = (id: string, body: UpdatePriceListInput) =>
    $fetch<PriceList>(`${urlBase}/${id}`, { method: 'PATCH', body })

  const remove = (id: string) =>
    $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' })

  return { getAll, getById, create, update, remove }
}
