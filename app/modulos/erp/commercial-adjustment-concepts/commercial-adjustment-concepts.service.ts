import type {
  CommercialAdjustmentConcept,
  CommercialAdjustmentConceptInput,
  CommercialAdjustmentScope
} from './commercial-adjustment-concepts.types'

const baseUrl = '/api/backend/erp/commercial-adjustment-concepts'

export function useCommercialAdjustmentConceptsService() {
  const findAll = (
    options: { module?: Exclude<CommercialAdjustmentScope, 'BOTH'>; includeInactive?: boolean } = {}
  ) => {
    const query = new URLSearchParams()
    if (options.module) query.set('module', options.module)
    if (options.includeInactive) query.set('include_inactive', 'true')
    const queryString = query.toString()
    const suffix = queryString ? `?${queryString}` : ''
    return $fetch<CommercialAdjustmentConcept[]>(`${baseUrl}${suffix}`)
  }

  const create = (input: CommercialAdjustmentConceptInput) =>
    $fetch<CommercialAdjustmentConcept>(baseUrl, { method: 'POST', body: input })

  const update = (id: string, input: Partial<CommercialAdjustmentConceptInput>) =>
    $fetch<CommercialAdjustmentConcept>(`${baseUrl}/${id}`, { method: 'PATCH', body: input })

  return { findAll, create, update }
}
