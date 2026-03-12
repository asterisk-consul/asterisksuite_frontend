export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()

  // 1. Inicializa sesión al arrancar la app
  await auth.init()

  // 2. Auto-refresh cada 13 min (el token dura 15)
  setInterval(
    () => {
      if (auth.isLogged) {
        auth.refresh()
      }
    },
    13 * 60 * 1000
  )
})
