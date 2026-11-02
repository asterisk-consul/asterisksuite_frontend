import type { Employee } from '~/modulos/erp/employees/types/employees.types'
import { useEmployeesService } from '~/modulos/erp/employees/service/employees.service'

const employee = ref<Employee | null>(null)
const fetched = ref(false)

export function useCurrentUserEmployee() {
  const employeesService = useEmployeesService()
  const isSalesperson = computed(() => employee.value?.is_salesperson ?? false)

  const fetchIfNeeded = async () => {
    if (fetched.value) return
    try {
      const data = await employeesService.findCurrentUser()
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
