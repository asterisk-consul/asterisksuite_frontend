import { computed, type Ref } from 'vue'
import type { BusinessParty, BusinessPartyType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

export interface SelectMenuItem {
  label: string
  value: string
}

export function useBusinessParties(
  businessParties: Ref<BusinessParty[]>,
  type?: BusinessPartyType
) {
  const items = computed<SelectMenuItem[]>(() => {
    let filtered = businessParties.value
    if (type) {
      filtered = filtered.filter((party) => party.type === type)
    }
    return filtered.map((party) => ({
      label: party.name,
      value: party.id
    }))
  })

  return {
    items
  }
}
