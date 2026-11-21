import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useTasksService, type TaskActiveTimer } from './tasks.service'

export const useTaskTimerStore = defineStore('task-timer', () => {
  const service = useTasksService()
  const timer = ref<TaskActiveTimer | null>(null)
  const now = ref(Date.now())
  const loading = ref(false)
  let ticker: ReturnType<typeof setInterval> | null = null
  let requestSequence = 0

  const elapsedSeconds = computed(() => {
    if (!timer.value) return 0
    const liveSeconds = timer.value.started_at
      ? Math.max(0, Math.floor((now.value - new Date(timer.value.started_at).getTime()) / 1000))
      : 0
    return timer.value.elapsed_seconds + liveSeconds
  })

  function syncTicker() {
    if (import.meta.client && timer.value?.started_at && !ticker) {
      ticker = setInterval(() => { now.value = Date.now() }, 1000)
    } else if ((!timer.value?.started_at || !timer.value) && ticker) {
      clearInterval(ticker)
      ticker = null
    }
  }

  function setTimer(value: TaskActiveTimer | null) {
    timer.value = value
    now.value = Date.now()
    syncTicker()
  }

  async function fetchActive() {
    const sequence = ++requestSequence
    loading.value = true
    try {
      const result = await service.getActiveTimer()
      if (sequence === requestSequence) setTimer(result)
      return result
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  async function start(taskId: string) {
    setTimer(await service.startTimer(taskId))
  }

  async function pause() {
    setTimer(await service.pauseTimer())
  }

  async function resume() {
    setTimer(await service.resumeTimer())
  }

  async function confirmContinuation() {
    setTimer(await service.confirmTimerContinuation())
  }

  async function finish(description?: string) {
    const result = await service.finishTimer(description)
    setTimer(null)
    return result.work_log
  }

  function reset() {
    requestSequence++
    setTimer(null)
    loading.value = false
  }

  return { timer, loading, elapsedSeconds, fetchActive, start, pause, resume, confirmContinuation, finish, reset }
})
