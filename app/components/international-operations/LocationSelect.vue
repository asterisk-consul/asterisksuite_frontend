<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocationsService } from '~/modulos/logistica/master-data/locations/locations.service'
import type { Location } from '~/modulos/logistica/master-data/locations/types/locations.types'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: 'Buscar ubicación…',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  select: [location: Location | null]
}>()

const locationsService = useLocationsService()
const searchTerm = ref('')
const results = ref<Location[]>([])
const selectedLocation = ref<Location | null>(null)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let requestId = 0
let selectedRequestId = 0

const locationLabel = (location: Location) => {
  const main = location.address
    ? `${location.address}${location.city ? ` — ${location.city}` : ''}`
    : location.city || location.province || location.country || 'Ubicación sin nombre'
  const context = [location.province, location.country]
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .join(', ')
  return context ? `${main} · ${context}` : main
}

const items = computed(() => {
  const byId = new Map<string, Location>()
  for (const location of results.value) byId.set(location.id, location)
  if (selectedLocation.value) byId.set(selectedLocation.value.id, selectedLocation.value)
  return Array.from(byId.values()).map(location => ({ label: locationLabel(location), value: location.id }))
})

const selectedItem = computed({
  get: () => items.value.find(item => item.value === props.modelValue)
    ?? (props.modelValue ? { value: props.modelValue, label: `Ubicación ${props.modelValue.slice(0, 8)}` } : null),
  set: (item: { value: string } | null) => {
    const location = item
      ? results.value.find(result => result.id === item.value)
        ?? (selectedLocation.value?.id === item.value ? selectedLocation.value : null)
      : null
    selectedLocation.value = location
    emit('update:modelValue', location?.id)
    emit('select', location)
  }
})

const search = (query: string) => {
  if (timer) clearTimeout(timer)
  controller?.abort()
  const currentRequest = ++requestId
  const term = query.trim()
  if (term.length === 1) {
    results.value = []
    loading.value = false
    return
  }
  timer = setTimeout(async () => {
    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    try {
      const locations = await locationsService.search(term, 30, activeController.signal)
      if (currentRequest === requestId) results.value = locations
    } catch (error: any) {
      if (currentRequest === requestId && error?.name !== 'AbortError') results.value = []
    } finally {
      if (currentRequest === requestId) loading.value = false
    }
  }, term ? 180 : 0)
}

watch(searchTerm, search)
const loadSelectedLocation = async (id?: string) => {
  if (!id) {
    selectedLocation.value = null
    return
  }
  const currentSelectedRequest = ++selectedRequestId
  const local = results.value.find(location => location.id === id)
  if (local) {
    selectedLocation.value = local
    return
  }
  if (selectedLocation.value?.id === id) return
  try {
    const location = await locationsService.getOne(id)
    if (currentSelectedRequest === selectedRequestId && props.modelValue === id) selectedLocation.value = location
  } catch {
    // Se preserva el ID aunque una ubicación histórica ya no esté disponible.
  }
}

watch(() => props.modelValue, id => { void loadSelectedLocation(id) })

onMounted(() => {
  search('')
  if (props.modelValue) void loadSelectedLocation(props.modelValue)
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <USelectMenu
    v-model="selectedItem"
    :items="items"
    :placeholder="placeholder"
    v-model:search-term="searchTerm"
    :loading="loading"
    :disabled="disabled"
    searchable
    clear
    class="w-full min-w-0"
  />
</template>
