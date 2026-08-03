import type {
  BusinessPartyForm,
  CreateBusinessPartyInput,
  BusinessParty
} from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

export const mapFormToBusinessPartyDto = (form: BusinessPartyForm): CreateBusinessPartyInput => {
  return {
    active: form.active ?? true,
    type: form.type,
    name: form.name,
    business_names: form.business_names || undefined,
    document_type: form.document_type || undefined,
    email: form.email || undefined,
    tax_id: form.tax_id || undefined,
    vat_condition: form.vat_condition || undefined,
    exemption_rate: Number(form.exemption_rate ?? 0),

    locations: form.locations
      .filter((l) => l.location_id)
      .map((l) => ({
        location_id: l.location_id,
        label: l.label
      })),

    contacts: form.contacts
      .filter((c) => c.first_name || c.email)
      .map((c) => ({
        first_name: c.first_name,
        last_name: c.last_name,
        role: c.role,
        phone: c.phone,
        email: c.email
      })),

    bank_accounts: form.bank_accounts
      .filter((b) => b.cbu)
      .map((b) => ({
        cbu: b.cbu,
        alias: b.alias || undefined,
        bank_name: b.bank_name || undefined,
        account_type: b.account_type || undefined,
        currency: b.currency || undefined,
        description: b.description || undefined,
        holder_name: b.holder_name || undefined,
        is_default: b.is_default ?? false
      }))
  }
}

export const mapBusinessPartyToForm = (party: BusinessParty): BusinessPartyForm => {
  const isPerson = party.type === 'EMPLOYEE' || party.type === 'PARTNER'
  const nameParts = (party.name ?? '').split(' ')

  return {
    id: party.id,
    active: party.active ?? true,
    type: party.type as 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'PARTNER',
    name: party.name ?? '',
    first_name: isPerson ? nameParts[0] || '' : '',
    last_name: isPerson ? nameParts.slice(1).join(' ') : '',
    business_names: party.business_names ?? '',
    document_type: party.document_type ?? '',
    email: party.email ?? '',
    tax_id: party.tax_id ?? '',
    vat_condition: party.vat_condition ?? '',
    exemption_rate: Number(party.exemption_rate ?? 0),

    locations:
      party.party_locations?.map((l) => ({
        location_id: l.location_id ?? '',
        label: l.label ?? ''
      })) ?? [],

    contacts:
      party.party_contacts?.map((c) => ({
        first_name: c.first_name ?? '',
        last_name: c.last_name ?? '',
        role: c.role ?? '',
        phone: c.phone ?? '',
        email: c.email ?? ''
      })) ?? [],

    bank_accounts:
      party.party_bank_accounts?.map((b) => ({
        cbu: b.cbu ?? '',
        alias: b.alias ?? '',
        bank_name: b.bank_name ?? '',
        account_type: b.account_type ?? '',
        currency: b.currency ?? '',
        description: b.description ?? '',
        holder_name: b.holder_name ?? '',
        is_default: b.is_default ?? false
      })) ?? []
  }
}
