<script setup lang="ts">
import { useEngineeringStore } from '../store/engineering.store'

const props = defineProps<{
  componentId: string // ID del product_component a mover
  componentName: string // para mostrar en el título
  currentParentId: string // para no mostrarlo como opción
  productRootId: string // raíz del árbol
}>()

const emit = defineEmits<{
  moved: []
  cancelled: []
}>()

const store = useEngineeringStore()
const toast = useToast()

const selectedParentId = ref<string | null>(null)

// Aplanar el árbol para mostrarlo como lista seleccionable
// Excluir el propio nodo y sus descendientes (para evitar ciclos en la UI)
const flatOptions = computed(() => {
  const options: { id: string; name: string; sku: string | null; depth: number }[] = []

  // Opción "raíz del árbol"
  options.push({
    id: props.productRootId,
    name: 'Raíz del árbol',
    sku: null,
    depth: 0
  })

  const flatten = (nodes: any[], depth = 1) => {
    for (const node of nodes) {
      // No mostrar el nodo que estamos moviendo ni sus hijos
      if (node.id === props.componentId) continue

      options.push({
        id: node.child_product_id,
        name: node.child_product?.name ?? '—',
        sku: node.child_product?.sku ?? null,
        depth
      })

      if (node.children?.length) {
        flatten(node.children, depth + 1)
      }
    }
  }

  flatten(store.tree)
  return options
})

const handleMove = async () => {
  if (selectedParentId.value === undefined) return

  try {
    const newParent = selectedParentId.value === props.productRootId ? null : selectedParentId.value

    await store.moveComponent(props.componentId, newParent, props.productRootId)

    toast.add({
      title: 'Componente movido',
      description: 'El componente fue reubicado correctamente.',
      color: 'success'
    })

    emit('moved')
  } catch (err: any) {
    toast.add({
      title: 'Error al mover',
      description: err?.data?.message ?? 'Verificá que no genere una referencia circular.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Seleccioná el nuevo padre para
      <span class="font-medium text-highlighted">{{ componentName }}</span>
    </p>

    <!-- Lista de opciones -->
    <div class="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-default p-2">
      <div
        v-for="option in flatOptions"
        :key="option.id"
        class="flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors"
        :class="
          selectedParentId === option.id
            ? 'bg-primary-50 dark:bg-primary-950/30 border border-primary-300 dark:border-primary-700'
            : 'hover:bg-elevated'
        "
        :style="{ paddingLeft: `${option.depth * 1.25 + 0.75}rem` }"
        @click="selectedParentId = option.id"
      >
        <UIcon
          :name="selectedParentId === option.id ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle'"
          class="size-4 shrink-0"
          :class="selectedParentId === option.id ? 'text-primary-500' : 'text-muted'"
        />
        <div class="flex flex-col min-w-0">
          <span class="text-sm font-medium truncate">{{ option.name }}</span>
          <span v-if="option.sku" class="text-xs text-muted font-mono">
            {{ option.sku }}
          </span>
        </div>
        <UBadge
          v-if="option.id === currentParentId"
          label="Actual"
          color="neutral"
          variant="subtle"
          size="xs"
          class="ml-auto shrink-0"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 pt-2 border-t border-default">
      <UButton variant="ghost" color="neutral" @click="emit('cancelled')">Cancelar</UButton>
      <UButton
        :disabled="!selectedParentId || selectedParentId === currentParentId"
        :loading="store.loading"
        icon="i-heroicons-arrows-right-left"
        @click="handleMove"
      >
        Mover aquí
      </UButton>
    </div>
  </div>
</template>
