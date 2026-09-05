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
const gapPx = ref(0)
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

  let lastCompact = false
  let lastGap = 0

  const handleScroll = () => {
    const scrollTop = scrollContainer.scrollTop
    const compact = scrollTop > 4
    isCompact.value = compact

    if (compact && rootRef.value) {
      const containerTop = scrollContainer.getBoundingClientRect().top
      const barTop = rootRef.value.getBoundingClientRect().top
      gapPx.value = Math.max(0, Math.round(barTop - containerTop))
    } else {
      gapPx.value = 0
    }

    if (compact !== lastCompact || gapPx.value !== lastGap) {
      lastCompact = compact
      lastGap = gapPx.value
    }
  }

  scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  onUnmounted(() => {
    scrollContainer.removeEventListener('scroll', handleScroll)
  })
})

const headerUi = computed(() => ({
  ...props.ui,
  root: isCompact.value
    ? 'py-2 border-b-0 transition-[padding] duration-300'
    : (props.ui?.root ?? 'transition-[padding] duration-300'),
  title: isCompact.value
    ? 'text-base font-bold truncate min-w-0 transition-[font-size] duration-300'
    : (props.ui?.title ?? 'transition-[font-size] duration-300'),
  description: isCompact.value
    ? 'hidden'
    : (props.ui?.description ?? ''),
  links: isCompact.value
    ? 'flex-nowrap overflow-x-auto'
    : (props.ui?.links ?? '')
}))

const rootClasses = computed(() =>
  isCompact.value
    ? 'bg-default border-b border-default -mx-4 sm:-mx-6 px-4 sm:px-6'
    : ''
)

const contentStyle = computed(() =>
  isCompact.value && gapPx.value > 0
    ? { transform: `translateY(-${Math.round(gapPx.value / 2)}px)` }
    : { transform: 'translateY(0)' }
)
</script>

<template>
  <div
    ref="rootRef"
    class="sticky top-0 z-20"
    :class="rootClasses"
  >
    <div
      v-if="isCompact && gapPx > 0"
      class="absolute inset-x-0 bg-default"
      :style="{ top: -gapPx + 'px', height: gapPx + 'px' }"
    />
    <slot v-if="!isCompact" name="breadcrumb" />
    <div :style="contentStyle">
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
      <slot name="footer" />
    </div>
  </div>
</template>
