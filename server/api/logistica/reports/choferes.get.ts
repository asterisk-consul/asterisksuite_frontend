import { apiProxy } from '~~/server/utils/api-proxy'
import { getQuery } from 'h3'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  // Construir query string dinámicamente
  const queryString = new URLSearchParams(
    Object.entries(query).reduce(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value)
        }
        return acc
      },
      {} as Record<string, string>
    )
  ).toString()

  const endpoint = `/reportes/choferes${queryString ? `?${queryString}` : ''}`

  return apiProxy(event, endpoint)
})
