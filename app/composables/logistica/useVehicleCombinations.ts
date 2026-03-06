import { computed, type Ref } from 'vue'
import type { VehicleCombination } from '~/types/logistica/transport/vehicles-combinations'

export interface SelectItem {
  label: string
  value: string
}

export function useVehiclesCombinations(vehicles: Ref<VehicleCombination[]>) {
  const items = computed<SelectItem[]>(() =>
    vehicles.value.map((vehicle) => {
      const label = `${vehicle.unit_number} - ${vehicle.tractor_id} - ${vehicle.trailer_id}`
      return { label, value: vehicle.id }
    })
  )
  return { items }
}
