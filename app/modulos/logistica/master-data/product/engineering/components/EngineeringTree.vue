<script setup lang="ts">
import { getCoreRowModel, getExpandedRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import type { ColumnDef, SortingState, ExpandedState } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { useSortable } from '@vueuse/integrations/useSortable'
import { useEngineering } from '../composables/useEngineering'
import { useEngineeringStore } from '../store/engineering.store'
import type { EngineeringTreeNode } from '../types/engineering.types'
import { computeNodeCalculations, type NodeCalculations } from '../utils/engineering-calculator.util'
import EngineeringMoveModal from './EngineeringMoveModal.vue'
import AddComponentModal from './AddComponentModal.vue'

const props = defineProps<{
  productId: string
  costSource?: string
}>()

const emit = defineEmits<{
  deleteNode: [node: any]
}>()

const { tree, loading, hasTree, loadTree, updateComponent } = useEngineering(props.productId)
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
// TABS
// =========================

const activeView = ref('tree')

const viewTabs = [
  { label: 'Estructura', slot: 'tree', value: 'tree' },
  { label: 'Resumen materiales', slot: 'summary', value: 'summary' }
]

// =========================
// ADD COMPONENT MODAL STATE
// =========================

const showAddModal = ref(false)
const addModalParentId = ref<string | null>(null)
const addModalParentName = ref('')

const openAddRoot = () => {
  addModalParentId.value = null
  addModalParentName.value = ''
  showAddModal.value = true
}

const openAddChild = (node: any) => {
  addModalParentId.value = node.child_product_id
  addModalParentName.value = node.child_product?.name ?? ''
  showAddModal.value = true
}

const onAddSaved = async () => {
  await loadTree()
}

// =========================
// INLINE EDITING STATE
// =========================

const editingRowId = ref<string | null>(null)
const editingForm = ref<Partial<EngineeringTreeNode> | null>(null)
const savingRowId = ref<string | null>(null)

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
// CÁLCULOS POR NODO
// =========================

const calcCache = new WeakMap<any, NodeCalculations>()

const getCalc = (node: any): NodeCalculations => {
  let cached = calcCache.get(node)
  if (!cached) {
    cached = computeNodeCalculations(node)
    calcCache.set(node, cached)
  }
  return cached
}

const formatMoney = (amount: number | string | null | undefined) => {
  const num = Number(amount) || 0
  return `$ ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const countChildren = (node: EngineeringTreeNode): number => {
  if (!node.children?.length) return 0
  let count = node.children.length
  for (const child of node.children) {
    count += countChildren(child)
  }
  return count
}

// =========================
// CONSOLIDATE MATERIALS
// =========================

interface ConsolidatedMaterial {
  product_id: string
  product_name: string
  product_sku: string | null
  product_type: string
  variant_id: string | null
  variant_name: string | null
  thickness_mm: string | null
  density_kg_m3: string | null
  calculation_type: string
  occurrences: number
  total_weight_kg: number
  total_surface_m2: number
  total_volume_m3: number
  total_cost: number
  unit_label: string
  total_quantity: number
}

const collectLeaves = (nodes: any[]): any[] => {
  const leaves: any[] = []
  for (const node of nodes) {
    if (!node.children?.length) {
      leaves.push(node)
    } else {
      leaves.push(...collectLeaves(node.children))
    }
  }
  return leaves
}

const consolidatedMaterials = computed<ConsolidatedMaterial[]>(() => {
  const leaves = collectLeaves(tree.value)
  const map = new Map<string, ConsolidatedMaterial>()

  for (const leaf of leaves) {
    const calc = getCalc(leaf)
    const productId = leaf.child_product_id
    const variantId = leaf.child_variant_id ?? null
    const key = `${productId}::${variantId ?? 'base'}`

    if (!map.has(key)) {
      const calcType = leaf.child_product?.calculation_type ?? 'UNIT'
      let unitLabel = 'un'
      if (calcType === 'SURFACE') unitLabel = 'kg'
      else if (calcType === 'LINEAR') unitLabel = 'm'
      else if (calcType === 'VOLUME') unitLabel = 'm³'

      map.set(key, {
        product_id: productId,
        product_name: leaf.child_product?.name ?? '—',
        product_sku: leaf.child_product?.sku ?? null,
        product_type: leaf.child_product?.product_type ?? 'RAW_MATERIAL',
        variant_id: variantId,
        variant_name: leaf.child_variant?.name ?? null,
        thickness_mm: leaf.child_variant?.thickness_mm ?? null,
        density_kg_m3: leaf.child_variant?.density_kg_m3 ?? null,
        calculation_type: calcType,
        occurrences: 0,
        total_weight_kg: 0,
        total_surface_m2: 0,
        total_volume_m3: 0,
        total_cost: 0,
        unit_label: unitLabel,
        total_quantity: 0,
      })
    }

    const entry = map.get(key)!
    entry.occurrences += 1
    entry.total_weight_kg += calc.calculated_weight_kg
    entry.total_surface_m2 += calc.surface_m2
    entry.total_volume_m3 += calc.volume_m3
    entry.total_cost += calc.total_cost

    if (entry.calculation_type === 'SURFACE') {
      entry.total_quantity += calc.calculated_weight_kg
    } else if (entry.calculation_type === 'LINEAR') {
      const lengthM = (Number(leaf.length_mm) || 0) / 1000
      const waste = Number(leaf.waste_percentage) || 0
      entry.total_quantity += lengthM * (1 + waste / 100)
    } else if (entry.calculation_type === 'VOLUME') {
      entry.total_quantity += calc.volume_m3
    } else {
      entry.total_quantity += Number(leaf.quantity) || 1
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost)
})

// =========================
// SUMMARY TABLE COLUMNS
// =========================

const summaryColumns: ColumnDef<ConsolidatedMaterial>[] = [
  {
    accessorKey: 'product_name',
    header: 'Material',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex flex-col gap-0.5' }, [
        h('div', { class: 'flex items-center gap-1.5' }, [
          h(resolveComponent('UBadge'), {
            label: PRODUCT_TYPE_LABELS[item.product_type] ?? '—',
            color: PRODUCT_TYPE_COLORS[item.product_type] ?? 'neutral',
            variant: 'subtle',
            size: 'xs'
          }),
          h('span', { class: 'text-sm font-medium text-default' }, item.product_name)
        ]),
        h('div', { class: 'flex items-center gap-2 mt-0.5' }, [
          item.product_sku
            ? h('span', { class: 'text-xs text-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded' }, item.product_sku)
            : null,
          item.variant_name
            ? h('span', { class: 'text-xs text-muted' }, item.variant_name)
            : null,
        ])
      ])
    }
  },
  {
    accessorKey: 'thickness_mm',
    header: 'Especificaciones',
    cell: ({ row }) => {
      const item = row.original
      const specs: string[] = []
      if (item.thickness_mm) specs.push(`${item.thickness_mm}mm`)
      if (item.density_kg_m3) specs.push(`ρ=${item.density_kg_m3}`)
      return h('span', { class: 'text-xs text-muted' }, specs.length ? specs.join(' · ') : '—')
    }
  },
  {
    accessorKey: 'total_quantity',
    header: 'Cantidad total',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex flex-col items-end' }, [
        h('span', { class: 'text-sm font-semibold tabular-nums' }, `${item.total_quantity.toFixed(2)}`),
        h('span', { class: 'text-[10px] text-muted' }, item.unit_label)
      ])
    }
  },
  {
    accessorKey: 'total_weight_kg',
    header: 'Peso (kg)',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const val = row.original.total_weight_kg
      if (!val) return h('span', { class: 'text-xs text-muted' }, '—')
      return h('span', { class: 'text-sm font-semibold tabular-nums' }, `${val.toFixed(2)} kg`)
    }
  },
  {
    accessorKey: 'total_surface_m2',
    header: 'Sup. (m²)',
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }) => {
      const val = row.original.total_surface_m2
      if (!val) return h('span', { class: 'text-xs text-muted' }, '—')
      return h('span', { class: 'text-sm font-semibold tabular-nums' }, `${val.toFixed(4)} m²`)
    }
  },
  {
    accessorKey: 'total_cost',
    header: 'Costo total',
    meta: { class: { th: 'text-right', td: 'text-right font-semibold' } },
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, formatMoney(row.original.total_cost))
  },
  {
    accessorKey: 'occurrences',
    header: 'Usos',
    meta: { class: { th: 'text-center', td: 'text-center' } },
    cell: ({ row }) => {
      const count = row.original.occurrences
      if (count <= 1) return h('span', { class: 'text-muted text-sm' }, '—')
      return h(resolveComponent('UBadge'), {
        label: `×${count}`,
        color: 'warning',
        variant: 'subtle',
        size: 'xs'
      })
    }
  }
]

// =========================
// INLINE EDITING
// =========================

const startEditing = (node: EngineeringTreeNode) => {
  editingRowId.value = node.id
  editingForm.value = {
    quantity: node.quantity,
    waste_percentage: node.waste_percentage ?? undefined,
    length_mm: node.length_mm ?? undefined,
    width_mm: node.width_mm ?? undefined,
    height_mm: node.height_mm ?? undefined
  }
}

const cancelEdit = () => {
  editingRowId.value = null
  editingForm.value = null
}

const saveEdit = async (node: EngineeringTreeNode) => {
  if (!editingForm.value) return

  savingRowId.value = node.id
  try {
    await updateComponent(node.id, {
      quantity: editingForm.value.quantity,
      waste_percentage: editingForm.value.waste_percentage,
      length_mm: editingForm.value.length_mm,
      width_mm: editingForm.value.width_mm,
      height_mm: editingForm.value.height_mm
    })
    toast.add({ title: 'Componente actualizado', color: 'success' })
    cancelEdit()
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message || 'No se pudo actualizar el componente.',
      color: 'error'
    })
  } finally {
    savingRowId.value = null
  }
}

// =========================
// TREE COLUMNS
// =========================

const columns: ColumnDef<any>[] = [
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
  {
    id: 'name',
    accessorFn: (row) => row.child_product?.name,
    header: 'Componente',
    enableSorting: true,
    size: 280,
    cell: ({ row, getValue }) => {
      const UButton = resolveComponent('UButton')
      const UBadge = resolveComponent('UBadge')

      const depth = row.depth
      const hasChildren = row.getCanExpand()
      const productType = row.original.child_product?.product_type as string
      const variantName = row.original.child_variant?.name
      const sku = row.original.child_product?.sku
      const childCount = countChildren(row.original)

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
                class: 'shrink-0',
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
            h('div', { class: 'flex items-center gap-1.5 flex-wrap' }, [
              h('span', { class: 'text-sm font-bold text-default truncate' }, getValue() as string),
              variantName ? h('span', { class: 'text-xs text-muted shrink-0' }, `(${variantName})`) : null
            ]),
            h('div', { class: 'flex items-center gap-2 flex-wrap mt-1' }, [
              sku
                ? h(
                    'span',
                    { class: 'text-xs text-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded' },
                    sku
                  )
                : null,
              hasChildren
                ? h('span', { class: 'text-xs font-medium text-blue-600 dark:text-blue-400' }, `${childCount} sub`)
                : null
            ])
          ])
        ]
      )
    }
  },
  {
    id: 'dimensions',
    header: 'Dimensiones',
    enableSorting: false,
    size: 120,
    cell: ({ row }) => {
      const isEditing = editingRowId.value === row.original.id

      if (isEditing) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(resolveComponent('UInput'), {
            modelValue: editingForm.value?.length_mm,
            'onUpdate:modelValue': (v: number) => {
              if (editingForm.value) editingForm.value.length_mm = v
            },
            type: 'number',
            placeholder: 'L',
            size: 'sm',
            class: 'w-14'
          }),
          h('span', { class: 'text-xs text-muted' }, '×'),
          h(resolveComponent('UInput'), {
            modelValue: editingForm.value?.width_mm,
            'onUpdate:modelValue': (v: number) => {
              if (editingForm.value) editingForm.value.width_mm = v
            },
            type: 'number',
            placeholder: 'A',
            size: 'sm',
            class: 'w-14'
          }),
          h('span', { class: 'text-xs text-muted' }, '×'),
          h(resolveComponent('UInput'), {
            modelValue: editingForm.value?.height_mm,
            'onUpdate:modelValue': (v: number) => {
              if (editingForm.value) editingForm.value.height_mm = v
            },
            type: 'number',
            placeholder: 'H',
            size: 'sm',
            class: 'w-14'
          })
        ])
      }

      const { length_mm, width_mm, height_mm } = row.original
      const hasDims = length_mm || width_mm || height_mm

      if (!hasDims) {
        return h(
          'span',
          {
            class: 'text-xs text-muted cursor-pointer hover:bg-elevated rounded px-1 py-0.5',
            onDblclick: () => startEditing(row.original)
          },
          '—'
        )
      }

      const parts = [length_mm, width_mm, height_mm].filter(Boolean).map(String)
      return h(
        'span',
        {
          class: 'text-xs text-default font-mono cursor-pointer hover:bg-elevated rounded px-1 py-0.5',
          onDblclick: () => startEditing(row.original)
        },
        `${parts.join(' × ')} mm`
      )
    }
  },
  {
    id: 'quantity',
    accessorFn: (row) => row.quantity,
    header: 'Cant.',
    enableSorting: true,
    size: 70,
    cell: ({ row }) => {
      const isEditing = editingRowId.value === row.original.id

      if (isEditing) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(resolveComponent('UInput'), {
            modelValue: editingForm.value?.quantity,
            'onUpdate:modelValue': (v: number) => {
              if (editingForm.value) editingForm.value.quantity = v
            },
            type: 'number',
            step: '0.001',
            min: '0',
            size: 'sm',
            class: 'w-16',
            autofocus: true
          })
        ])
      }

      const units = row.original.units?.symbol
      return h(
        'div',
        {
          class: 'flex items-center gap-1 cursor-pointer hover:bg-elevated rounded px-1 py-0.5',
          onDblclick: () => startEditing(row.original)
        },
        [
          h('span', { class: 'text-sm font-bold tabular-nums' }, `${row.getValue('quantity')}`),
          units ? h('span', { class: 'text-xs text-muted' }, units) : null
        ]
      )
    }
  },
  {
    id: 'weight',
    header: 'Peso (kg)',
    enableSorting: true,
    size: 100,
    cell: ({ row }) => {
      const calc = getCalc(row.original)
      const qty = Number(row.original.quantity) || 1
      const totalWeight = calc.calculated_weight_kg * qty

      if (!calc.calculated_weight_kg) {
        return h('span', { class: 'text-xs text-muted' }, '—')
      }

      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'text-xs font-semibold text-default tabular-nums' }, `${totalWeight.toFixed(2)} kg`),
        qty > 1 ? h('span', { class: 'text-[10px] text-muted' }, `(${calc.calculated_weight_kg.toFixed(2)} c/u)`) : null
      ])
    }
  },
  {
    id: 'surface',
    header: 'Sup. (m²)',
    enableSorting: true,
    size: 90,
    cell: ({ row }) => {
      const calc = getCalc(row.original)
      if (!calc.surface_m2) return h('span', { class: 'text-xs text-muted' }, '—')
      return h('span', { class: 'text-xs font-semibold tabular-nums' }, `${calc.surface_m2.toFixed(4)} m²`)
    }
  },
  {
    id: 'material',
    header: 'Material / Specs',
    enableSorting: false,
    size: 150,
    cell: ({ row }) => {
      const variant = row.original.child_variant
      if (!variant) {
        return h('span', { class: 'text-xs text-muted' }, '—')
      }

      return h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: 'text-xs font-medium text-default' }, variant.name),
        h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
          variant.thickness_mm
            ? h(
                'span',
                { class: 'text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded' },
                `${variant.thickness_mm}mm`
              )
            : null,
          variant.density_kg_m3
            ? h(
                'span',
                { class: 'text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded tabular-nums' },
                `ρ=${variant.density_kg_m3}`
              )
            : null
        ])
      ])
    }
  },
  {
    id: 'cost',
    header: 'Costo',
    enableSorting: true,
    size: 110,
    cell: ({ row }) => {
      const calc = getCalc(row.original)

      if (!calc.total_cost) {
        return h('span', { class: 'text-xs text-muted' }, '—')
      }

      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'text-xs font-semibold text-default tabular-nums' }, formatMoney(calc.total_cost)),
        calc.unit_cost
          ? h('span', { class: 'text-[10px] text-muted' }, `(${formatMoney(calc.unit_cost)}/u)`)
          : null
      ])
    }
  },
  {
    id: 'actions',
    enableSorting: false,
    size: 60,
    cell: ({ row }) => {
      const UDropdownMenu = resolveComponent('UDropdownMenu')
      const UButton = resolveComponent('UButton')

      const isEditing = editingRowId.value === row.original.id

      if (isEditing) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h(UButton, {
            icon: 'i-lucide-check',
            variant: 'ghost',
            color: 'success',
            size: 'xs',
            square: true,
            loading: savingRowId.value === row.original.id,
            onClick: () => saveEdit(row.original)
          }),
          h(UButton, {
            icon: 'i-lucide-x',
            variant: 'ghost',
            color: 'neutral',
            size: 'xs',
            square: true,
            onClick: cancelEdit
          })
        ])
      }

      const items = [
        [
          {
            label: 'Agregar hijo',
            icon: 'i-lucide-plus',
            onSelect: () => openAddChild(row.original)
          },
          {
            label: 'Editar cantidad',
            icon: 'i-lucide-pencil',
            onSelect: () => startEditing(row.original)
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

onMounted(async () => {
  await loadTree()
})
</script>

<template>
  <div class="space-y-3">
    <!-- Estado vacío -->
    <div v-if="!loading && !hasTree" class="flex flex-col items-center gap-3 py-10 text-center">
      <UIcon name="i-lucide-layers" class="size-10 text-muted" />
      <div>
        <p class="text-sm font-medium">Sin componentes</p>
        <p class="text-xs text-muted mt-1">Agregá el primer componente para construir el árbol</p>
      </div>
      <UButton label="Agregar componente" icon="i-lucide-plus" size="sm" @click="openAddRoot" />
    </div>

    <!-- Toolbar: Agregar + Info -->
    <div v-if="hasTree" class="flex justify-between items-center gap-2">
      <UButton label="Agregar componente" icon="i-lucide-plus" size="sm" variant="soft" @click="openAddRoot" />
    </div>

    <!-- Info de uso -->
    <template v-if="hasTree">
      <p class="text-xs text-muted flex items-center gap-1.5">
        <UIcon name="i-lucide-info" class="size-3.5" />
        <span>Doble clic en dimensiones/cantidad para editar</span>
        <span>·</span>
        <span>Arrastrá para reordenar</span>
      </p>
    </template>

    <!-- Tabs -->
    <template v-if="hasTree">
      <UTabs v-model="activeView" :items="viewTabs" variant="link">
        <!-- TAB: ESTRUCTURA -->
        <template #tree>
          <div class="border border-default rounded-lg overflow-hidden">
            <UTable
              ref="tableRef"
              :data="tree"
              :columns="columns"
              :table="table"
              :loading="loading"
              :get-sub-rows="(row: any) => row.children"
              class="w-full text-sm"
              :ui="{
                base: 'border-separate border-spacing-0',
                thead: 'bg-slate-50 dark:bg-slate-900',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                tr: 'group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                td: 'py-2.5 px-3 empty:p-0 group-has-[td:not(:empty)]:border-b border-default text-sm',
                th: 'py-2 px-3 text-left font-semibold text-muted text-xs uppercase tracking-wide'
              }"
            />
          </div>
        </template>

        <!-- TAB: RESUMEN MATERIALES -->
        <template #summary>
          <div v-if="consolidatedMaterials.length === 0" class="py-8 text-center text-sm text-muted">
            No hay materiales para resumir. Agregá componentes al árbol.
          </div>
          <div v-else class="border border-default rounded-lg overflow-hidden">
            <UTable
              :data="consolidatedMaterials"
              :columns="summaryColumns"
              class="w-full text-sm"
              :ui="{
                base: 'border-separate border-spacing-0',
                thead: 'bg-slate-50 dark:bg-slate-900',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                tr: 'group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                td: 'py-2.5 px-3 empty:p-0 group-has-[td:not(:empty)]:border-b border-default text-sm',
                th: 'py-2 px-3 text-left font-semibold text-muted text-xs uppercase tracking-wide'
              }"
            />
          </div>
        </template>
      </UTabs>
    </template>

    <!-- Modal agregar componente -->
    <AddComponentModal
      v-model:open="showAddModal"
      :product-id="productId"
      :parent-id="addModalParentId"
      :parent-name="addModalParentName"
      :cost-source="costSource"
      @saved="onAddSaved"
    />

    <!-- Modal mover -->
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
  </div>
</template>
