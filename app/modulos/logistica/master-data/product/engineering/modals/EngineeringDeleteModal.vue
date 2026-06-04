<script setup lang="ts">
import { useEngineeringStore } from '~/modulos/logistica/master-data/product/engineering/store/engineering.store'

const props = defineProps<{
  open: boolean
  componentId: string | null
  componentName?: string
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  deleted: []
}>()

const store = useEngineeringStore()

const loading = ref(false)

const handleDelete = async () => {
  if (!props.componentId) return

  loading.value = true

  try {
    await store.remove(props.componentId)

    emit('deleted')
    emit('update:open', false)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal :open="open" title="Eliminar componente" @update:open="emit('update:open', $event)">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm">
          ¿Seguro que querés eliminar
          <span class="font-medium">
            {{ componentName ?? 'este componente' }}
          </span>
          ?
        </p>

        <p class="text-xs text-muted">Esta acción no se puede deshacer.</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton label="Cancelar" color="neutral" variant="ghost" @click="emit('update:open', false)" />

        <UButton label="Eliminar" color="error" :loading="loading" @click="handleDelete" />
      </div>
    </template>
  </UModal>
</template>
