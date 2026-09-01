export interface WithholdingProposal {
  tax_type: string
  jurisdiction_id: string | null
  jurisdiction_name: string | null
  withholding_concept_id: string | null
  tax_rule_id: string | null
  rule_name: string
  base_amount: number
  prorrate_percentage: number | null
  rate: number
  withheld_amount: number
  automatic_amount: number
  reason: string
}

export interface WithholdingSkip {
  tax_type: string
  reason: string
}

export interface WithholdingPreviewResult {
  proposals: WithholdingProposal[]
  skipped: WithholdingSkip[]
  total_withheld: number
  context: {
    company_id: string
    party_id: string
    operation_type: string
    base_amount: number
    date: string
    accumulated_month: number
    cuit_suffix_group: string | null
  }
}

export interface CalculateWithholdingsInput {
  party_id: string
  party_tax_id?: string
  base_amount: number
  date?: string
  operation_type?: 'SALE' | 'PURCHASE'
  tax_types?: string[]
  withholding_concept_id?: string
}

export interface TaxJurisdiction {
  id: string
  code: string
  name: string
  is_active: boolean
  sort_order: number
}

export interface WithholdingConcept {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
}

export interface BusinessPartyWithholdingProfile {
  id?: string
  tax_type: string
  is_subject: boolean
  status: 'NORMAL' | 'EXENTO' | 'NO_SUJETO' | 'CERTIFICADO_NO_RETENCION'
  is_pyme: boolean
  observations?: string | null
}

export interface BusinessPartyIibbRegistration {
  id?: string
  registration_type: 'DIRECTO' | 'CONVENIO_MULTILATERAL' | 'NO_INSCRIPTO' | 'EXENTO'
  jurisdiction_id: string | null
  jurisdiction?: { id: string; code: string; name: string } | null
  registration_number?: string | null
  prorrate_percentage?: number | null
  is_active: boolean
}

export interface CompanyTaxJurisdiction {
  id?: string
  jurisdiction_id: string
  jurisdiction?: { id: string; code: string; name: string } | null
  tax_type: string
  is_withholding_agent: boolean
  is_perception_agent: boolean
  registration_number?: string | null
}

export interface TaxRuleBracket {
  id?: string
  accumulated_from: number
  accumulated_to?: number | null
  rate: number
}

export interface TaxRule {
  id: string
  name: string
  tax_type: string
  application_type: string
  jurisdiction_id?: string | null
  jurisdiction?: TaxJurisdiction | null
  withholding_concept_id?: string | null
  concept?: WithholdingConcept | null
  operation_type?: string | null
  cuit_suffix_group?: string | null
  base_type: string
  calculation_method: string
  rate?: number | null
  fixed_amount?: number | null
  minimum_amount?: number | null
  priority: number
  is_active: boolean
  valid_from: string
  valid_to?: string | null
  brackets: TaxRuleBracket[]
}

// Retención a enviar en el payload de pago
export interface PaymentWithholdingPayload {
  tax_type: string
  jurisdiction_id?: string
  withholding_concept_id?: string
  tax_rule_id?: string
  base_amount: number
  rate?: number
  withheld_amount: number
  certificate_number?: string
  certificate_date?: string
  observations?: string
  allocations?: { document_id: string; allocated_amount: number }[]
}
