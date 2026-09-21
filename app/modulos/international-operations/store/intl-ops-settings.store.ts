import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'
import type {
  IntlOpsSettings,
  UpdateIntlOpsSettingsInput
} from '~/modulos/international-operations/types/international-operations.types'

export const DEFAULT_CONTAINER_FIELDS: Record<string, boolean> = {
  container_number: true,
  container_type: true,
  seal_number: true,
  booking_number: false,
  bill_of_lading: false,
  vessel_name: false,
  voyage_number: false,
  origin_port: true,
  destination_port: true,
  estimated_departure_date: true,
  estimated_arrival_date: true,
  weight: true,
  volume: true,
  notes: true
}

export const DEFAULT_OPERATION_FIELDS: Record<string, boolean> = {
  name: true,
  operation_type: true,
  transport_type: true,
  currency_code: true,
  incoterm: true,
  origin_location_id: true,
  destination_location_id: true,
  estimated_departure_date: true,
  estimated_arrival_date: true,
  customs_broker_op_number: false,
  sim_number: false,
  supplier_purchase_order: false,
  notes: true
}

export const useIntlOpsSettingsStore = defineStore('intl-ops-settings', () => {
  const service = useInternationalOperationsService()

  const settings = ref<IntlOpsSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const containerFields = computed<Record<string, boolean>>(() => ({
    ...DEFAULT_CONTAINER_FIELDS,
    ...(settings.value?.container_fields ?? {})
  }))

  const operationFields = computed<Record<string, boolean>>(() => ({
    ...DEFAULT_OPERATION_FIELDS,
    ...(settings.value?.operation_fields ?? {})
  }))

  const isOperationFieldVisible = (field: string): boolean =>
    operationFields.value[field] ?? false

  const isContainerFieldVisible = (field: string): boolean =>
    containerFields.value[field] ?? true

  const isOperationStatusEnabled = (status: string): boolean => {
    const enabled = settings.value?.operation_statuses
    if (!enabled || enabled.length === 0) return true
    return enabled.includes(status)
  }

  const isContainerStatusEnabled = (status: string): boolean => {
    const enabled = settings.value?.container_statuses
    if (!enabled || enabled.length === 0) return true
    return enabled.includes(status)
  }

  const fetchSettings = async (force = false) => {
    if (loaded.value && !force) return settings.value
    try {
      loading.value = true
      error.value = null
      const data = await service.getSettings()
      settings.value = data
      loaded.value = true
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al cargar configuración'
      throw err
    } finally {
      loading.value = false
    }
  }

  const saveSettings = async (payload: UpdateIntlOpsSettingsInput) => {
    try {
      loading.value = true
      error.value = null
      const data = await service.updateSettings(payload)
      settings.value = data
      loaded.value = true
      return data
    } catch (err: any) {
      error.value = err?.data?.message || 'Error al guardar configuración'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    loaded,
    containerFields,
    operationFields,
    isOperationFieldVisible,
    isContainerFieldVisible,
    isOperationStatusEnabled,
    isContainerStatusEnabled,
    fetchSettings,
    saveSettings
  }
})
