<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import { useCategoriesStore } from '~/modulos/almacen/categories/store/categories.store'
import Sortable from 'sortablejs'

const categoryStore = useCategoriesStore()
const { tree: cats, loading } = storeToRefs(categoryStore)

// Transformar categorías a TreeItem (con referencia al id original)
function categoryToTreeItem(cat: Category): TreeItem & { _id: string } {
  return {
    label: cat.name,
    value: cat.id,
    _id: cat.id,
    icon: cat.children.length ? 'i-lucide-folder' : 'i-lucide-tag',
    defaultExpanded: cat.children.length > 0,
    children: cat.children.map(categoryToTreeItem)
  }
}

const items = shallowRef<TreeItem[]>(
  (categoryStore.tree ?? []).map(categoryToTreeItem)
)

watch(
  () => categoryStore.tree,
  async (cats) => {
    if (cats) {
      items.value = cats.map(categoryToTreeItem)
      await nextTick()
      initSortables() // ← re-registrar sortables cuando cambia el árbol
    }
  }
)

// ---- Drag & Drop con anidamiento ----

const tree = useTemplateRef<HTMLElement>('tree')
const sortableInstances: Sortable[] = []

function destroySortables() {
  sortableInstances.forEach((s) => s.destroy())
  sortableInstances.length = 0
}

// Busca un item por value en el árbol y devuelve {item, parent, index}
function findItem(
  value: string,
  list: TreeItem[],
  parent: TreeItem[] | null = null
): { item: TreeItem; parent: TreeItem[]; index: number } | null {
  for (let i = 0; i < list.length; i++) {
    if ((list[i] as any).value === value) {
      return { item: list[i], parent: parent ?? list, index: i }
    }
    if (list[i].children?.length) {
      const found = findItem(value, list[i].children!, list[i].children!)
      if (found) return found
    }
  }
  return null
}

// Obtiene todos los ULs del árbol para instalar Sortable en cada uno
function initSortables() {
  destroySortables()
  if (!tree.value) return

  const el = (tree.value as any).$el ?? tree.value

  // El primer nivel + todos los sub-niveles
  const lists = [el, ...el.querySelectorAll('ul')]

  lists.forEach((list: HTMLElement) => {
    const instance = Sortable.create(list, {
      group: 'categories', // ← clave para poder mover entre niveles
      animation: 150,
      ghostClass: 'opacity-40',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onEnd(evt) {
        const draggedId = evt.item.dataset.value
        const toListEl = evt.to
        const fromListEl = evt.from
        if (!draggedId) return

        // Reversa del DOM — SortableJS ya movió el DOM, revertimos
        // para que Vue controle el estado
        const movedNode = evt.item
        if (evt.oldIndex !== undefined) {
          const ref = fromListEl.children[evt.oldIndex]
          fromListEl.insertBefore(movedNode, ref ?? null)
        }

        // Encontrar el parent destino por el data-value del UL padre
        const parentEl = toListEl.closest('li')
        const parentId = parentEl?.dataset.value ?? null

        // Calcular nuevo índice
        const newIndex = evt.newIndex ?? 0

        // Mover en el árbol reactivo
        const cloned = structuredClone(items.value) as any[]
        moveInTree(cloned, draggedId, parentId, newIndex)
        items.value = cloned

        // Guardar en store
        categoryStore.reorderCategory({
          id: draggedId,
          newParentId: parentId,
          newIndex
        })

        // Re-inicializar sortables tras el cambio de estructura
        nextTick(initSortables)
      }
    })
    sortableInstances.push(instance)
  })
}

function moveInTree(
  list: any[],
  draggedId: string,
  newParentId: string | null,
  newIndex: number
) {
  // 1. Extraer el item del árbol
  let dragged: any = null

  function extract(arr: any[]): boolean {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].value === draggedId) {
        ;[dragged] = arr.splice(i, 1)
        return true
      }
      if (arr[i].children?.length && extract(arr[i].children)) return true
    }
    return false
  }

  extract(list)
  if (!dragged) return

  // 2. Insertar en el nuevo padre
  if (newParentId === null) {
    list.splice(newIndex, 0, dragged)
  } else {
    function insert(arr: any[]): boolean {
      for (const node of arr) {
        if (node.value === newParentId) {
          node.children = node.children ?? []
          node.icon = 'i-lucide-folder'
          node.defaultExpanded = true
          node.children.splice(newIndex, 0, dragged)
          return true
        }
        if (node.children?.length && insert(node.children)) return true
      }
      return false
    }
    insert(list)
  }
}

onMounted(async () => {
  await categoryStore.fetchTree()
  await nextTick()
  initSortables()
})
onUnmounted(destroySortables)
</script>

<template>
  <UTree ref="tree" :items="items" :nested="true" :unmount-on-hide="false" />
</template>
