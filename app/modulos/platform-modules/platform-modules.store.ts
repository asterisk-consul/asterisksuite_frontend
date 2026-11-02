import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { usePlatformModulesService } from './platform-modules.service'
import type { EffectiveCompanyModules, EffectiveModuleState } from './platform-modules.types'

export const usePlatformModulesStore = defineStore('platform-modules', () => {
  const service = usePlatformModulesService()
  const effective = ref<EffectiveCompanyModules | null>(null)
  const loadedCompanyId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let pending: Promise<EffectiveCompanyModules> | null = null
  let pendingCompanyId: string | null = null

  const modules = computed(() => effective.value?.modules ?? [])
  const enabledCodes = computed(
    () => new Set(modules.value.filter((module) => module.enabled).map((module) => module.code))
  )

  async function fetchEffective(companyId: string, force = false) {
    if (!force && loadedCompanyId.value === companyId && effective.value) {
      return effective.value
    }
    if (!force && pending && pendingCompanyId === companyId) return pending

    if (loadedCompanyId.value !== companyId) {
      effective.value = null
      loadedCompanyId.value = null
      error.value = null
    }

    loading.value = true
    error.value = null
    pendingCompanyId = companyId
    pending = service.getEffective()

    try {
      const result = await pending
      // Evita que una respuesta lenta de la empresa anterior contamine la nueva.
      if (pendingCompanyId === companyId && result.companyId === companyId) {
        effective.value = result
        loadedCompanyId.value = companyId
      }
      return result
    } catch (cause) {
      if (pendingCompanyId === companyId) {
        error.value = cause instanceof Error ? cause.message : 'No se pudieron cargar los módulos'
      }
      throw cause
    } finally {
      if (pendingCompanyId === companyId) {
        pending = null
        pendingCompanyId = null
        loading.value = false
      }
    }
  }

  function hasModule(code: string) {
    const module = modules.value.find((item) => item.code === code)
    // Si el catálogo todavía no fue sembrado en la base de plataforma,
    // conserva el acceso anterior durante el despliegue de la migración.
    if (!module && modules.value.length === 0) return true
    return module?.enabled ?? false
  }

  function moduleState(code: string): EffectiveModuleState {
    return modules.value.find((module) => module.code === code)?.state ?? 'DISABLED'
  }

  function reset() {
    effective.value = null
    loadedCompanyId.value = null
    loading.value = false
    error.value = null
    pending = null
    pendingCompanyId = null
  }

  return {
    effective,
    loadedCompanyId,
    loading,
    error,
    modules,
    enabledCodes,
    fetchEffective,
    hasModule,
    moduleState,
    reset
  }
})
