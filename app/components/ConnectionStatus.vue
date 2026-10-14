<script setup lang="ts">
const online = ref(true)
const restored = ref(false)
let restoredTimer: ReturnType<typeof setTimeout> | undefined

function handleOffline() {
  online.value = false
  restored.value = false
  if (restoredTimer) clearTimeout(restoredTimer)
}

function handleOnline() {
  const wasOffline = !online.value
  online.value = true
  if (!wasOffline) return

  restored.value = true
  if (restoredTimer) clearTimeout(restoredTimer)
  restoredTimer = setTimeout(() => {
    restored.value = false
  }, 4000)
}

onMounted(() => {
  online.value = navigator.onLine
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)
})

onBeforeUnmount(() => {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
  if (restoredTimer) clearTimeout(restoredTimer)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-2 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="!online || restored"
      class="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 pointer-events-none"
      aria-live="polite"
    >
      <div
        class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg backdrop-blur"
        :class="online
          ? 'border-success/30 bg-success/90 text-white'
          : 'border-warning/30 bg-default/95 text-highlighted'"
      >
        <UIcon :name="online ? 'i-lucide-wifi' : 'i-lucide-wifi-off'" class="size-4 shrink-0" />
        <span>{{ online ? 'Conexión restablecida' : 'Sin conexión · usando datos guardados cuando estén disponibles' }}</span>
      </div>
    </div>
  </Transition>
</template>
