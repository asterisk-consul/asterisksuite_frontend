import type { Trip, CreateTripInput } from '../types/trips.types'

export interface SelectMenuItem {
  label: string
  value: string
}

export type StatusOption = {
  label: string
  value: string
}

/**
 * Opciones de estado
 */
export const statusOptions: StatusOption[] = [
  { label: 'Planificado', value: 'PLANNED' },
  { label: 'En progreso', value: 'IN_PROGRESS' },
  { label: 'Completado', value: 'COMPLETED' },
  { label: 'Cancelado', value: 'CANCELLED' }
]

export type TripForm = CreateTripInput & {
  business_party?: SelectMenuItem
  statusOption?: StatusOption
}

/**
 * Limpieza
 */
export const clean = (value?: string) =>
  value && value.trim() !== '' ? value : undefined

/**
 * Entity → Form
 */
export const mapTripToForm = (
  t: Trip,
  parties: SelectMenuItem[]
): TripForm => ({
  company_id: t.company_id,
  reference_number: t.reference_number ?? undefined,
  vehicle_combination_id: t.vehicle_combination_id ?? undefined,
  origin_location_id: t.origin_location_id ?? undefined,
  destination_location_id: t.destination_location_id ?? undefined,
  corridor_id: t.corridor_id ?? undefined,
  route: t.route ?? undefined,
  departure_time: t.departure_time,
  arrival_time: t.arrival_time,
  status: t.status,
  statusOption: statusOptions.find((s) => s.value === t.status),
  kilometers: t.kilometers ?? undefined,
  business_party_id: t.business_party_id ?? undefined,
  business_party: parties.find((p) => p.value === t.business_party_id)
})

/**
 * Form → DTO
 */
export const mapFormToDto = (f: TripForm): CreateTripInput => ({
  company_id: f.company_id,
  reference_number: clean(f.reference_number),
  vehicle_combination_id: f.vehicle_combination_id,
  origin_location_id: f.origin_location_id,
  destination_location_id: f.destination_location_id,
  corridor_id: f.corridor_id,
  route: f.route,
  departure_time: f.departure_time,
  arrival_time: f.arrival_time,
  status: f.statusOption?.value ?? f.status,
  kilometers: f.kilometers,
  business_party_id: f.business_party?.value
})
