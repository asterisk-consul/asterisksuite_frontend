<script setup lang="ts">
interface Photo {
  id: string
  photo_type: string
  file_id: string
  url: string
  thumb_url: string
  medium_url: string
  file_name: string
  file_size: number
}

interface Props {
  entityType: string
  entityId: string
  maxFiles?: number
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

async function loadPhotos() {
  loading.value = true
  try {
    photos.value = await $fetch<Photo[]>(
      `/api/media/photos/${props.entityType}/${props.entityId}`
    )
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPhotos())

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const canAdd = computed(() => photos.value.length < props.maxFiles)

defineExpose({ loadPhotos })
</script>

<template>
  <div class="space-y-3">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-4">
      <ULoader size="sm" />
    </div>

    <!-- Empty -->
    <div v-else-if="photos.length === 0" class="text-center py-6 text-muted text-sm">
      No hay imágenes cargadas.
    </div>

    <!-- Gallery grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="relative group aspect-square rounded-lg overflow-hidden border border-default bg-muted/30 cursor-pointer"
        @click="selectedPhoto = photo"
      >
        <img
          :src="photo.thumb_url"
          :alt="photo.file_name"
          class="w-full h-full object-cover"
          loading="lazy"
        />

        <!-- Overlay on hover -->
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <UButton
            icon="i-lucide-eye"
            size="xs"
            color="neutral"
            variant="solid"
            @click.stop="selectedPhoto = photo"
          />
          <UButton
            icon="i-lucide-trash-2"
            size="xs"
            color="error"
            variant="solid"
            @click.stop="handleDelete(photo.id)"
          />
        </div>

        <!-- Photo type badge -->
        <UBadge
          v-if="photo.photo_type !== 'default'"
          :label="photo.photo_type"
          size="xs"
          color="neutral"
          variant="soft"
          class="absolute top-1 left-1"
        />
      </div>
    </div>

    <!-- Lightbox -->
    <UModal v-model:open="selectedPhoto" :title="selectedPhoto?.file_name">
      <template #body>
        <div v-if="selectedPhoto" class="space-y-3">
          <img
            :src="selectedPhoto.url"
            :alt="selectedPhoto.file_name"
            class="w-full rounded-lg"
          />
          <div class="flex items-center justify-between text-xs text-muted">
            <span>{{ selectedPhoto.file_name }}</span>
            <span>{{ formatSize(selectedPhoto.file_size || 0) }}</span>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
