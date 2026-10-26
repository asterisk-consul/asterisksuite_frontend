import type { ManagementReportMetadata, ManagementReportResponse, PaymentState, ProgressState, ReportBasis, ReportCanvasComponent, ReportChartType, ReportGroupBy, ReportTemplateColumn, ReportVisualization, SavedManagementReportTemplate } from './management-reports.types'
import type { ConsolidatedReportCompanyOption, ConsolidatedReportResponse, ConsolidatedReportView } from './consolidated-reports.types'

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
  rows_limit?: number
}

export const useManagementReportsService = () => ({
  getReport: (query: ManagementReportQuery) => $fetch<ManagementReportResponse>('/api/backend/reports/management', { query }),
  getMetadata: () => $fetch<ManagementReportMetadata>('/api/backend/reports/management/metadata'),
  getTemplates: () => $fetch<SavedManagementReportTemplate[]>('/api/backend/reports/management/templates'),
  saveTemplate: (body: { id?: string; name: string; source: 'SALES'; columns: ReportTemplateColumn[]; visualizations: ReportVisualization[]; chart_type: ReportChartType; components?: ReportCanvasComponent[]; query: ManagementReportQuery; shared: boolean }) =>
    $fetch<SavedManagementReportTemplate>('/api/backend/reports/management/templates', { method: 'POST', body }),
  deleteTemplate: (id: string) => $fetch<{ success: boolean }>(`/api/backend/reports/management/templates/${id}`, { method: 'DELETE' }),
  getConsolidatedCompanies: () => $fetch<ConsolidatedReportCompanyOption[]>('/api/backend/reports/management/consolidated/companies'),
  getConsolidatedReport: (body: { company_ids: string[]; date_from: string; date_to: string; view?: ConsolidatedReportView }) =>
    $fetch<ConsolidatedReportResponse>('/api/backend/reports/management/consolidated', { method: 'POST', body }),
  exportConsolidatedReport: (body: { company_ids: string[]; date_from: string; date_to: string; view?: ConsolidatedReportView; company_display_mode?: 'combined' | 'separate'; format: 'pdf' | 'xlsx' | 'csv' }) =>
    $fetch<Blob>('/api/backend/reports/management/consolidated/export', { method: 'POST', body, responseType: 'blob' })
})
