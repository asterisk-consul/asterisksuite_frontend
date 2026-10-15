<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const props = defineProps<{
  title: string
  description?: string
  showModuleToggle?: boolean
  links?: ButtonProps[]
  ui?: Record<string, string>
  collapseDisabled?: boolean
}>()

const { mainCollapsed } = useSidebarState()

function toggleMain() {
  mainCollapsed.value = !mainCollapsed.value
}

const isCompact = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let current: HTMLElement | null = el
  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') return current
    current = current.parentElement
  }
  return null
}

onMounted(() => {
  if (props.collapseDisabled) return

  const scrollContainer = findScrollContainer(rootRef.value)

  if (!scrollContainer) {
    return
  }

  let frameId: number | null = null

  const handleScroll = () => {
    if (frameId !== null) return
    frameId = requestAnimationFrame(() => {
      frameId = null
      const scrollTop = scrollContainer.scrollTop

      // Dos umbrales evitan que el cambio de altura del encabezado haga
      // oscilar el estado cuando el scroll está llegando al inicio.
      if (!isCompact.value && scrollTop >= 48) isCompact.value = true
      else if (isCompact.value && scrollTop <= 1) isCompact.value = false
    })
  }

  scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  onUnmounted(() => {
    scrollContainer.removeEventListener('scroll', handleScroll)
    if (frameId !== null) cancelAnimationFrame(frameId)
  })
})

const headerUi = computed(() => ({
  ...props.ui,
  root: isCompact.value ? 'py-2 border-b-0' : (props.ui?.root ?? ''),
  title: isCompact.value ? 'text-base font-bold truncate min-w-0' : (props.ui?.title ?? ''),
  description: isCompact.value ? 'hidden' : (props.ui?.description ?? ''),
  links: isCompact.value ? 'flex-nowrap overflow-x-auto' : (props.ui?.links ?? '')
}))

const rootClasses = computed(() =>
  isCompact.value ? 'bg-default border-b border-default -mx-4 sm:-mx-6 px-4 sm:px-6' : ''
)
</script>

<template>
  <div
    ref="rootRef"
    class="sticky -top-4 z-20 -mt-4 bg-default pt-4 [overflow-anchor:none] sm:-top-6 sm:-mt-6 sm:pt-6"
    :class="rootClasses"
  >
    <slot v-if="!isCompact" name="breadcrumb" />
    <div>
      <UPageHeader :description="description || undefined" :ui="headerUi" :links="links">
        <template #title>
          <div class="flex items-center gap-2 min-w-0">
            <AppSidebarToggle :collapsed="mainCollapsed" @click="toggleMain" />
            <span class="truncate">{{ title }}</span>
          </div>
        </template>
        <template v-if="$slots.links" #links>
          <slot name="links" />
        </template>
      </UPageHeader>
      <slot name="footer" />
    </div>
  </div>
</template>
