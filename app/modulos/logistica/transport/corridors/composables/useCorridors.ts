import { reactive, computed } from 'vue'
import type {
  CorridorWithRelations,
  CreateCorridorDto,
  CorridorStop
} from '../types/corridors.types'
// o donde corresponda
import { mapStopsToDto } from '../corridors.mappers'

export interface SelectMenuItem {
  label: string
  value: string
}

export function useCorridorForm(
  companyId?: string,
  corridor?: CorridorWithRelations
) {
  const form = reactive<CreateCorridorDto>({
    company_id: companyId ?? '',
    name: corridor?.name ?? '',
    origin_location_id: corridor?.origin_location_id ?? '',
    destination_location_id: corridor?.destination_location_id ?? '',
    is_template: corridor?.is_template ?? true,
    stops: mapStopsToDto(corridor?.corridorStops)
  })

  const items = computed<SelectMenuItem[]>(() =>
    (corridor?.corridorStops ?? [])
      .filter(
        (
          stop
        ): stop is CorridorStop & { location: { id: string; name: string } } =>
          stop.location?.id != null && stop.location?.name != null
      )
      .map((stop) => ({
        label: stop.location.name,
        value: stop.location.id
      }))
  )

  return {
    form,
    items // faltaba retornarlo
  }
}
