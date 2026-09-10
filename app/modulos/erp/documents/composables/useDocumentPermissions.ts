import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const CATEGORY_SLUG: Record<string, string> = {
  QUOTE: 'quotes', ORDER: 'orders', INVOICE: 'invoices', REMITO: 'delivery_notes',
  CREDIT_NOTE: 'credit_notes', DEBIT_NOTE: 'debit_notes', RECEIPT: 'receipts', OPENING_BALANCE: 'opening_balances'
}

export function useDocumentPermissions() {
  const { hasPermission } = useRoles()
  const { isOwnerOrAdmin } = useCompanyRole()

  const can = (scope: 'sales' | 'purchases', category: string | undefined, action: string) => {
    if (isOwnerOrAdmin.value) return true
    const legacy = scope === 'sales'
      ? [`sales.${action}`, `documents.${action}`]
      : [`purchases.${action}`, `documents-purchases.${action}`, `documents.${action}`]
    if (legacy.some(hasPermission)) return true
    const slug = category ? CATEGORY_SLUG[category] : undefined
    return slug ? hasPermission(`${scope}.${slug}.${action}`) : false
  }

  return { can }
}
