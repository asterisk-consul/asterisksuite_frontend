const urlBase = '/api/erp/bank-concepts'

export const useBankConceptsService = () => {
  const findAll = () => $fetch<any[]>(urlBase, { method: 'GET' })
  const findOne = (id: string) => $fetch<any>(`${urlBase}/${id}`)
  const create = (data: any) => $fetch<any>(urlBase, { method: 'POST', body: data })
  const update = (id: string, data: any) => $fetch<any>(`${urlBase}/${id}`, { method: 'PATCH', body: data })
  const remove = (id: string) => $fetch<void>(`${urlBase}/${id}`, { method: 'DELETE' })

  return { findAll, findOne, create, update, remove }
}
