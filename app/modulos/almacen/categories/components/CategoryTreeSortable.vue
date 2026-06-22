<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import Sortable from 'sortablejs'

const props = defineProps<{
  items: TreeItem[]
}>()

const emit = defineEmits<{
  add: [parentId: string | null]
  move: [
    payload: {
      draggedId: string
      parentId: string | null
      newIndex: number
    }
  ]
}>()

const tree = useTemplateRef<HTMLElement>('tree')

const sortableInstances: Sortable[] = []

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

function handleDragEnd(evt: Sortable.SortableEvent) {
  clearHover()

  const draggedId = evt.item.dataset.value

  if (!draggedId) {
    nextTick(initSortables)
    return
  }

  const parentLi = evt.to.closest('li') as HTMLElement | null

  const parentId = parentLi?.dataset.value ?? null

  if (parentId === draggedId) {
    nextTick(initSortables)
    return
  }

  emit('move', {
    draggedId,
    parentId,
    newIndex: evt.newIndex ?? 0
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

function injectTempList(li: HTMLElement) {
  if (li.querySelector('ul')) return

  const tempUl = document.createElement('ul')

  tempUl.dataset.temp = 'true'
  tempUl.style.minHeight = '6px'

  li.appendChild(tempUl)

  registerSortableOnList(tempUl)
}

function addHoverListeners(container: HTMLElement) {
  const lis = Array.from(container.querySelectorAll('li')) as HTMLElement[]

  lis.forEach((li) => {
    li.addEventListener('dragenter', (e) => {
      if (li.querySelector('ul')) return
      if (!li.dataset.value) return

      e.stopPropagation()

      if (hoverLi === li) return

      clearHover()

      hoverLi = li

      li.classList.add(
        'outline',
        'outline-2',
        'outline-offset-2',
        'outline-primary'
      )

      hoverTimer = setTimeout(() => {
        injectTempList(li)

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

  annotateDOM(props.items as any[], el)

  const lists = [el, ...Array.from(el.querySelectorAll('ul'))] as HTMLElement[]

  lists.forEach(registerSortableOnList)

  addHoverListeners(el)
}

watch(
  () => props.items,
  async () => {
    await nextTick()
    initSortables()
  },
  { deep: true }
)

onMounted(async () => {
  await nextTick()
  initSortables()
})

onUnmounted(() => {
  clearHover()
  destroySortables()
})
</script>

<template>
  <UTree ref="tree" :items="items" :nested="true" :unmount-on-hide="false">
    <template #item-trailing="{ item }">
      <UButton
        icon="i-lucide-plus"
        size="xs"
        variant="ghost"
        color="neutral"
        class="no-drag opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop="emit('add', (item as any).value)"
      />
    </template>
  </UTree>
</template>
