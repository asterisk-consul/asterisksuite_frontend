<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useTaskTimerStore } from '~/modulos/erp/tasks/task-timer.store'

const auth = useAuthStore()
const timer = useTaskTimerStore()
const toast = useToast()
const router = useRouter()
const actionLoading = ref(false)

const formattedTime = computed(() => {
  const total = timer.elapsedSeconds
  const hours = Math.floor(total / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((total % 3600) / 60).toString().padStart(2, '0')
  const seconds = (total % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

watch(() => auth.selectedCompany?.id, async (companyId) => {
  if (!import.meta.client) return
  timer.reset()
  if (!companyId) return
  try {
    await timer.fetchActive()
  } catch {
    // La campana global no debe bloquear el resto de la navegación si falta tasks.read.
  }
}, { immediate: true })

async function toggleTimer() {
  if (actionLoading.value) return
  actionLoading.value = true
  try {
    if (timer.timer?.paused) await timer.resume()
    else await timer.pause()
  } catch (error: any) {
    toast.add({ title: 'No se pudo actualizar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

async function finishTimer() {
  if (actionLoading.value) return
  actionLoading.value = true
  const taskTitle = timer.timer?.task_title ?? 'Tarea'
  try {
    const workLog = await timer.finish()
    toast.add({ title: 'Tiempo registrado', description: `${workLog.minutes} min · ${taskTitle}`, color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo finalizar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

function openTask() {
  const active = timer.timer
  if (!active) return
  router.push({ path: '/erp/tasks', query: { board_id: active.board_id, task_id: active.task_id } })
}
</script>

<template>
  <div v-if="timer.timer" class="group fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-primary/40 bg-elevated/95 px-3 py-2.5 shadow-xl backdrop-blur transition-all duration-200 hover:shadow-2xl focus-within:shadow-2xl">
    <span class="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span v-if="!timer.timer.paused" class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      <span class="relative inline-flex size-2.5 rounded-full" :class="timer.timer.paused ? 'bg-warning' : 'bg-success'" />
    </span>
    <button type="button" class="min-w-0 text-left" :aria-label="`Abrir tarea ${timer.timer.task_title}`" @click="openTask">
      <span class="block max-w-48 truncate text-sm font-medium">{{ timer.timer.task_title }}</span>
      <span class="block font-mono text-xs tabular-nums" :class="timer.timer.paused ? 'text-warning' : 'text-success'">{{ formattedTime }}{{ timer.timer.paused ? ' · Pausado' : ' · En curso' }}</span>
    </button>
    <div class="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <UButton :icon="timer.timer.paused ? 'i-lucide-play' : 'i-lucide-pause'" color="neutral" variant="ghost" size="sm" :loading="actionLoading" :aria-label="timer.timer.paused ? 'Reanudar temporizador' : 'Pausar temporizador'" :title="timer.timer.paused ? 'Reanudar' : 'Pausar'" @click="toggleTimer" />
      <UButton icon="i-lucide-square" color="error" variant="ghost" size="sm" :loading="actionLoading" aria-label="Finalizar temporizador" title="Finalizar y registrar el tiempo" @click="finishTimer" />
    </div>
  </div>
</template>
