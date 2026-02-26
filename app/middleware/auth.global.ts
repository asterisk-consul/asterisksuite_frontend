// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.init() // solo corre UNA vez por el flag initialized
  }

  if (to.meta.auth === false) return

  if (!auth.isLogged) {
    return navigateTo('/login')
  }
})
