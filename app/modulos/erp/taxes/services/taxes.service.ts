import type {
  CreateTaxDto,
  Tax,
  UpdateTaxDto
} from '~/modulos/erp/taxes/types/taxes.types'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export const TaxesService = {
  async getAll(): Promise<Tax[]> {
    return apiFetch<Tax[]>(`/api/backend/taxes`)
  },

  async create(dto: Omit<CreateTaxDto, 'company_id'>): Promise<Tax> {
    return apiFetch<Tax>('/api/backend/taxes', {
      method: 'POST',
      body: { ...dto }
    })
  },

  async update(id: string, dto: UpdateTaxDto): Promise<Tax> {
    return apiFetch<Tax>(`/api/backend/taxes/${id}`, {
      method: 'PATCH',
      body: dto
    })
  },
  async remove(id: string): Promise<void> {
    return apiFetch<void>(`/api/backend/taxes/${id}`, { method: 'DELETE' })
  },

  async getCompanySettings(companyId: string) {
    return apiFetch<any>('/api/backend/tax-engine/company-settings', { query: { company_id: companyId } })
  },

  async updateCompanySettings(body: Record<string, unknown>) {
    return apiFetch<any>('/api/backend/tax-engine/company-settings', { method: 'PATCH', body })
  },

  async calculatePreview(body: Record<string, unknown>) {
    return apiFetch<any>('/api/backend/tax-engine/calculate-preview', { method: 'POST', body })
  },

  async getTaxCategories() {
    return apiFetch<any[]>('/api/backend/tax-engine/tax-categories')
  }
}
