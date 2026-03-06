import type {
  TransferRate,
  CreateTransferRateInput,
  UpdateTransferRateInput
} from '~/types/logistica/transfer-rates'

export const useTransferRatesService = () => {
  const base = '/api/logistica/transfer-rate'
  const getAll = (company_id: string) =>
    $fetch<TransferRate[]>(`${base}`, { query: { company_id } })

  const getById = (id: string) => $fetch<TransferRate>(`${base}+${id}`)

  const create = (body: CreateTransferRateInput) =>
    $fetch<TransferRate>(`${base}`, { method: 'POST', body })

  const update = (id: string, body: UpdateTransferRateInput) =>
    $fetch<TransferRate>(`${base}+${id}`, { method: 'PATCH', body })

  const deactivate = (id: string) =>
    $fetch<{ deleted: boolean }>(`${base}+${id}`, {
      method: 'DELETE'
    })

  return { getAll, getById, create, update, deactivate }
}
