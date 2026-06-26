import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  console.log('================ ME START ================')
  console.log('[ME] cookies:', JSON.stringify({
    api_refresh: getCookie(event, 'api_refresh')?.slice(0, 20),
    api_access: getCookie(event, 'api_access')?.slice(0, 20)
  }))

  try {
    const result = await apiProxy(event, '/auth/me', {
      method: 'GET'
    })
    console.log('[ME] success:', JSON.stringify(result))
    return result
  } catch (err: any) {
    console.log('[ME] FAILED:', err?.statusCode, err?.message)
    console.log('[ME] error data:', JSON.stringify(err?.data))
    throw err
  }
})
