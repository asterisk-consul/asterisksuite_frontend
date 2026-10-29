import { nextTick } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'

type ScrollPosition = { top: number; left: number; windowTop: number }

export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore(nuxtApp.$pinia)
  const positions = new Map<string, ScrollPosition>()
  let browserHistoryNavigation = false

  const scope = () => `${auth.selectedCompany?.id ?? 'no-company'}:${auth.user?.id ?? 'anonymous'}`
  const keyFor = (fullPath: string) => `${scope()}:${fullPath}`

  const getMainScrollContainer = (): HTMLElement | null => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="root"] > [data-slot="body"]'))
      .filter((element) => {
        const overflowY = getComputedStyle(element).overflowY
        return (overflowY === 'auto' || overflowY === 'scroll') && element.clientHeight > 0
      })
      .sort((a, b) => b.clientHeight - a.clientHeight)
    return candidates[0] ?? null
  }

  const capture = (fullPath: string) => {
    const container = getMainScrollContainer()
    positions.set(keyFor(fullPath), {
      top: container?.scrollTop ?? 0,
      left: container?.scrollLeft ?? 0,
      windowTop: window.scrollY
    })
    if (positions.size > 60) {
      const oldestKey = positions.keys().next().value
      if (oldestKey) positions.delete(oldestKey)
    }
  }

  const restore = async (fullPath: string) => {
    const saved = positions.get(keyFor(fullPath))
    if (!saved) return

    await nextTick()
    let attempts = 0
    const apply = () => {
      const container = getMainScrollContainer()
      if (container) {
        container.scrollTop = saved.top
        container.scrollLeft = saved.left
      }
      window.scrollTo({ top: saved.windowTop, behavior: 'auto' })

      attempts += 1
      const canReachSavedPosition = container
        ? container.scrollHeight - container.clientHeight >= saved.top - 2
        : window.document.documentElement.scrollHeight - window.innerHeight >= saved.windowTop - 2
      if (!canReachSavedPosition && attempts < 30) window.setTimeout(apply, 80)
    }

    window.requestAnimationFrame(apply)
  }

  window.addEventListener('popstate', () => {
    browserHistoryNavigation = true
  })

  nuxtApp.$router.beforeEach((to, from) => {
    if (from.matched.length) capture(from.fullPath)
  })

  nuxtApp.$router.afterEach((to, _from, failure) => {
    const shouldRestore = browserHistoryNavigation
    browserHistoryNavigation = false
    if (!failure && shouldRestore) void restore(to.fullPath)
  })
})
