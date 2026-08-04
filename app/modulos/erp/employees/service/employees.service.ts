import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '~/modulos/erp/employees/types/employees.types'

const baseUrl = '/api/erp/employees'

export const useEmployeesService = () => {
  const findAll = () => $fetch<Employee[]>(baseUrl)

  const findOne = (id: string) => $fetch<Employee>(`${baseUrl}/${id}`)

  const create = (payload: CreateEmployeeInput) =>
    $fetch<Employee>(baseUrl, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdateEmployeeInput) =>
    $fetch<Employee>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const remove = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  const linkUser = (id: string, userId: string) =>
    $fetch<{ message: string; employee_id: string; user_id: string }>(`${baseUrl}/${id}/link-user`, {
      method: 'PATCH',
      body: { user_id: userId }
    })

  const unlinkUser = (id: string) =>
    $fetch<{ message: string; employee_id: string }>(`${baseUrl}/${id}/unlink-user`, {
      method: 'PATCH'
    })

  return { findAll, findOne, create, update, remove, linkUser, unlinkUser }
}
