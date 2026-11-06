export interface CompanyUserInput {
  company_id: string
  name?: string
  email?: string
  password?: string
  role?: string
  whatsapp_phone?: string
  link_employee_id?: string
  link_partner_id?: string
  newPassword?: string
}

export const useUsersService = () => {
  const baseUrl = '/api/access-control/users'

  return {
    findAll: () => $fetch<any[]>(`${baseUrl}/all`),
    search: (query: string) => $fetch<any[]>(`${baseUrl}/search`, { query: { q: query } }),
    findBatch: (ids: string[]) => $fetch<any[]>(`${baseUrl}/batch`, { query: { ids: ids.join(',') } }),
    create: (body: CompanyUserInput) => $fetch<any>(baseUrl, { method: 'POST', body }),
    update: (id: string, body: CompanyUserInput) => $fetch<any>(`${baseUrl}/${id}`, { method: 'PATCH', body }),
    changePassword: (id: string, companyId: string, newPassword: string) =>
      $fetch<void>(`${baseUrl}/${id}/password`, { method: 'PATCH', body: { company_id: companyId, newPassword } }),
    getWhatsapp: (companyId: string, userId: string) =>
      $fetch<{ phone_e164: string; opted_in: boolean }>(`/api/backend/companies/${companyId}/users/${userId}/whatsapp`),
  }
}
