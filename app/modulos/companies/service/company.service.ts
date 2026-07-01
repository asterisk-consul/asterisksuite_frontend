import type {
  Company,
  CompanyUser,
  CreateCompanyInput,
  UpdateCompanyInput
} from '~/modulos/companies/types/company.types'

const baseUrl = '/api/companies'

export const useCompaniesService = () => {
  // =========================
  // COMPANY CRUD
  // =========================

  const findAll = () => $fetch<Company[]>(`${baseUrl}`)

  const findOne = (id: string) => $fetch<Company>(`${baseUrl}/${id}`)

  const create = (payload: CreateCompanyInput) =>
    $fetch<Company>(`${baseUrl}`, {
      method: 'POST',
      body: payload
    })

  const update = (id: string, payload: UpdateCompanyInput) =>
    $fetch<Company>(`${baseUrl}/${id}`, {
      method: 'PATCH',
      body: payload
    })

  const deactivate = (id: string) =>
    $fetch<void>(`${baseUrl}/${id}`, {
      method: 'DELETE'
    })

  // =========================
  // COMPANY USERS
  // =========================

  const listUsers = (companyId: string) =>
    $fetch<CompanyUser[]>(`${baseUrl}/${companyId}/users`)

  const addUser = (companyId: string, email: string, role: string) =>
    $fetch<CompanyUser>(`${baseUrl}/${companyId}/users`, {
      method: 'POST',
      body: { email, role }
    })

  const createUser = (companyId: string, data: { name: string; email: string; password: string; role: string }) =>
    $fetch<CompanyUser>(`${baseUrl}/${companyId}/users/create`, {
      method: 'POST',
      body: data
    })

  const removeUser = (companyId: string, userId: string) =>
    $fetch<void>(`${baseUrl}/${companyId}/users/${userId}`, {
      method: 'DELETE'
    })

  return {
    findAll,
    findOne,
    create,
    update,
    deactivate,
    listUsers,
    addUser,
    createUser,
    removeUser
  }
}
