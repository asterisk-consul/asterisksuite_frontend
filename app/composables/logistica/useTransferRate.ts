import { computed, type Ref } from 'vue'
import type { TransferRate } from '~/types/logistica/transfer-rates'

export interface SelectItem {
  label: string
  value: string
}

export function useTransferRate(transfers: Ref<TransferRate[]>) {
  const items = computed<SelectItem[]>(() =>
    transfers.value.map((tranfer) => {
      return { label: tranfer.name, value: tranfer.id }
    })
  )
  return { items }
}
