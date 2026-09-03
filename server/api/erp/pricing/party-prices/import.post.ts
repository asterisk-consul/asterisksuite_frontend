import { getQuery } from 'h3'
import { getTenant } from '~~/server/utils/tenant'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const tenant = getTenant(event)
  const query = getQuery(event)

  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file')

  const partyId = query.party_id as string
  const operationType = query.operation_type as string

  if (!file) {
    throw createError({ statusCode: 400, message: 'No se envió archivo' })
  }
  if (!partyId) {
    throw createError({ statusCode: 400, message: 'Falta party_id' })
  }
  if (!operationType) {
    throw createError({ statusCode: 400, message: 'Falta operation_type' })
  }

  const blob = new Blob([file.data], { type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const backendFormData = new FormData()
  backendFormData.append('file', blob, file.filename)
  backendFormData.append('party_id', partyId)
  backendFormData.append('operation_type', operationType)

  const accessCookie = getCookie(event, 'api_access')
  const apiUrl = `${config.apiBase}/pricing/party-prices/import`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'x-tenant': tenant,
      ...(accessCookie && { Authorization: `Bearer ${accessCookie}` })
    },
    body: backendFormData
  })

  return response.json()
})
