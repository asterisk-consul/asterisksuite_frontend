import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const file = formData.get('file') as File

  if (!file) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const blob = new Blob([buffer], { type: file.type })

  const form = new FormData()
  form.append('file', blob, file.name)

  return apiProxy(event, '/data-import/compras', {
    method: 'POST',
    body: form,
  })
})
