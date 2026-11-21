<script setup lang="ts">
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useTaskTimerStore } from '~/modulos/erp/tasks/task-timer.store'

const auth = useAuthStore()
const timer = useTaskTimerStore()
const toast = useToast()
const router = useRouter()
const actionLoading = ref(false)
const continuityOpen = ref(false)
const continuitySecondsLeft = ref(15)
const autoStopping = ref(false)
const confirmedTimerKey = ref('')
let continuityTicker: ReturnType<typeof setInterval> | null = null

const timerKey = computed(() => timer.timer ? `${auth.selectedCompany?.id ?? ''}:${timer.timer.task_id}:${timer.timer.timer_key}` : '')
const maxTimerSeconds = computed(() => (timer.timer?.max_timer_hours ?? 8) * 3600)
const promptAtSeconds = computed(() => Math.max(0, maxTimerSeconds.value - 15 * 60))
const canUseDesktopNotifications = computed(() => import.meta.client && 'Notification' in window)
const desktopNotificationsGranted = computed(() => canUseDesktopNotifications.value && Notification.permission === 'granted')

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

function clearContinuityTicker() {
  if (continuityTicker) clearInterval(continuityTicker)
  continuityTicker = null
}

function stopAtMax() {
  void finishAutomatically(`Detención automática por alcanzar el límite de ${timer.timer?.max_timer_hours ?? 8} horas.`, 'Se alcanzó el tope configurado.')
}

function showContinuityPrompt() {
  if (!timer.timer || timer.timer.paused || confirmedTimerKey.value === timerKey.value || continuityOpen.value) return
  continuitySecondsLeft.value = 15
  continuityOpen.value = true
  clearContinuityTicker()
  continuityTicker = setInterval(() => {
    continuitySecondsLeft.value -= 1
    if (continuitySecondsLeft.value <= 0) {
      clearContinuityTicker()
      continuityOpen.value = false
      void finishAutomatically('Detención automática por falta de respuesta al aviso de continuidad.', 'No se confirmó que seguías trabajando.')
    }
  }, 1000)

  if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification('¿Seguís trabajando en esta tarea?', {
      body: `Confirmá en la aplicación en ${continuitySecondsLeft.value} segundos para seguir hasta el tope.`,
      requireInteraction: true,
    })
    notification.onclick = () => {
      window.focus()
      openTask()
      notification.close()
    }
  }
}

watch([timerKey, () => timer.elapsedSeconds, () => timer.timer?.paused, () => timer.timer?.continuation_confirmed], ([key, elapsed, paused, continuationConfirmed]) => {
  if (!key) {
    continuityOpen.value = false
    clearContinuityTicker()
    return
  }
  if (elapsed >= maxTimerSeconds.value) {
    continuityOpen.value = false
    clearContinuityTicker()
    stopAtMax()
    return
  }
  if (continuationConfirmed || (key && import.meta.client && localStorage.getItem(`task-timer-continuity:${key}`) === 'confirmed')) confirmedTimerKey.value = key
  if (!paused && elapsed >= promptAtSeconds.value && confirmedTimerKey.value !== key) showContinuityPrompt()
}, { immediate: true })

async function continueToLimit() {
  if (actionLoading.value) return
  actionLoading.value = true
  try {
    await timer.confirmContinuation()
    confirmedTimerKey.value = timerKey.value
    if (import.meta.client) localStorage.setItem(`task-timer-continuity:${timerKey.value}`, 'confirmed')
    continuityOpen.value = false
    clearContinuityTicker()
  } catch (error: any) {
    toast.add({ title: 'No se pudo confirmar el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    actionLoading.value = false
  }
}

function onContinuityStorage(event: StorageEvent) {
  if (event.key !== `task-timer-continuity:${timerKey.value}` || event.newValue !== 'confirmed') return
  confirmedTimerKey.value = timerKey.value
  continuityOpen.value = false
  clearContinuityTicker()
}

async function stopFromPrompt() {
  continuityOpen.value = false
  clearContinuityTicker()
  await finishTimer('Detenido desde el aviso de continuidad.')
}

async function finishAutomatically(description: string, reason: string) {
  if (!timer.timer || autoStopping.value) return
  autoStopping.value = true
  actionLoading.value = true
  try {
    const workLog = await timer.finish(description)
    toast.add({ title: 'Temporizador detenido automáticamente', description: `${workLog.minutes} min · ${reason}`, color: 'warning' })
  } catch (error: any) {
    try { await timer.fetchActive() } catch { /* El scheduler puede haber cerrado el temporizador a la vez. */ }
    if (timer.timer) toast.add({ title: 'No se pudo detener el temporizador', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    actionLoading.value = false
    autoStopping.value = false
  }
}

async function enableDesktopNotifications() {
  if (!('Notification' in window)) {
    toast.add({ title: 'Notificaciones del navegador no disponibles', color: 'warning' })
    return
  }
  const permission = await Notification.requestPermission()
  toast.add({ title: permission === 'granted' ? 'Avisos del navegador habilitados' : 'El navegador no autorizó los avisos', color: permission === 'granted' ? 'success' : 'warning' })
}

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

onMounted(() => window.addEventListener('storage', onContinuityStorage))
onBeforeUnmount(() => {
  clearContinuityTicker()
  window.removeEventListener('storage', onContinuityStorage)
})
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
  <UModal v-model:open="continuityOpen" title="¿Seguís trabajando en esta tarea?" :description="`El temporizador se detendrá en ${continuitySecondsLeft} segundos si no confirmás.`" :dismissible="false" :close="false" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted"><span class="font-medium text-default">{{ timer.timer?.task_title }}</span> sigue corriendo. Si confirmás, continuará hasta el tope de {{ timer.timer?.max_timer_hours ?? 8 }} horas.</p>
        <UButton v-if="canUseDesktopNotifications && !desktopNotificationsGranted" label="Activar aviso en el escritorio" icon="i-lucide-bell-ring" color="neutral" variant="outline" @click="enableDesktopNotifications" />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="No, detener" color="neutral" variant="outline" :loading="actionLoading" @click="stopFromPrompt" />
        <UButton :label="`Sí, seguir (${continuitySecondsLeft}s)`" icon="i-lucide-play" :disabled="actionLoading" @click="continueToLimit" />
      </div>
    </template>
  </UModal>
</template>
