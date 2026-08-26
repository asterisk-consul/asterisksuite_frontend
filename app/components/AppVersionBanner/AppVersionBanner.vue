<script setup lang="ts">
interface Props {
  version: string
  changelogUrl: string
}

interface Emits {
  (e: 'dismiss'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div
    class="fixed top-0 left-0 right-0 z-[100] border-b border-primary/20 bg-primary/5 backdrop-blur-sm"
    role="alert"
  >
    <div class="mx-auto max-w-5xl flex items-center justify-between gap-3 px-4 py-2.5">
      <p class="text-sm text-primary font-medium">
        Nueva versión <strong>{{ version }}</strong> disponible — mejoras en operaciones internacionales, pagos y conciliación.
      </p>
      <div class="flex items-center gap-2 flex-shrink-0">
        <NuxtLink
          :to="changelogUrl"
          class="text-sm font-medium text-primary underline hover:no-underline whitespace-nowrap"
        >
          Ver cambios
        </NuxtLink>
        <button
          class="ml-1 p-1 rounded hover:bg-primary/10 text-primary transition-colors"
          aria-label="Cerrar"
          @click="emit('dismiss')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
