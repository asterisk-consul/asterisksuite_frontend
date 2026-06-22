<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

import type { Attribute } from '~/modulos/almacen/attributes/types/attributes.types'

import { AttributeType } from '~/modulos/almacen/attributes/types/attributes.types'

interface Props {
  attributes: Attribute[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [attribute: Attribute]
  edit: [attribute: Attribute]
}>()

function getAttributeTypeLabel(type: AttributeType) {
  switch (type) {
    case AttributeType.TEXT:
      return 'Texto'

    case AttributeType.NUMBER:
      return 'Número'

    case AttributeType.BOOLEAN:
      return 'Booleano'

    default:
      return type
  }
}

const getItems = (attribute: Attribute): DropdownMenuItem[] => [
  {
    label: 'Editar atributo',
    icon: 'i-lucide-pencil',

    onSelect: () => emit('edit', attribute)
  },
  {
    label: attribute.active ? 'Desactivar' : 'Activar',

    icon: attribute.active ? 'i-lucide-circle-off' : 'i-lucide-circle-check',

    color: attribute.active ? ('error' as const) : ('success' as const),

    onSelect: () => emit('toggle', attribute)
  }
]
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="divide-y divide-default">
    <div
      v-for="n in 4"
      :key="n"
      class="flex items-center justify-between gap-4 px-4 py-4"
    >
      <div class="flex items-center gap-3 flex-1">
        <!-- Código -->
        <USkeleton class="size-10 rounded-lg" />

        <!-- Textos -->
        <div class="flex-1 space-y-2">
          <USkeleton class="h-4 w-[180px]" />

          <div class="flex items-center gap-2">
            <USkeleton class="h-5 w-[80px] rounded-full" />

            <USkeleton class="h-5 w-[90px] rounded-full" />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <USkeleton class="h-6 w-11 rounded-full" />

        <USkeleton class="size-8 rounded-md" />
      </div>
    </div>
  </div>

  <!-- Empty -->
  <div
    v-else-if="!props.attributes.length"
    class="flex flex-col items-center justify-center py-16 text-center"
  >
    <UIcon name="i-lucide-box" class="size-10 text-muted mb-3" />

    <h3 class="text-sm font-semibold">No se han creado atributos</h3>

    <p class="text-sm text-muted mt-1">Crea un nuevo atributo para comenzar.</p>
  </div>

  <!-- List -->
  <ul v-else role="list" class="divide-y divide-default">
    <li
      v-for="attribute in attributes"
      :key="attribute.id"
      class="flex items-center justify-between gap-4 px-4 py-4"
    >
      <!-- Left -->
      <div class="flex items-center gap-3 min-w-0">
        <div
          class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary font-bold"
        >
          {{ attribute.code }}
        </div>

        <div class="flex flex-col flex-1 min-w-0">
          <p class="font-medium truncate">
            {{ attribute.name }}
          </p>

          <div class="flex items-center gap-2 mt-1">
            <UBadge color="neutral" variant="subtle" size="sm">
              {{ getAttributeTypeLabel(attribute.type) }}
            </UBadge>

            <UBadge
              :color="attribute.active ? 'success' : 'error'"
              variant="soft"
              size="sm"
            >
              {{ attribute.active ? 'Activo' : 'Inactivo' }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-3">
        <UToggle
          :model-value="attribute.active"
          @update:model-value="emit('toggle', attribute)"
        />

        <UDropdownMenu :items="getItems(attribute)" :content="{ align: 'end' }">
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
