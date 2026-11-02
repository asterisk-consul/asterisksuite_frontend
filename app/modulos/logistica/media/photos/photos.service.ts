import type {
  Photo,
  CreatePhotoDto
} from '~/modulos/logistica/media/photos/photos.types'

export const usePhotosService = () => {
  const create = (payload: CreatePhotoDto) =>
    $fetch<Photo>('/api/photos', {
      method: 'POST',
      body: payload
    })

  const findByEntity = (entityType: string, entityId: string) =>
    $fetch<Photo[]>(`/api/photos/${entityType}/${entityId}`)

  const findMediaByEntity = (entityType: string, entityId: string) =>
    $fetch<Photo[]>(`/api/media/photos/${entityType}/${entityId}`)

  const uploadMedia = (body: FormData) =>
    $fetch<any>('/api/media/upload', { method: 'POST', body })

  const getMediaBlob = async (url: string) => {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) throw new Error(`No se pudo abrir el archivo (${response.status})`)
    return response.blob()
  }

  const remove = (photoId: string) =>
    $fetch<void>(`/api/media/photos/${photoId}`, { method: 'DELETE' })

  const findProductPhotos = (productId: string) =>
    $fetch<any[]>(`/api/media/photos/product/${productId}`)

  return {
    create,
    findByEntity,
    findMediaByEntity,
    uploadMedia,
    getMediaBlob,
    remove
  }
}
