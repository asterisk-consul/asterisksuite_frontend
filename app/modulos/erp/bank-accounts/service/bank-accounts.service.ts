import type {
  BankAccount,
  BankAccountMovement,
  BankAccountMovementDetails,
  BankAccountUserRole,
  CreateBankAccountInput,
  CreateBankMovementInput,
  UpdateBankAccountInput,
  DeleteBankAccountInput,
  BankChargeRule,
  BankChargeRuleInput,
  BankChargeRuleTrigger,
  SuggestedBankCharge
} from '~/modulos/erp/bank-accounts/types/bank-accounts.types'

const urlBase = '/api/backend/bank-accounts'

export const useBankAccountsService = () => {
  const findAll = () => {
    return $fetch<BankAccount[]>(urlBase, {
      method: 'GET'
    })
  }

  const findOne = (id: string) => {
    return $fetch<BankAccount>(`${urlBase}/${id}`)
  }

  const create = (data: CreateBankAccountInput) => {
    return $fetch<BankAccount>(urlBase, {
      method: 'POST',
      body: data
    })
  }

  const update = (id: string, data: UpdateBankAccountInput) => {
    return $fetch<BankAccount>(`${urlBase}/${id}`, {
      method: 'PATCH',
      body: data
    })
  }

  const remove = (id: string, data: DeleteBankAccountInput) => {
    return $fetch<void>(`${urlBase}/${id}`, {
      method: 'DELETE',
      body: data
    })
  }

  const getMovements = (id: string) => {
    return $fetch<BankAccountMovement[]>(`${urlBase}/${id}/movements`)
  }

  const getMovementDetails = (id: string, movementId: string) =>
    $fetch<BankAccountMovementDetails>(`${urlBase}/${id}/movements/${movementId}/details`)

  const createMovement = (id: string, data: CreateBankMovementInput) => {
    return $fetch<BankAccountMovement>(`${urlBase}/${id}/movements`, {
      method: 'POST',
      body: data
    })
  }

  const createTransfer = (id: string, data: { destination_bank_account_id: string; amount: number; date: string; reference?: string; notes?: string }) =>
    $fetch(`${urlBase}/${id}/transfers`, { method: 'POST', body: data })

  const cancelMovement = (id: string, movementId: string) => {
    return $fetch<{ ok: boolean }>(`${urlBase}/${id}/movements/${movementId}/cancel`, {
      method: 'POST'
    })
  }

  const getUserRoles = (id: string) => {
    return $fetch<BankAccountUserRole[]>(`${urlBase}/${id}/user-roles`)
  }

  const addUserRole = (bankAccountId: string, userId: string, role: string) => {
    return $fetch<BankAccountUserRole>(`${urlBase}/${bankAccountId}/user-roles`, {
      method: 'POST',
      body: { user_id: userId, role }
    })
  }

  const removeUserRole = (bankAccountId: string, userId: string) => {
    return $fetch<void>(`${urlBase}/${bankAccountId}/user-roles/${userId}`, {
      method: 'DELETE'
    })
  }

  const getChargeRules = (bankAccountId: string) => $fetch<BankChargeRule[]>(`${urlBase}/${bankAccountId}/charge-rules`)
  const createChargeRule = (bankAccountId: string, data: BankChargeRuleInput) => $fetch<BankChargeRule>(`${urlBase}/${bankAccountId}/charge-rules`, { method: 'POST', body: data })
  const updateChargeRule = (bankAccountId: string, ruleId: string, data: BankChargeRuleInput) => $fetch<BankChargeRule>(`${urlBase}/${bankAccountId}/charge-rules/${ruleId}`, { method: 'PATCH', body: data })
  const removeChargeRule = (bankAccountId: string, ruleId: string) => $fetch(`${urlBase}/${bankAccountId}/charge-rules/${ruleId}`, { method: 'DELETE' })
  const getSuggestedCharges = (bankAccountId: string, params: { trigger: BankChargeRuleTrigger; amount: number; date?: string; currency_code?: string }) =>
    $fetch<SuggestedBankCharge[]>(`${urlBase}/${bankAccountId}/suggested-charges`, { query: params })

  return {
    findAll,
    findOne,
    create,
    update,
    remove,
    getMovements,
    getMovementDetails,
    createMovement,
    createTransfer,
    cancelMovement,
    getUserRoles,
    addUserRole,
    removeUserRole,
    getChargeRules,
    createChargeRule,
    updateChargeRule,
    removeChargeRule,
    getSuggestedCharges
  }
}
