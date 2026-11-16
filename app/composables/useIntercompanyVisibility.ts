import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useIntercompanyTreasuryService } from '~/modulos/erp/treasury/intercompany-treasury.service'

export const useIntercompanyVisibility = () => {
  const auth = useAuthStore()
  const { hasPermission } = useRoles()
  const { isOwnerOrAdmin } = useCompanyRole()
  const state = useState<{ companyId: string | null; enabled: boolean }>('intercompany-visibility', () => ({ companyId: null, enabled: false }))
  const permitted = computed(() => isOwnerOrAdmin.value || hasPermission('payments.read') || hasPermission('cash_box_transfers.read'))
  const visible = computed(() => permitted.value && Boolean(auth.selectedCompany?.id) && state.value.companyId === auth.selectedCompany?.id && state.value.enabled)

  const refresh = async () => {
    const companyId = auth.selectedCompany?.id ?? null
    state.value = { companyId, enabled: false }
    if (!companyId || !permitted.value) return
    try {
      const result = await useIntercompanyTreasuryService().availability()
      if (auth.selectedCompany?.id === companyId) state.value = { companyId, enabled: result.enabled }
    } catch {
      if (auth.selectedCompany?.id === companyId) state.value = { companyId, enabled: false }
    }
  }

  onMounted(() => { void refresh() })
  watch(() => auth.selectedCompany?.id, () => { void refresh() })
  return { visible, refresh }
}
