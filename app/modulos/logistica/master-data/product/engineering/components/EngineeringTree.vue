<script setup lang="ts">
import { getCoreRowModel, getExpandedRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, SortingState, ExpandedState } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { useSortable } from '@vueuse/integrations/useSortable'
import { useEngineering } from '../composables/useEngineering'
import { useEngineeringStore } from '../store/engineering.store'
import EngineeringMoveModal from './EngineeringMoveModal.vue'

const props = defineProps<{
  productId: string
}>()

const emit = defineEmits<{
  addChild: [parentNode: any | null]
  editNode: [node: any]
  deleteNode: [node: any]
}>()

const { tree, loading, hasTree, loadTree } = useEngineering(props.productId)
const store = useEngineeringStore()
const toast = useToast()

// =========================
// TIPOS Y LABELS
// =========================

type BadgeColor = 'error' | 'success' | 'neutral' | 'primary' | 'secondary' | 'info' | 'warning'

const PRODUCT_TYPE_COLORS: Record<string, BadgeColor> = {
  RAW_MATERIAL: 'neutral',
  SEMI_FINISHED: 'info',
  FINISHED_PRODUCT: 'success',
  SERVICE: 'warning',
  CONSUMABLE: 'secondary'
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  RAW_MATERIAL: 'MP',
  SEMI_FINISHED: 'ST',
  FINISHED_PRODUCT: 'PT',
  SERVICE: 'SV',
  CONSUMABLE: 'CO'
}

// =========================
// TABLE STATE
// =========================

const sorting = ref<SortingState>([])
const expanded = ref<ExpandedState>({})

// =========================
// SORTABLE
// =========================

const tableRef = ref<{ $el: HTMLElement } | null>(null)
const tableBodyRef = ref<HTMLElement | null>(null)

const handleSortEnd = async (evt: any) => {
  const { oldIndex, newIndex } = evt
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return

  const rows = table.getRowModel().rows
  const reordered = [...rows]
  const [moved] = reordered.splice(oldIndex, 1)
  if (!moved) return

  reordered.splice(newIndex, 0, moved)

  const items = reordered.map((row, index) => ({
    id: row.original.id,
    order: index
  }))

  try {
    await store.reorder(items)
    await loadTree()
    toast.add({ title: 'Orden guardado', color: 'success' })
  } catch {
    toast.add({ title: 'Error al guardar el orden', color: 'error' })
  }
}

onMounted(() => {
  tableBodyRef.value = tableRef.value?.$el?.querySelector('tbody') ?? null
})

useSortable(tableBodyRef, tree, {
  animation: 150,
  handle: '.drag-handle',
  onEnd: (evt) => handleSortEnd(evt)
})

// =========================
// COLUMNS
// =========================

const columns: ColumnDef<any>[] = [
  // Handle drag
  {
    id: 'drag',
    enableSorting: false,
    size: 32,
    cell: () =>
      h(
        'div',
        {
          class:
            'drag-handle flex items-center justify-center cursor-grab active:cursor-grabbing text-muted hover:text-default transition-colors px-1'
        },
        [h(resolveComponent('UIcon'), { name: 'i-lucide-grip-vertical', class: 'size-4' })]
      )
  },

  // Nombre + expand + badge tipo
  {
    id: 'name',
    accessorFn: (row) => row.child_product?.name,
    header: 'Componente',
    enableSorting: true,
    cell: ({ row, getValue }) => {
      const UButton = resolveComponent('UButton')
      const UBadge = resolveComponent('UBadge')

      const depth = row.depth
      const hasChildren = row.getCanExpand()
      const productType = row.original.child_product?.product_type as string
      const variantName = row.original.child_variant?.name
      const sku = row.original.child_product?.sku

      return h(
        'div',
        {
          class: 'flex items-center gap-2',
          style: { paddingLeft: `${depth * 1.5}rem` }
        },
        [
          hasChildren
            ? h(UButton, {
                icon: row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
                variant: 'ghost',
                color: 'neutral',
                size: 'xs',
                square: true,
                onClick: row.getToggleExpandedHandler()
              })
            : h('div', { class: 'size-6 shrink-0' }),

          h(UBadge, {
            label: PRODUCT_TYPE_LABELS[productType] ?? '—',
            color: PRODUCT_TYPE_COLORS[productType] ?? 'neutral',
            variant: 'subtle',
            size: 'xs',
            class: 'shrink-0'
          }),

          h('div', { class: 'flex flex-col min-w-0 flex-1' }, [
            h('div', { class: 'flex items-center gap-1.5' }, [
              h('span', { class: 'text-sm font-medium truncate' }, getValue() as string),
              variantName ? h('span', { class: 'text-xs text-muted shrink-0' }, `· ${variantName}`) : null
            ]),
            sku ? h('span', { class: 'text-xs text-muted font-mono' }, sku) : null
          ]),

          // Botón + en hover
          h(UButton, {
            icon: 'i-lucide-plus',
            variant: 'ghost',
            color: 'neutral',
            size: 'xs',
            square: true,
            class: 'shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity',
            title: 'Agregar componente hijo',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('addChild', row.original)
            }
          })
        ]
      )
    }
  },

  // Cantidad + unidad + desperdicio
  {
    id: 'quantity',
    accessorFn: (row) => row.quantity,
    header: 'Cantidad',
    enableSorting: true,
    cell: ({ row, getValue }) => {
      const UBadge = resolveComponent('UBadge')
      const units = row.original.units?.symbol
      const waste = row.original.waste_percentage

      return h('div', { class: 'flex items-center gap-2 tabular-nums' }, [
        h('span', { class: 'text-sm font-medium' }, `× ${getValue()}`),
        units ? h('span', { class: 'text-xs text-muted' }, units) : null,
        waste ? h(UBadge, { label: `+${waste}%`, color: 'warning', variant: 'subtle', size: 'xs' }) : null
      ])
    }
  },

  // Dimensiones
  {
    id: 'dimensions',
    header: 'Dimensiones',
    enableSorting: false,
    cell: ({ row }) => {
      const { length_mm, width_mm, height_mm } = row.original
      if (!length_mm && !width_mm && !height_mm) {
        return h('span', { class: 'text-muted text-sm' }, '—')
      }
      const parts = [length_mm, width_mm, height_mm].filter(Boolean).map(String)
      return h('span', { class: 'text-xs text-muted tabular-nums' }, `${parts.join(' × ')} mm`)
    }
  },

  // Costo
  {
    id: 'cost',
    accessorFn: (row) => row.child_product?.current_cost,
    header: 'Costo',
    enableSorting: true,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ getValue }) => {
      const val = getValue() as number | null
      if (!val) return h('span', { class: 'text-muted text-sm' }, '—')
      return h('span', { class: 'text-sm tabular-nums text-muted' }, `$${Number(val).toLocaleString('es-AR')}`)
    }
  },

  // Acciones
  {
    id: 'actions',
    enableSorting: false,
    size: 48,
    cell: ({ row }) => {
      const UDropdownMenu = resolveComponent('UDropdownMenu')
      const UButton = resolveComponent('UButton')

      const items = [
        [
          {
            label: 'Editar',
            icon: 'i-lucide-pencil',
            onSelect: () => emit('editNode', row.original)
          },
          {
            label: 'Agregar hijo',
            icon: 'i-lucide-plus',
            onSelect: () => emit('addChild', row.original)
          },
          {
            label: 'Mover a...',
            icon: 'i-lucide-move',
            onSelect: () => handleMoveNode(row.original)
          }
        ],
        [
          {
            label: 'Eliminar',
            icon: 'i-lucide-trash',
            color: 'error' as const,
            onSelect: () => emit('deleteNode', row.original)
          }
        ]
      ]

      return h(
        UDropdownMenu,
        { items },
        {
          default: () =>
            h(UButton, {
              icon: 'i-lucide-ellipsis-vertical',
              variant: 'ghost',
              color: 'neutral',
              size: 'xs',
              square: true,
              onClick: (e: Event) => e.stopPropagation()
            })
        }
      )
    }
  }
]

// =========================
// TABLE INSTANCE
// =========================

const table = useVueTable({
  get data() {
    return tree.value
  },
  columns,
  getRowId: (row) => row.id,
  state: {
    get sorting() {
      return sorting.value
    },
    get expanded() {
      return expanded.value
    }
  },
  getSubRows: (row) => row.children,
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  onExpandedChange: (updater) => {
    expanded.value = typeof updater === 'function' ? updater(expanded.value) : updater
  }
})

// Expandir todo al cargar
watch(
  tree,
  (val) => {
    if (!val.length) return
    const allExpanded: Record<string, boolean> = {}
    const expandAll = (nodes: any[]) => {
      nodes.forEach((node) => {
        allExpanded[node.id] = true
        if (node.children?.length) expandAll(node.children)
      })
    }
    expandAll(val)
    expanded.value = allExpanded
  },
  { immediate: true }
)
// =========================
// MOVE MODAL
// =========================

const showMoveModal = ref(false)
const movingNode = ref<any | null>(null)

const handleMoveNode = (node: any) => {
  movingNode.value = node
  showMoveModal.value = true
}

const handleMoved = async () => {
  showMoveModal.value = false
  movingNode.value = null
  await loadTree()
}
onMounted(() => loadTree())
</script>

<template>
  <div class="space-y-2">
    <!-- Estado vacío -->
    <div v-if="!loading && !hasTree" class="flex flex-col items-center gap-3 py-10 text-center">
      <UIcon name="i-lucide-layers" class="size-10 text-muted" />
      <div>
        <p class="text-sm font-medium">Sin componentes de ingeniería</p>
        <p class="text-xs text-muted mt-1">Agregá el primer componente para construir el árbol</p>
      </div>
      <UButton label="Agregar componente" icon="i-lucide-plus" size="sm" @click="emit('addChild', null)" />
    </div>

    <!-- Tabla -->
    <template v-else>
      <p class="text-xs text-muted flex items-center gap-1">
        <UIcon name="i-lucide-grip-vertical" class="size-3" />
        Arrastrá las filas para reordenar componentes del mismo nivel
      </p>

      <UTable
        ref="tableRef"
        :data="tree"
        :columns="columns"
        :table="table"
        :loading="loading"
        :get-sub-rows="(row: any) => row.children"
        :ui="{
          tbody: 'engineering-tree-tbody',
          tr: 'group/row hover:bg-elevated transition-colors',
          td: 'py-2'
        }"
        class="w-full"
      />
    </template>
  </div>

  <UModal v-model:open="showMoveModal" title="Mover componente">
    <template #body>
      <EngineeringMoveModal
        v-if="movingNode"
        :component-id="movingNode.id"
        :component-name="movingNode.child_product?.name"
        :current-parent-id="movingNode.parent_product_id"
        :product-root-id="productId"
        @moved="handleMoved"
        @cancelled="showMoveModal = false"
      />
    </template>
  </UModal>
</template>
