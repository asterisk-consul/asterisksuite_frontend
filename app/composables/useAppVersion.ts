const STORAGE_KEY = 'app-dismissed-version'

export function useAppVersion() {
  const currentVersion = useRuntimeConfig().public.appVersion as string
  const dismissedVersion = ref<string | null>(null)
  const showBanner = ref(false)

  const init = () => {
    if (process.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      dismissedVersion.value = stored
      showBanner.value = stored !== currentVersion
    }
  }

  const dismiss = () => {
    if (process.client) {
      localStorage.setItem(STORAGE_KEY, currentVersion)
      dismissedVersion.value = currentVersion
      showBanner.value = false
    }
  }

  const getChangelogUrl = () => '/changelog'

  return {
    currentVersion: readonly(currentVersion),
    dismissedVersion: readonly(dismissedVersion),
    showBanner: readonly(showBanner),
    init,
    dismiss,
    getChangelogUrl
  }
}