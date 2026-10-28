<script setup lang="ts">
const props = withDefaults(defineProps<{
  keys: string[]
  size?: 'sm' | 'xs' | '2xs'
}>(), {
  size: 'xs'
})

const label = computed(() => `Atajo: ${props.keys.join(' + ')}`)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 align-middle"
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
