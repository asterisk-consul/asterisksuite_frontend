<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Unit } from '~/modulos/almacen/units/types/units.types'
import { useUnitsStore } from '~/modulos/almacen/units/store/units.store'

const store = useUnitsStore()
const { items } = storeToRefs(store)
const loading = computed(() => store.loading)
console.log(loading)
const currencies = computed(() => items.value)
console.log(currencies)

const emit = defineEmits<{
  toggle: [currency: Unit]
  edit: [currency: Unit]
}>()

const getItems = (currency: Unit): DropdownMenuItem[] => [
  {
    label: 'Editar Unidad',
    icon: 'i-lucide-pencil',
    onSelect: () => emit('edit', currency)
  },
  {
    label: currency.active ? 'Desactivar' : 'Activar',
    icon: currency.active ? 'i-lucide-circle-off' : 'i-lucide-circle-check',
    color: currency.active ? ('error' as const) : ('success' as const),
    onSelect: () => emit('toggle', currency)
  }
]
onMounted(() => {
  store.fetchAll()
})
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="currency in currencies"
      :key="currency.id"
      class="flex items-center justify-between gap-4 px-4 py-4"
    >
      <!-- Left -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex items-center justify-center size-10 rounded-lg bg-warning/10 text-warning font-bold"
        >
          {{ currency.symbol }}
        </div>
        <div class="flex flex-col flex-1 min-w-0">
          <p class="font-medium truncate">
            {{ currency.name }}
          </p>
          <UBadge
            v-if="currency.active"
            color="primary"
            variant="soft"
            size="sm"
            class="w-fit"
          >
            Activo
          </UBadge>
        </div>
      </div>
      <!-- Right -->
      <div class="flex items-center gap-3">
        <UToggle
          :model-value="currency.active"
          @update:model-value="emit('toggle', currency)"
        />

        <UDropdownMenu :items="getItems(currency)" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </div>
    </li>
  </ul>
</template>
