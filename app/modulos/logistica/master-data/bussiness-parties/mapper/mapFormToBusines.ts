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

    businness_names: form.businness_names || undefined,

    document_type: form.document_type || undefined,

    document_number: form.document_number || undefined,

    address: form.address || undefined,

    vat_condition: form.vat_condition,

    exemption_rate: Number(form.exemption_rate ?? 0),

    email: form.email || undefined,

    alias: form.alias,

    cbu: form.cbu || undefined,

    tax_id: form.tax_id || undefined,

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
      }))
  }
}

export const mapBusinessPartyToForm = (party: BusinessParty): BusinessPartyForm => {
  return {
    id: party.id,

    active: party.active ?? true,

    type: party.type as 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'PARTNER',

    name: party.name ?? '',

    business_names: party.business_names ?? '',

    document_type: party.document_type ?? '',

    document_number: party.document_number ?? '',

    address: party.address ?? '',

    tax_id: party.tax_id ?? '',

    vat_condition: party.vat_condition ?? '',

    exemption_rate: Number(party.exemption_rate ?? 0),

    email: party.email ?? '',

    alias: party.alias ?? '',

    cbu: party.cbu ?? '',

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
      })) ?? []
  }
}
