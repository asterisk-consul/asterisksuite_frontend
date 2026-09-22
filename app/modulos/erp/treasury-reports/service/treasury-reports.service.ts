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

  return {
    dashboard,
    movements
  }
}
