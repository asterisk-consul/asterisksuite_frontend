export interface McpConnection {
  id: string
  clientName: string
  company: { id: string; name: string; subdomain: string | null } | null
  scopes: string[]
  createdAt: string
  revokedAt: string | null
}

const baseUrl = '/api/mcp/connections'

export const useMcpConnectionsService = () => ({
  findAll: () => $fetch<McpConnection[]>(baseUrl),
  revoke: (id: string) => $fetch<void>(`${baseUrl}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
})
