export default defineCachedEventHandler(async () => {
  return await $fetch('https://dolarapi.com/v1/dolares', { timeout: 5000 })
}, {
  name: 'dashboard-dollar-rates',
  maxAge: 300,
  staleMaxAge: 3600,
})
