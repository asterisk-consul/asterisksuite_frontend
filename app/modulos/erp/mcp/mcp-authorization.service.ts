export interface McpAuthorizationRequest {
  id: string
  clientName: string
  scopes: string[]
  expiresAt: string
}

export interface McpAuthorizationResult {
  redirect_url: string
}

const baseUrl = '/api/mcp/authorization/request'

export const useMcpAuthorizationService = () => ({
  getRequest: (requestId: string) =>
    $fetch<McpAuthorizationRequest>(baseUrl, { query: { request_id: requestId } }),
  approve: (requestId: string, companyId: string) =>
    $fetch<McpAuthorizationResult>(`${baseUrl}/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST', body: { company_id: companyId }
    }),
  deny: (requestId: string) =>
    $fetch<McpAuthorizationResult>(`${baseUrl}/${encodeURIComponent(requestId)}/deny`, { method: 'POST' })
})
