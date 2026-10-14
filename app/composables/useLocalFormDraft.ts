import type { ComputedRef, Ref } from 'vue'

type DraftStatus = 'idle' | 'saving' | 'saved'

type StoredDraft<T> = {
  version: number
  savedAt: number
  data: T
}

interface LocalFormDraftOptions<T> {
  key: ComputedRef<string>
  source: () => T
  restore: (data: T) => void
  isMeaningful: (data: T) => boolean
  enabled?: Ref<boolean> | ComputedRef<boolean>
  debounceMs?: number
}

const VERSION = 1

export function useLocalFormDraft<T>(options: LocalFormDraftOptions<T>) {
  const availableDraft = shallowRef<StoredDraft<T> | null>(null)
  const status = ref<DraftStatus>('idle')
  const lastSavedAt = ref<number | null>(null)
  const ready = ref(false)
  const suspended = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  const enabled = () => options.enabled?.value ?? true

  function readDraft() {
    availableDraft.value = null
    if (!import.meta.client || !enabled() || suspended.value) return
    try {
      const raw = localStorage.getItem(options.key.value)
      if (!raw) return
      const stored = JSON.parse(raw) as StoredDraft<T>
      if (stored.version === VERSION && stored.data) {
        availableDraft.value = stored
      } else {
        localStorage.removeItem(options.key.value)
      }
    } catch {
      localStorage.removeItem(options.key.value)
    }
  }

  function writeDraft(data = options.source()) {
    if (!import.meta.client || !enabled() || suspended.value || availableDraft.value) return
    if (!options.isMeaningful(data)) {
      clearDraft()
      return
    }

    status.value = 'saving'
    const stored: StoredDraft<T> = { version: VERSION, savedAt: Date.now(), data }
    try {
      localStorage.setItem(options.key.value, JSON.stringify(stored))
      lastSavedAt.value = stored.savedAt
      status.value = 'saved'
    } catch {
      status.value = 'idle'
    }
  }

  function scheduleSave() {
    if (!ready.value || !enabled() || suspended.value || availableDraft.value) return
    if (saveTimer) clearTimeout(saveTimer)
    status.value = 'saving'
    saveTimer = setTimeout(() => writeDraft(), options.debounceMs ?? 700)
  }

  function restoreDraft() {
    if (!availableDraft.value) return
    const stored = availableDraft.value
    options.restore(stored.data)
    availableDraft.value = null
    lastSavedAt.value = stored.savedAt
    status.value = 'saved'
    ready.value = true
  }

  function clearDraft() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = undefined
    if (import.meta.client) localStorage.removeItem(options.key.value)
    availableDraft.value = null
    lastSavedAt.value = null
    status.value = 'idle'
  }

  function discardDraft() {
    clearDraft()
    ready.value = true
  }

  function completeDraft() {
    suspended.value = true
    clearDraft()
  }

  watch(options.source, scheduleSave, { deep: true })
  watch(() => options.key.value, () => {
    ready.value = false
    status.value = 'idle'
    readDraft()
    nextTick(() => { ready.value = true })
  })
  watch(() => options.enabled?.value, (isEnabled) => {
    if (!isEnabled) {
      ready.value = false
      return
    }
    suspended.value = false
    readDraft()
    nextTick(() => { ready.value = true })
  })

  onMounted(() => {
    readDraft()
    nextTick(() => { ready.value = true })
  })

  onBeforeUnmount(() => {
    if (saveTimer && !availableDraft.value) {
      clearTimeout(saveTimer)
      writeDraft()
    }
  })

  return {
    availableDraft,
    status,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
    completeDraft
  }
}
