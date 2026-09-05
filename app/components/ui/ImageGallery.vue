<script setup lang="ts">
interface Photo {
  id: string
  photo_type: string
  file_id: string
  url: string
  thumb_url: string
  medium_url: string
  download_url?: string
  file_name: string
  file_size: number
  mime_type?: string
}

interface Props {
  entityType: string
  entityId: string
  maxFiles?: number
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 5,
})

const emit = defineEmits<{
  deleted: [photoId: string]
}>()

const photos = ref<Photo[]>([])
const loading = ref(false)
const selectedPhoto = ref<Photo | null>(null)
const previewUrl = ref<string | null>(null)
const previewLoading = ref(false)
const previewError = ref('')
const thumbnailUrls = ref<Record<string, string>>({})

function clearThumbnailUrls() {
  Object.values(thumbnailUrls.value).forEach(url => URL.revokeObjectURL(url))
  thumbnailUrls.value = {}
}

async function loadThumbnails(items: Photo[]) {
  clearThumbnailUrls()
  await Promise.all(items.filter(isImage).map(async (photo) => {
    try {
      const response = await fetch(photo.thumb_url || photo.url, { credentials: 'include' })
      if (!response.ok) return
      const blob = await response.blob()
      if (blob.size) thumbnailUrls.value[photo.id] = URL.createObjectURL(blob)
    } catch {
      // Se conserva el icono del archivo si no puede generarse la miniatura.
    }
  }))
}

function clearPreviewUrl() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

const previewOpen = computed({
  get: () => selectedPhoto.value !== null,
  set: (open: boolean) => {
    if (!open) {
      selectedPhoto.value = null
      previewError.value = ''
      clearPreviewUrl()
    }
  },
})

async function openPreview(photo: Photo) {
  selectedPhoto.value = photo
  previewLoading.value = true
  previewError.value = ''
  clearPreviewUrl()
  try {
    const response = await fetch(photo.url || `/api/media/files/${photo.file_id}/view`, {
      credentials: 'include',
    })
    if (!response.ok) throw new Error(`No se pudo abrir el archivo (${response.status})`)
    const blob = await response.blob()
    if (!blob.size) throw new Error('El servidor devolvió un archivo vacío')
    if (!Number(photo.file_size)) photo.file_size = blob.size
    if (blob.type && (!photo.mime_type || photo.mime_type === 'application/octet-stream')) {
      photo.mime_type = blob.type
    }
    previewUrl.value = URL.createObjectURL(blob)
  } catch (error: any) {
    previewError.value = error?.message || 'No se pudo generar la vista previa'
  } finally {
    previewLoading.value = false
  }
}

async function loadPhotos() {
  loading.value = true
  try {
    photos.value = await $fetch<Photo[]>(
      `/api/media/photos/${props.entityType}/${props.entityId}`
    )
    await loadThumbnails(photos.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPhotos())
onBeforeUnmount(() => {
  clearPreviewUrl()
  clearThumbnailUrls()
})

async function handleDelete(photoId: string) {
  try {
    await $fetch(`/api/media/photos/${photoId}`, { method: 'DELETE' })
    photos.value = photos.value.filter((p) => p.id !== photoId)
    emit('deleted', photoId)
    if (selectedPhoto.value?.id === photoId) {
      selectedPhoto.value = null
    }
  } catch (e) {
    console.error(e)
  }
}

function formatSize(value: number | string | null | undefined) {
  const bytes = Number(value) || 0
  if (!bytes) return 'Tamaño no disponible'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const canAdd = computed(() => photos.value.length < props.maxFiles)
const isImage = (photo: Photo) => photo.mime_type?.startsWith('image/') === true || /\.(jpe?g|png|webp|gif)$/i.test(photo.file_name || '')
const isPdf = (photo: Photo) => photo.mime_type === 'application/pdf' || /\.pdf$/i.test(photo.file_name || '')

defineExpose({ loadPhotos })
</script>

<template>
  <div class="space-y-3">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-4">
      <ULoader size="sm" />
    </div>

    <!-- Empty -->
    <div v-else-if="photos.length === 0" class="rounded-lg border border-dashed border-default py-8 text-center text-muted text-sm">
      <UIcon name="i-lucide-paperclip" class="size-8 mx-auto mb-2" />
      Todavía no hay archivos adjuntos.
    </div>

    <!-- Gallery grid -->
    <div v-else class="space-y-2">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="flex items-center gap-3 rounded-lg border border-default bg-default p-3"
      >
        <button class="size-16 shrink-0 overflow-hidden rounded-md bg-muted/40" type="button" @click="openPreview(photo)">
          <img v-if="isImage(photo) && thumbnailUrls[photo.id]"
          :src="thumbnailUrls[photo.id]"
          :alt="photo.file_name"
          class="w-full h-full object-cover"
          loading="lazy"
          />
          <span v-else class="w-full h-full flex items-center justify-center text-error">
            <UIcon name="i-lucide-file-text" class="size-8" />
          </span>
        </button>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium" :title="photo.file_name">{{ photo.file_name }}</p>
          <p class="mt-1 text-xs text-muted">
            {{ photo.mime_type === 'application/pdf' ? 'Documento PDF' : 'Imagen' }} · {{ formatSize(photo.file_size) }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <UButton
            label="Ver"
            icon="i-lucide-eye"
            size="xs"
            variant="soft"
            @click="openPreview(photo)"
          />
          <UButton
            label="Descargar"
            icon="i-lucide-download"
            size="xs"
            color="neutral"
            variant="ghost"
            :to="photo.download_url || `/api/media/files/${photo.file_id}/download`"
            external
          />
          <UButton
            v-if="!readonly"
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="ghost"
            @click="handleDelete(photo.id)"
          />
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <UModal v-model:open="previewOpen" :title="selectedPhoto?.file_name || 'Vista previa del comprobante'" :ui="{ content: 'sm:max-w-5xl' }">
      <template #body>
        <div v-if="selectedPhoto" class="space-y-3">
          <div v-if="previewLoading" class="flex min-h-64 flex-col items-center justify-center gap-3 text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-9 animate-spin" />
            <p>Cargando vista previa...</p>
          </div>
          <UAlert
            v-else-if="previewError"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="No se pudo mostrar el archivo"
            :description="previewError"
          />
          <img v-else-if="previewUrl && isImage(selectedPhoto)"
            :src="previewUrl"
            :alt="selectedPhoto.file_name"
            class="max-h-[70vh] w-full rounded-lg object-contain bg-muted/20"
          />
          <iframe
            v-else-if="previewUrl && isPdf(selectedPhoto)"
            :src="previewUrl"
            class="w-full h-[70vh] rounded-lg border border-default"
            title="Vista previa del PDF"
          />
          <div v-else class="p-8 text-center text-muted">Este archivo se puede descargar para visualizarlo.</div>
          <div class="flex items-center justify-between text-xs text-muted">
            <span>{{ selectedPhoto.file_name }}</span>
            <span>{{ formatSize(selectedPhoto.file_size || 0) }}</span>
          </div>
          <div class="flex justify-end">
            <UButton
              label="Descargar original"
              icon="i-lucide-download"
              :to="selectedPhoto.download_url || `/api/media/files/${selectedPhoto.file_id}/download`"
              external
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
