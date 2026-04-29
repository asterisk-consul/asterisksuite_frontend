import type {
  VehicleCombination,
  UpdateVehicleCombinationInput
} from '../types/vehicles-combinations.types'

export type VehicleCombinationForm = {
  id: string
  unit_number: string
  tractor_id: string
  trailer_id: string
  driver_id: string
  valid_from: string
  valid_until: string
}

export function mapVehicleCombinationToForm(
  data: VehicleCombination
): VehicleCombinationForm {
  return {
    id: data.id,
    unit_number: data.unit_number ?? '',
    tractor_id: data.tractor_id ?? '',
    trailer_id: data.trailer_id ?? '',
    driver_id: data.driver_id ?? '',
    valid_from: data.valid_from ?? '',
    valid_until: data.valid_until ?? ''
  }
}

export function mapVehicleCombinationFormToDto(
  form: VehicleCombinationForm
): UpdateVehicleCombinationInput {
  return {
    unit_number: form.unit_number,
    tractor_id: form.tractor_id,
    trailer_id: form.trailer_id,
    driver_id: form.driver_id,
    valid_from: form.valid_from,
    valid_until: form.valid_until
  }
}
