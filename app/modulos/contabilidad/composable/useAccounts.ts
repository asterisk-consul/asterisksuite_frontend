import { computed, type Ref } from 'vue'
import type { Account } from '~/modulos/contabilidad/types/accounts.types'
export interface SelectMenuItem {
  label: string
  value: string
}

export function useAccounts(accounts: Ref<Account[]>) {
  const items = computed<SelectMenuItem[]>(() =>
    accounts.value.map((party) => ({
      label: party.code + ' - ' + party.name,
      value: party.id
    }))
  )

  return {
    items
  }
}
