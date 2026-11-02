<script setup lang="ts">
const props = withDefaults(defineProps<{
  keys: string[]
  size?: 'sm' | 'xs' | '2xs'
  revealOnHover?: boolean
}>(), {
  size: 'xs',
  revealOnHover: false
})

const label = computed(() => `Atajo: ${props.keys.join(' + ')}`)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 align-middle"
    :class="{ 'keyboard-shortcut-hint--reveal': revealOnHover }"
    :aria-label="label"
    role="img"
  >
    <kbd
      v-for="key in keys"
      :key="key"
      aria-hidden="true"
      class="inline-flex min-h-5 min-w-5 items-center justify-center rounded-md border border-current/20 bg-black/5 px-1.5 font-mono font-semibold leading-none opacity-90 shadow-[0_1px_0_rgb(0_0_0/0.12)]"
      :class="size === '2xs' ? '!min-h-4 !min-w-4 !rounded !px-1 text-[9px]' : size === 'sm' ? 'text-[11px]' : 'text-[10px]'"
    >
      {{ key }}
    </kbd>
  </span>
</template>

<style>
.keyboard-shortcut-hint--reveal {
  max-width: 8rem;
  transition: max-width 180ms ease, opacity 150ms ease, transform 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .group\/create:not(:hover):not(:focus-visible) .keyboard-shortcut-hint--reveal {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transform: translateX(0.25rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .keyboard-shortcut-hint--reveal {
    transition: none;
  }
}
</style>
