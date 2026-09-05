import type { BusinessPartyForm } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import type { CreatePartnerInput, Partner } from '~/modulos/erp/partners/types/partners.types'

/**
 * Maps BusinessPartyForm → CreatePartnerInput for API submission.
 * Extracts partner-specific fields and business_party fields separately.
 */
export function mapFormToPartnerDto(form: BusinessPartyForm): CreatePartnerInput {
  const firstName = form.first_name || form.name?.split(' ')[0] || ''
  const lastName = form.last_name || form.name?.split(' ').slice(1).join(' ') || ''

  return {
    first_name: firstName,
    last_name: lastName,
    document_type: form.document_type || undefined,
    document_number: form.tax_id || undefined,
    share_percentage: form.share_percentage ? String(form.share_percentage) : undefined,
    capital_contributed: form.capital_contributed ? String(form.capital_contributed) : undefined,
    is_active: form.active ?? true,
    // ─── Business party fields ──
    business_name: form.name || [firstName, lastName].filter(Boolean).join(' '),
    email: form.email || undefined,
    tax_id: form.tax_id || undefined,
    vat_condition: form.vat_condition || undefined,
    exemption_rate: form.exemption_rate || undefined,
    locations: form.locations
      ?.filter((l) => l.location_id)
      .map((l) => ({ location_id: l.location_id, label: l.label })) || [],
    contacts: form.contacts
      ?.filter((c) => c.first_name || c.email)
      .map((c) => ({ first_name: c.first_name, last_name: c.last_name, role: c.role, phone: c.phone, email: c.email })) || [],
    bank_accounts: form.bank_accounts
      ?.filter((b) => b.cbu)
      .map((b) => ({
        cbu: b.cbu,
        alias: b.alias || undefined,
        bank_name: b.bank_name || undefined,
        account_type: b.account_type || undefined,
        currency: b.currency || undefined,
        description: b.description || undefined,
        holder_name: b.holder_name || undefined,
        is_default: b.is_default ?? false
      })) || []
  }
}

/**
 * Maps Partner API response → BusinessPartyForm for editing.
 * Merges partner fields with party data into a single form object.
 */
export function mapPartnerToForm(partner: Partner): BusinessPartyForm {
  const party = partner.party
  return {
    id: partner.id,
    type: 'PARTNER',
    name: party?.name || `${partner.first_name} ${partner.last_name}`,
    first_name: partner.first_name || '',
    last_name: partner.last_name || '',
    business_names: '',
    document_type: partner.document_type || '',
    email: party?.email || '',
    tax_id: partner.document_number || party?.tax_id || '',
    vat_condition: party?.vat_condition || '',
    exemption_rate: Number(party?.exemption_rate ?? 0),
    active: partner.is_active,
    // ─── Partner fields ──
    share_percentage: partner.share_percentage || '',
    capital_contributed: partner.capital_contributed || '',
    // ─── Party relations ──
    locations:
      party?.party_locations?.map((l) => ({
        location_id: l.location_id ?? '',
        label: l.label ?? ''
      })) || [],
    contacts:
      party?.party_contacts?.map((c) => ({
        first_name: c.first_name ?? '',
        last_name: c.last_name ?? '',
        role: c.role ?? '',
        phone: c.phone ?? '',
        email: c.email ?? ''
      })) || [],
    bank_accounts:
      party?.party_bank_accounts?.map((b) => ({
        cbu: b.cbu ?? '',
        alias: b.alias ?? '',
        bank_name: b.bank_name ?? '',
        account_type: b.account_type ?? '',
        currency: b.currency ?? '',
        description: b.description ?? '',
        holder_name: b.holder_name ?? '',
        is_default: b.is_default ?? false
      })) || []
  }
}
