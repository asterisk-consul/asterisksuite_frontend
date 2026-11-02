import type {
  TreasuryDashboard,
  TreasuryMovement,
  TreasuryMovementsQuery
} from '~/modulos/erp/treasury-reports/types/treasury-reports.types'

const urlBase = '/api/backend/treasury'

export const useTreasuryReportsService = () => {
  const dashboard = (checksDays?: number) => {
    return $fetch<TreasuryDashboard>(`${urlBase}/dashboard`, {
      query: checksDays ? { checks_days: checksDays } : undefined
    })
  }

  const movements = (params?: TreasuryMovementsQuery) => {
    return $fetch<TreasuryMovement[]>(`${urlBase}/movements`, {
      method: 'GET',
      query: params
    })
  }

  const bankExpenses = (params?: Record<string, any>) => {
    return $fetch<any>(`${urlBase}/bank-expenses`, {
      method: 'GET',
      query: params
    })
  }

  const expensesByAccount = (params?: Record<string, any>) =>
    $fetch<any>(`${urlBase}/expenses-by-account`, { query: params })

  const libroIva = (params?: Record<string, any>) =>
    $fetch<any[]>(`${urlBase}/libro-iva`, { query: params })

  return {
    dashboard,
    movements,
    bankExpenses,
    expensesByAccount,
    libroIva
  }
}
