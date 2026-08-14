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
const sentinelRef = ref<HTMLElement | null>(null)

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

  nextTick(() => {
    const scrollContainer = findScrollContainer(sentinelRef.value)
    if (!scrollContainer) return

    const handleScroll = () => {
      if (!sentinelRef.value) return
      const rect = sentinelRef.value.getBoundingClientRect()
      isCompact.value = rect.bottom <= 0
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    onUnmounted(() => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    })
  })
})

const headerUi = computed(() => ({
  ...props.ui,
  root: isCompact.value ? 'py-2 border-b-0' : props.ui?.root ?? '',
  title: isCompact.value ? 'text-base font-bold truncate min-w-0' : props.ui?.title ?? '',
  description: isCompact.value ? 'hidden' : props.ui?.description ?? '',
  links: isCompact.value ? 'flex-nowrap overflow-x-auto' : props.ui?.links ?? ''
}))

const barClasses = computed(() =>
  isCompact.value
    ? 'bg-elevated/90 backdrop-blur-sm shadow-sm border-b border-default'
    : ''
)
</script>

<template>
  <div>
    <div ref="sentinelRef" class="h-px w-full shrink-0" aria-hidden="true" />
    <div
      class="sticky top-0 z-20 transition-[padding,background-color,box-shadow] duration-200 motion-reduce:transition-none"
      :class="barClasses"
    >
      <slot v-if="!isCompact" name="breadcrumb" />
      <UPageHeader
        :description="description || undefined"
        :ui="headerUi"
        :links="links"
      >
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
    </div>
  </div>
</template>
