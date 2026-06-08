<script setup lang="ts">
import { computed, ref } from 'vue'

import type { DropdownMenuItem } from '@nuxt/ui'

import type { Tag } from '~/modulos/almacen/tags/types/tags.types'

interface Props {
  tags: Tag[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [tag: Tag]
  edit: [tag: Tag]
}>()

const search = ref('')

const filteredTags = computed(() => {
  if (!search.value.trim()) {
    return props.tags
  }

  return props.tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.value.toLowerCase())
  )
})

const getItems = (tag: Tag): DropdownMenuItem[] => [
  {
    label: 'Editar tag',

    icon: 'i-lucide-pencil',

    onSelect: () => emit('edit', tag)
  },
  {
    label: tag.active ? 'Desactivar' : 'Activar',

    icon: tag.active ? 'i-lucide-circle-off' : 'i-lucide-circle-check',

    color: tag.active ? ('error' as const) : ('success' as const),

    onSelect: () => emit('toggle', tag)
  }
]
</script>

<template>
  <div class="space-y-4">
    <!-- Search -->
    <div class="px-4 pt-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar tags..."
        class="w-full"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="divide-y divide-default">
      <div
        v-for="n in 4"
        :key="n"
        class="flex items-center justify-between gap-4 px-4 py-4"
      >
        <div class="flex items-center gap-3 flex-1">
          <USkeleton class="size-10 rounded-lg" />

          <div class="flex-1 space-y-2">
            <USkeleton class="h-4 w-[180px]" />

            <div class="flex items-center gap-2">
              <USkeleton class="h-5 w-[90px] rounded-full" />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <USkeleton class="h-6 w-11 rounded-full" />

          <USkeleton class="size-8 rounded-md" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!filteredTags.length"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-lucide-tags" class="size-10 text-muted mb-3" />

      <h3 class="text-sm font-semibold">No se encontraron tags</h3>

      <p class="text-sm text-muted mt-1">Intenta con otra búsqueda.</p>
    </div>

    <!-- List -->
    <ul v-else role="list" class="divide-y divide-default">
      <li
        v-for="tag in filteredTags"
        :key="tag.id"
        class="flex items-center justify-between gap-4 px-4 py-4"
      >
        <!-- Left -->
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary font-bold uppercase"
          >
            {{ tag.name.slice(0, 2).toUpperCase() }}
          </div>

          <div class="flex flex-col flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ tag.name }}
            </p>

            <div class="flex items-center gap-2 mt-1">
              <UBadge
                :color="tag.active ? 'success' : 'error'"
                variant="soft"
                size="sm"
              >
                {{ tag.active ? 'Activo' : 'Inactivo' }}
              </UBadge>
            </div>
          </div>
        </div>

        <!-- Right -->
        <div class="flex items-center gap-3">
          <UToggle
            :model-value="tag.active"
            @update:model-value="emit('toggle', tag)"
          />

          <UDropdownMenu :items="getItems(tag)" :content="{ align: 'end' }">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
            />
          </UDropdownMenu>
        </div>
      </li>
    </ul>
  </div>
</template>
