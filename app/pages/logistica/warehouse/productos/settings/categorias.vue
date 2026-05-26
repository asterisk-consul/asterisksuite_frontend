<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import type { Category } from '~/modulos/almacen/categories/types/categories.types'
import { useCategoriesStore } from '~/modulos/almacen/categories/store/categories.store'
import Sortable from 'sortablejs'

const categoryStore = useCategoriesStore()

function categoryToTreeItem(cat: Category): TreeItem & { _id: string } {
  return {
    label: cat.name,
    value: cat.id,
    _id: cat.id,
    icon: 'i-lucide-folder',
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
      initSortables()
    }
  }
)

// ---- Modal ----
const modalOpen = ref(false)
const newCategoryName = ref('')
const selectedParentId = ref<string | null>(null)

function openAddModal(parentId: string | null = null) {
  selectedParentId.value = parentId
  newCategoryName.value = ''
  modalOpen.value = true
}

async function handleCreate() {
  if (!newCategoryName.value.trim()) return
  await categoryStore.create({
    name: newCategoryName.value.trim(),
    parent_id: selectedParentId.value ?? undefined
  })
  await categoryStore.fetchTree()
  modalOpen.value = false
}

// ---- Drag & Drop ----
const tree = useTemplateRef<HTMLElement>('tree')
const sortableInstances: Sortable[] = []

// Hover-to-nest
const HOVER_DELAY = 650
let hoverTimer: ReturnType<typeof setTimeout> | null = null
let hoverLi: HTMLElement | null = null

function clearHover() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = null
  if (hoverLi) {
    hoverLi.classList.remove(
      'outline',
      'outline-2',
      'outline-offset-2',
      'outline-primary'
    )
    hoverLi = null
  }
}

function destroySortables() {
  sortableInstances.forEach((s) => s.destroy())
  sortableInstances.length = 0
}

function annotateDOM(itemsList: any[], container: HTMLElement) {
  const lis = Array.from(container.children).filter(
    (el) => el.tagName === 'LI'
  ) as HTMLElement[]

  itemsList.forEach((item, i) => {
    const li = lis[i]
    if (!li) return
    li.dataset.value = item.value
    if (item.children?.length) {
      const nestedUl = li.querySelector('ul') as HTMLElement | null
      if (nestedUl) annotateDOM(item.children, nestedUl)
    }
  })
}

// Handler de fin de drag — compartido por todas las instancias
function handleDragEnd(evt: Sortable.SortableEvent) {
  const draggedId = evt.item.dataset.value
  const toListEl = evt.to as HTMLElement
  const fromListEl = evt.from as HTMLElement

  clearHover()

  if (!draggedId) {
    nextTick(initSortables)
    return
  }

  // Revertir DOM para que Vue controle el estado
  const movedNode = evt.item
  if (evt.oldIndex !== undefined) {
    const ref = fromListEl.children[evt.oldIndex]
    fromListEl.insertBefore(movedNode, ref ?? null)
  }

  const parentLi = toListEl.closest('li') as HTMLElement | null
  const parentId = parentLi?.dataset.value ?? null

  // Evitar que un nodo sea hijo de sí mismo
  if (parentId === draggedId) {
    nextTick(initSortables)
    return
  }

  const newIndex = evt.newIndex ?? 0

  const cloned = structuredClone(items.value) as any[]
  moveInTree(cloned, draggedId, parentId, newIndex)
  items.value = cloned

  categoryStore.update(draggedId, {
    parent_id: parentId ?? undefined
  })

  nextTick(initSortables)
}

function registerSortableOnList(list: HTMLElement) {
  const instance = Sortable.create(list, {
    group: 'categories',
    animation: 150,
    ghostClass: 'opacity-40',
    fallbackOnBody: true,
    swapThreshold: 0.65,
    filter: '.no-drag',
    preventOnFilter: false,
    onEnd: handleDragEnd
  })
  sortableInstances.push(instance)
}

// Añade un <ul> temporal a un <li> hoja y registra Sortable en él
function injectTempList(li: HTMLElement) {
  if (li.querySelector('ul')) return // ya tiene hijos, no hace falta

  const tempUl = document.createElement('ul')
  tempUl.dataset.temp = 'true'
  tempUl.style.minHeight = '6px' // altura mínima para poder soltar
  li.appendChild(tempUl)

  registerSortableOnList(tempUl)
}

// Escucha dragenter/dragleave nativos en cada <li> hoja
function addHoverListeners(container: HTMLElement) {
  const lis = Array.from(container.querySelectorAll('li')) as HTMLElement[]

  lis.forEach((li) => {
    li.addEventListener('dragenter', (e) => {
      // Solo actuar en nodos hoja (sin <ul>)
      if (li.querySelector('ul')) return
      if (!li.dataset.value) return

      e.stopPropagation()

      if (hoverLi === li) return // ya estamos en este nodo

      clearHover()
      hoverLi = li

      // Feedback visual: outline animado mientras espera
      li.classList.add(
        'outline',
        'outline-2',
        'outline-offset-2',
        'outline-primary'
      )

      hoverTimer = setTimeout(() => {
        injectTempList(li)
        // El outline se quita porque ahora ya tiene <ul> y pasará a ser padre
        li.classList.remove(
          'outline',
          'outline-2',
          'outline-offset-2',
          'outline-primary'
        )
        hoverLi = null
        hoverTimer = null
      }, HOVER_DELAY)
    })

    li.addEventListener('dragleave', (e) => {
      if (hoverLi !== li) return

      // Solo cancelar si realmente salimos del <li> (no a un hijo)
      const related = e.relatedTarget as HTMLElement | null
      if (!related || !li.contains(related)) {
        clearHover()
      }
    })
  })
}

function initSortables() {
  destroySortables()
  if (!tree.value) return

  const el = (tree.value as any).$el ?? tree.value

  // Primero anotar el DOM con data-value en cada <li>
  annotateDOM(items.value as any[], el)

  // Registrar Sortable en el root + todos los <ul> existentes
  const lists = [el, ...Array.from(el.querySelectorAll('ul'))] as HTMLElement[]
  lists.forEach(registerSortableOnList)

  // Agregar listeners de hover para nodos hoja
  addHoverListeners(el)
}

function moveInTree(
  list: any[],
  draggedId: string,
  newParentId: string | null,
  newIndex: number
) {
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

  if (newParentId === null) {
    list.splice(newIndex, 0, dragged)
  } else {
    function insert(arr: any[]): boolean {
      for (const node of arr) {
        if (node.value === newParentId) {
          node.children = node.children ?? []
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

onUnmounted(() => {
  clearHover()
  destroySortables()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-highlighted">Categorías</span>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        label="Nueva categoría"
        @click="openAddModal(null)"
      />
    </div>

    <UTree ref="tree" :items="items" :nested="true" :unmount-on-hide="false">
      <template #item-trailing="{ item }">
        <UButton
          icon="i-lucide-plus"
          size="xs"
          variant="ghost"
          color="neutral"
          class="no-drag opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="openAddModal((item as any).value)"
        />
      </template>
    </UTree>

    <UModal v-model:open="modalOpen" title="Nueva categoría">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Nombre">
            <UInput
              v-model="newCategoryName"
              placeholder="Ej: Sillas de oficina"
              autofocus
              @keydown.enter="handleCreate"
            />
          </UFormField>
          <p class="text-sm text-muted">
            {{
              selectedParentId
                ? 'Se creará como subcategoría'
                : 'Se creará como categoría raíz'
            }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            @click="modalOpen = false"
          />
          <UButton
            label="Crear"
            :loading="categoryStore.loading"
            :disabled="!newCategoryName.trim()"
            @click="handleCreate"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
