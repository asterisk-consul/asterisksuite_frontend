<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import type { Unit } from '~/modulos/almacen/units/types/units.types'
import { useUnits } from '~/modulos/almacen/units/composable/useUnits'

const { getUnitTypeLabel } = useUnits()

interface Props {
  units: Unit[]
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: [unit: Unit]
  edit: [unit: Unit]
}>()

const getItems = (unit: Unit): DropdownMenuItem[] => [
  {
    label: 'Editar Unidad',
    icon: 'i-lucide-pencil',
    onSelect: () => emit('edit', unit)
  },
  {
    label: unit.active ? 'Desactivar' : 'Activar',
    icon: unit.active ? 'i-lucide-circle-off' : 'i-lucide-circle-check',

    color: unit.active ? ('error' as const) : ('success' as const),

    onSelect: () => emit('toggle', unit)
  }
]
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="unit in units"
      :key="unit.id"
      class="flex items-center justify-between gap-4 px-4 py-4"
    >
      <!-- Left -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex items-center justify-center size-10 rounded-lg bg-warning/10 text-warning font-bold"
        >
          {{ unit.symbol }}
        </div>

        <div class="flex flex-col flex-1 min-w-0">
          <p class="font-medium truncate">
            {{ unit.name }}
          </p>

          <div class="flex items-center gap-2 mt-1">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ getUnitTypeLabel(unit.unit_type) }}
            </UBadge>

            <UBadge
              :color="unit.active ? 'success' : 'error'"
              variant="soft"
              size="sm"
            >
              {{ unit.active ? 'Activo' : 'Inactivo' }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-3">
        <UToggle
          :model-value="unit.active"
          @update:model-value="emit('toggle', unit)"
        />

        <UDropdownMenu :items="getItems(unit)" :content="{ align: 'end' }">
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
