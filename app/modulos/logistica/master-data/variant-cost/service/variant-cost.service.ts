import type {
  VariantCost,
  CreateVariantCostInput,
  UpdateVariantCostInput
} from '~/modulos/logistica/master-data/variant-cost/types/variant-costs.types'

const urlBase = '/api/logistica/master-data/variant-costs'

export const useVariantCostsService = () => {
  const findAll = () => {
    return $fetch<VariantCost[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<VariantCost>(`${urlBase}/${id}`)
  }

  const create = (data: CreateVariantCostInput) => {
    return $fetch<VariantCost>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateVariantCostInput) => {
    return $fetch<VariantCost>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    findAll,
    findOne,
    create,
    update,
    remove
  }
}
