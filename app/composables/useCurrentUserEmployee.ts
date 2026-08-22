import type { Employee } from '~/modulos/erp/employees/types/employees.types'

const employee = ref<Employee | null>(null)
const fetched = ref(false)

export function useCurrentUserEmployee() {
  const isSalesperson = computed(() => employee.value?.is_salesperson ?? false)

  const fetchIfNeeded = async () => {
    if (fetched.value) return
    try {
      const data = await $fetch<Employee | null>('/api/erp/employees/me')
      employee.value = data
    } catch {
      employee.value = null
    } finally {
      fetched.value = true
    }
  }

  const $reset = () => {
    employee.value = null
    fetched.value = false
  }

  return {
    employee: readonly(employee),
    isSalesperson,
    fetchIfNeeded,
    $reset,
  }
}
