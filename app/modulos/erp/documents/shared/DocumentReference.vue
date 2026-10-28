<script setup lang="ts">
defineProps<{
  reference?: string | null
}>()
</script>

<template>
  <div
    v-if="reference?.trim()"
    class="mt-3 flex min-w-0 items-start gap-2.5 rounded-lg border border-primary/20 border-l-2 border-l-primary bg-primary/5 px-3 py-2.5"
  >
    <UIcon name="i-lucide-bookmark" class="mt-0.5 size-4 shrink-0 text-primary" />
    <div class="min-w-0">
      <div class="text-xs font-medium uppercase tracking-wide text-muted">Referencia</div>
      <div class="break-words text-sm font-semibold text-highlighted">{{ reference }}</div>
    </div>
  </div>
</template>
