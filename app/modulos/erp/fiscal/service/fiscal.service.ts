import type {
  BusinessPartyIibbRegistration,
  BusinessPartyWithholdingProfile,
  CalculateWithholdingsInput,
  CompanyTaxJurisdiction,
  TaxJurisdiction,
  TaxRule,
  WithholdingConcept,
  WithholdingPreviewResult,
} from '../types/fiscal.types'

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

export function useFiscalService() {
  const urlBase = '/api/backend/fiscal'
  const requestFetch = (import.meta.server ? useRequestFetch() : $fetch) as typeof $fetch

  function getIibbRegister(params: { date_from?: string; date_to?: string }) {
    return requestFetch<any>(`${urlBase}/iibb-register`, { query: params })
  }

  function previewWithholdings(input: CalculateWithholdingsInput): Promise<WithholdingPreviewResult> {
    return apiFetch<WithholdingPreviewResult>(`${urlBase}/withholdings/preview`, { method: 'POST', body: input })
  }

  function getJurisdictions(): Promise<TaxJurisdiction[]> {
    return apiFetch<TaxJurisdiction[]>(`${urlBase}/jurisdictions`)
  }

  function getWithholdingConcepts(): Promise<WithholdingConcept[]> {
    return apiFetch<WithholdingConcept[]>(`${urlBase}/withholding-concepts`)
  }

  function getPartyWithholdingProfiles(partyId: string): Promise<BusinessPartyWithholdingProfile[]> {
    return apiFetch<BusinessPartyWithholdingProfile[]>(`${urlBase}/parties/${partyId}/withholding-profiles`)
  }

  function putPartyWithholdingProfiles(partyId: string, profiles: BusinessPartyWithholdingProfile[]) {
    return apiFetch<void>(`${urlBase}/parties/${partyId}/withholding-profiles`, {
      method: 'PUT',
      body: { profiles },
    })
  }

  function getPartyIibbRegistrations(partyId: string): Promise<BusinessPartyIibbRegistration[]> {
    return apiFetch<BusinessPartyIibbRegistration[]>(`${urlBase}/parties/${partyId}/iibb-registrations`, { timeout: 10_000, retry: 1 })
  }

  function putPartyIibbRegistrations(partyId: string, registrations: BusinessPartyIibbRegistration[]) {
    return apiFetch<void>(`${urlBase}/parties/${partyId}/iibb-registrations`, {
      method: 'PUT',
      body: { registrations },
    })
  }

  function getCompanyJurisdictions(): Promise<CompanyTaxJurisdiction[]> {
    return apiFetch<CompanyTaxJurisdiction[]>(`${urlBase}/company-jurisdictions`, { timeout: 10_000, retry: 1 })
  }

  function putCompanyJurisdictions(jurisdictions: CompanyTaxJurisdiction[]) {
    const payload = jurisdictions.map((row) => ({
      jurisdiction_id: row.jurisdiction_id,
      tax_type: row.tax_type,
      is_withholding_agent: row.is_withholding_agent,
      is_perception_agent: row.is_perception_agent,
      registration_number: row.registration_number ?? null,
      default_perception_rate: row.default_perception_rate ?? null,
      default_retention_rate: row.default_retention_rate ?? null,
      valid_from: row.valid_from || null,
      valid_to: row.valid_to || null,
    }))
    return apiFetch<void>(`${urlBase}/company-jurisdictions`, {
      method: 'PUT',
      body: { jurisdictions: payload },
    })
  }

  function getTaxRules(taxType?: string): Promise<TaxRule[]> {
    const query = taxType ? `?tax_type=${taxType}` : ''
    return apiFetch<TaxRule[]>(`${urlBase}/tax-rules${query}`, { timeout: 10_000, retry: 1 })
  }

  function createTaxRule(rule: Partial<TaxRule>): Promise<TaxRule> {
    return apiFetch<TaxRule>(`${urlBase}/tax-rules`, { method: 'POST', body: rule })
  }

  function updateTaxRule(id: string, rule: Partial<TaxRule>): Promise<TaxRule> {
    return apiFetch<TaxRule>(`${urlBase}/tax-rules/${id}`, { method: 'PUT', body: rule })
  }

  function removeTaxRule(id: string) {
    return apiFetch<void>(`${urlBase}/tax-rules/${id}`, { method: 'DELETE' })
  }

  function createWithholdingRemittance(body: {
    withholding_ids: string[]
    vep_number: string
    vep_amount: number
    currency_code: string
    tax_regime_code?: string
    due_date?: string
  }) {
    return apiFetch<any>(`${urlBase}/withholdings/remittances`, { method: 'POST', body })
  }

  function findWithholdings() {
    return apiFetch<{ items: any[] }>(`${urlBase}/withholdings`)
  }

  function findWithholdingRemittance(id: string) {
    return apiFetch<any>(`${urlBase}/withholdings/remittances/${id}`)
  }

  function findWithholdingRemittances() {
    return apiFetch<any[]>(`${urlBase}/withholdings/remittances`)
  }

  function createTaxApplication(withholdingId: string, body: {
    tax_period: string
    application_date: string
    amount: number
    declaration_reference?: string
    notes?: string
  }) {
    return apiFetch<any>(`${urlBase}/withholdings/${withholdingId}/tax-applications`, { method: 'POST', body })
  }

  function reverseTaxApplication(applicationId: string, reason: string) {
    return apiFetch<any>(`${urlBase}/withholding-tax-applications/${applicationId}/reverse`, {
      method: 'POST',
      body: { reason },
    })
  }

  return {
    getIibbRegister,
    previewWithholdings,
    getJurisdictions,
    getWithholdingConcepts,
    getPartyWithholdingProfiles,
    putPartyWithholdingProfiles,
    getPartyIibbRegistrations,
    putPartyIibbRegistrations,
    getCompanyJurisdictions,
    putCompanyJurisdictions,
    getTaxRules,
    createTaxRule,
    updateTaxRule,
    removeTaxRule,
    createWithholdingRemittance,
    findWithholdings,
    findWithholdingRemittances,
    findWithholdingRemittance,
    createTaxApplication,
    reverseTaxApplication,
  }
}
