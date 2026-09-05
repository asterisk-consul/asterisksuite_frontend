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

export function useFiscalService() {
  const urlBase = '/api/erp/fiscal'

  function previewWithholdings(input: CalculateWithholdingsInput): Promise<WithholdingPreviewResult> {
    return $fetch(`${urlBase}/withholdings/preview`, { method: 'POST', body: input })
  }

  function getJurisdictions(): Promise<TaxJurisdiction[]> {
    return $fetch(`${urlBase}/jurisdictions`)
  }

  function getWithholdingConcepts(): Promise<WithholdingConcept[]> {
    return $fetch(`${urlBase}/withholding-concepts`)
  }

  function getPartyWithholdingProfiles(partyId: string): Promise<BusinessPartyWithholdingProfile[]> {
    return $fetch(`${urlBase}/parties/${partyId}/withholding-profiles`)
  }

  function putPartyWithholdingProfiles(partyId: string, profiles: BusinessPartyWithholdingProfile[]) {
    return $fetch(`${urlBase}/parties/${partyId}/withholding-profiles`, {
      method: 'PUT',
      body: { profiles },
    })
  }

  function getPartyIibbRegistrations(partyId: string): Promise<BusinessPartyIibbRegistration[]> {
    return $fetch(`${urlBase}/parties/${partyId}/iibb-registrations`)
  }

  function putPartyIibbRegistrations(partyId: string, registrations: BusinessPartyIibbRegistration[]) {
    return $fetch(`${urlBase}/parties/${partyId}/iibb-registrations`, {
      method: 'PUT',
      body: { registrations },
    })
  }

  function getCompanyJurisdictions(): Promise<CompanyTaxJurisdiction[]> {
    return $fetch(`${urlBase}/company-jurisdictions`)
  }

  function putCompanyJurisdictions(jurisdictions: CompanyTaxJurisdiction[]) {
    return $fetch(`${urlBase}/company-jurisdictions`, {
      method: 'PUT',
      body: { jurisdictions },
    })
  }

  function getTaxRules(taxType?: string): Promise<TaxRule[]> {
    const query = taxType ? `?tax_type=${taxType}` : ''
    return $fetch(`${urlBase}/tax-rules${query}`)
  }

  function createTaxRule(rule: Partial<TaxRule>): Promise<TaxRule> {
    return $fetch(`${urlBase}/tax-rules`, { method: 'POST', body: rule })
  }

  function updateTaxRule(id: string, rule: Partial<TaxRule>): Promise<TaxRule> {
    return $fetch(`${urlBase}/tax-rules/${id}`, { method: 'PUT', body: rule })
  }

  function removeTaxRule(id: string) {
    return $fetch(`${urlBase}/tax-rules/${id}`, { method: 'DELETE' })
  }

  return {
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
  }
}
