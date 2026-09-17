import type {
  CreatePickingInput,
  TransferPalletInput,
  PickingResponse
} from '~/modulos/logistica/warehouses/picking/picking.types'

export const usePickingService = () => {
  const create = (body: CreatePickingInput) =>
    $fetch<PickingResponse>('/api/backend/picking', {
      method: 'POST',
      body
    })

  const transfer = (body: TransferPalletInput) =>
    $fetch<void>('/api/backend/picking/transfer', {
      method: 'PATCH',
      body
    })

  return {
    create,
    transfer
  }
}
