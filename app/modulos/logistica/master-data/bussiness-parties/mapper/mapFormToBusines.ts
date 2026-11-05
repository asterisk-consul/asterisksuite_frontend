import type {
  BusinessPartyForm,
  CreateBusinessPartyInput,
  BusinessParty
} from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'

export const mapFormToBusinessPartyDto = (form: BusinessPartyForm): CreateBusinessPartyInput => {
  const isEmployee = form.type === 'EMPLOYEE'
  const isPartner = form.type === 'PARTNER'
  const isPerson = isEmployee || isPartner
  const isInvestor = isPartner && form.partner_kind === 'INVESTOR'

  return {
    active: form.active ?? true,
    type: form.type,
    name: form.name,
    first_name: isPerson ? form.first_name || undefined : undefined,
    last_name: isPerson ? form.last_name || undefined : undefined,
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
      })),

    // ─── Datos laborales y comerciales asociados a la persona ──
    position: isEmployee ? form.position || undefined : undefined,
    department: isEmployee ? form.department || undefined : undefined,
    hire_date: isEmployee ? form.hire_date || undefined : undefined,
    salary: isEmployee && form.salary ? String(form.salary) : undefined,
    currency_code: isEmployee ? form.currency_code || undefined : undefined,
    partner_kind: isPartner ? form.partner_kind ?? 'PARTNER' : undefined,
    share_percentage: isPartner
      ? isInvestor ? null : form.share_percentage ? String(form.share_percentage) : null
      : undefined,
    capital_contributed: isPartner
      ? isInvestor ? null : form.capital_contributed ? String(form.capital_contributed) : null
      : undefined,
    is_salesperson: isPerson ? form.is_salesperson ?? false : undefined,
    default_commission_rate: isEmployee
      ? form.default_commission_rate ?? undefined
      : isPartner && isInvestor
        ? null
        : isPartner && form.is_salesperson
          ? Number(form.default_commission_rate ?? 0)
          : undefined,
    commission_base: isPerson && (isEmployee || form.is_salesperson)
      ? form.commission_base || undefined
      : undefined,
    customer_enabled: form.customer_enabled ?? false
  }
}

export const mapBusinessPartyToForm = (party: BusinessParty): BusinessPartyForm => {
  const isPerson = party.type === 'EMPLOYEE' || party.type === 'PARTNER'
  const nameParts = (party.name ?? '').split(' ')
  const employee = party.employee
  const partner = party.partner

  return {
    id: party.id,
    active: party.active ?? true,
    type: party.type as 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'PARTNER',
    name: party.name ?? '',
    first_name: isPerson ? (party.type === 'PARTNER' ? partner?.first_name : employee?.first_name) || nameParts[0] || '' : '',
    last_name: isPerson ? (party.type === 'PARTNER' ? partner?.last_name : employee?.last_name) || nameParts.slice(1).join(' ') : '',
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
      })) ?? [],

    // ─── Datos laborales prellenados desde el employees vinculado (type=EMPLOYEE) ──
    position: employee?.position ?? '',
    department: employee?.department ?? '',
    hire_date: employee?.hire_date ?? '',
    salary: employee?.salary ?? '',
    currency_code: employee?.currency_code ?? 'ARS',
    partner_kind: partner?.partner_kind ?? 'PARTNER',
    share_percentage: partner?.share_percentage == null ? '' : String(partner.share_percentage),
    capital_contributed: partner?.capital_contributed == null ? '' : String(partner.capital_contributed),
    is_salesperson: (party.type === 'PARTNER' ? partner?.is_salesperson : employee?.is_salesperson) ?? false,
    default_commission_rate: Number((party.type === 'PARTNER' ? partner?.default_commission_rate : employee?.default_commission_rate) ?? 0),
    commission_base: (party.type === 'PARTNER' ? partner?.commission_base : employee?.commission_base) ?? 'INVOICED',
    customer_enabled: party.type === 'CUSTOMER'
      || Boolean(party.roles?.some(role => role.role === 'CUSTOMER' && role.active))
  }
}
