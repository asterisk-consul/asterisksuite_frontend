export interface ArcaPointOfSale {
  number: number
  emissionType: string
}

export interface ArcaSettings {
  configured: boolean
  issuer_cuit: string | null
  environment: 'HOMOLOGATION'
  point_of_sale: number | null
  certificate_subject: string | null
  certificate_serial: string | null
  certificate_valid_to: string | null
  points_of_sale: ArcaPointOfSale[]
  last_test_status: 'NOT_TESTED' | 'READY' | 'ERROR'
  last_test_message: string | null
  last_tested_at: string | null
  simulation_enabled: boolean
  simulated?: boolean
}

const apiFetch = <T>(request: string, options?: any): Promise<T> =>
  ($fetch as unknown as (request: string, options?: any) => Promise<T>)(request, options)

const endpoint = '/api/backend/erp/arca/settings'

export const ArcaSettingsService = {
  get: () => apiFetch<ArcaSettings>(endpoint),

  saveCredentials(issuerCuit: string, certificate: File, privateKey: File) {
    const body = new FormData()
    body.append('issuer_cuit', issuerCuit)
    body.append('certificate', certificate)
    body.append('private_key', privateKey)
    return apiFetch<ArcaSettings>(`${endpoint}/credentials`, { method: 'POST', body })
  },

  test: () => apiFetch<ArcaSettings>(`${endpoint}/test`, { method: 'POST' }),

  simulateTest: () => apiFetch<ArcaSettings>(`${endpoint}/simulate-test`, { method: 'POST' }),

  selectPointOfSale(pointOfSale: number | null) {
    return apiFetch<ArcaSettings>(`${endpoint}/point-of-sale`, {
      method: 'PATCH',
      body: { point_of_sale: pointOfSale }
    })
  }
}
