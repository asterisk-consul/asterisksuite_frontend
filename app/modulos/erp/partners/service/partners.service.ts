import type { Partner, CreatePartnerInput, UpdatePartnerInput } from '~/modulos/erp/partners/types/partners.types'

const baseUrl = '/api/erp/partners'

export const usePartnersService = () => {
  const findAll = () => $fetch<Partner[]>(baseUrl)

  const findOne = (id: string) => $fetch<Partner>(`${baseUrl}/${id}`)

  const create = (payload: CreatePartnerInput) =>
    $fetch<Partner>(baseUrl, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdatePartnerInput) =>
    $fetch<Partner>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  return { findAll, findOne, create, update, remove }
}
