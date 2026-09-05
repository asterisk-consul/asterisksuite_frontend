import type {
  TreasuryDashboard,
  TreasuryMovement,
  TreasuryMovementsQuery
} from '~/modulos/erp/treasury-reports/types/treasury-reports.types'

const urlBase = '/api/erp/treasury'

export const useTreasuryReportsService = () => {
  const dashboard = () => {
    return $fetch<TreasuryDashboard>(`${urlBase}/dashboard`)
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
