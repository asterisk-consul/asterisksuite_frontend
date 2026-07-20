import { apiProxy } from '~~/server/utils/api-proxy'

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const file = formData.get('file') as File
  const entityType = formData.get('entity_type') as string
  const entityId = formData.get('entity_id') as string
  const photoType = formData.get('photo_type') as string

  if (!file) {
    throw createError({ statusCode: 400, message: 'No file provided' })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const blob = new Blob([buffer], { type: file.type })
  const form = new FormData()
  form.append('file', blob, file.name)
  form.append('entity_type', entityType)
  form.append('entity_id', entityId)
  if (photoType) form.append('photo_type', photoType)

  return apiProxy(event, '/media/upload', {
    method: 'POST',
    body: form,
  })
})
