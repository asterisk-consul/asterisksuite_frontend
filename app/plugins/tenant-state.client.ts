import { watch } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useBankAccountsStore } from '~/modulos/erp/bank-accounts/store/bank-accounts.store'
import { useBankConceptsStore } from '~/modulos/erp/bank-concepts/store/bank-concepts.store'
import { useCashBoxesStore } from '~/modulos/erp/cash-boxes/store/cash-boxes.store'
import { useCashBoxMovementsStore } from '~/modulos/erp/cash-box-movements/store/cash-box-movements.store'
import { useChecksStore } from '~/modulos/erp/checks/store/checks.store'
import { useCurrentAccountsStore } from '~/modulos/erp/current-accounts/store/current-accounts.store'
import { usePaymentsStore } from '~/modulos/erp/payments/store/payments.store'
import { usePaymentReportsStore } from '~/modulos/erp/payment-reports/store/payment-reports.store'
import { useTreasuryReportsStore } from '~/modulos/erp/treasury-reports/store/treasury-reports.store'

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const tenantStores = [
    useBankAccountsStore(),
    useBankConceptsStore(),
    useCashBoxesStore(),
    useCashBoxMovementsStore(),
    useChecksStore(),
    useCurrentAccountsStore(),
    usePaymentsStore(),
    usePaymentReportsStore(),
    useTreasuryReportsStore()
  ]

  watch(
    () => auth.selectedCompany?.id,
    (companyId, previousCompanyId) => {
      if (!previousCompanyId || companyId === previousCompanyId) return
      for (const store of tenantStores) store.reset()
    },
    { flush: 'sync' }
  )
})
