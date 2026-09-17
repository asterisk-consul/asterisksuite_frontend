import type { ManagementReportMetadata, ManagementReportResponse, PaymentState, ProgressState, ReportBasis, ReportGroupBy } from './management-reports.types'

export interface ManagementReportQuery {
  basis: ReportBasis
  date_from: string
  date_to: string
  group_by: ReportGroupBy
  payment_state: PaymentState
  currency_code?: string
  party_id?: string
  seller_id?: string
  product_id?: string
  point_of_sale_id?: string
  invoicing_state: ProgressState
  delivery_state: ProgressState
}

export const useManagementReportsService = () => ({
  getReport: (query: ManagementReportQuery) => $fetch<ManagementReportResponse>('/api/erp/reports/management', {
    query
  }),
  getMetadata: () => $fetch<ManagementReportMetadata>('/api/erp/reports/management/metadata')
})
