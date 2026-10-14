<script setup lang="ts">
import { enqueueUpload, listPendingUploads, removePendingUpload, type PendingUpload } from '~/utils/offline-upload-queue'

interface Props {
  entityType: string
  entityId: string
  photoType?: string
  maxFiles?: number
  maxSizeMb?: number
  allowDocuments?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  photoType: 'default',
  maxFiles: 5,
  maxSizeMb: 5,
  allowDocuments: false,
})

const emit = defineEmits<{
  uploaded: [file: any]
  queued: [file: any]
  error: [message: string]
}>()

const uploading = ref(false)
const dragOver = ref(false)
const preview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()
const pendingUploads = ref<PendingUpload[]>([])
const retrying = ref(false)
const online = ref(true)

async function loadPending() {
  pendingUploads.value = await listPendingUploads(props.entityType, props.entityId)
}

const updateOnlineStatus = () => { online.value = navigator.onLine }
onMounted(() => {
  updateOnlineStatus()
  loadPending()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

const maxSizeBytes = computed(() => props.maxSizeMb * 1024 * 1024)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function handleDragLeave() {
  dragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
  if (input) input.value = ''
}

async function processFile(file: File) {
  const allowed = file.type.startsWith('image/') || (props.allowDocuments && file.type === 'application/pdf')
  if (!allowed) {
    emit('error', props.allowDocuments ? 'Solo se permiten imágenes o archivos PDF' : 'Solo se permiten archivos de imagen')
    return
  }

  const allowedSizeMb = file.type === 'application/pdf' ? 10 : Math.min(props.maxSizeMb, 5)
  if (file.size > allowedSizeMb * 1024 * 1024) {
    emit('error', `El archivo excede ${allowedSizeMb} MB`)
    return
  }

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    preview.value = e.target?.result as string
  }
  if (file.type.startsWith('image/')) reader.readAsDataURL(file)

  if (!navigator.onLine) {
    await queueFile(file)
    return
  }
  await uploadFile(file)
}

async function queueFile(file: File) {
  try {
    const pending = await enqueueUpload(file, props.entityType, props.entityId, props.photoType)
    await loadPending()
    preview.value = null
    emit('queued', pending)
  } catch {
    emit('error', 'No se pudo guardar el archivo pendiente en este dispositivo')
  }
}

async function uploadFile(file: File, pendingId?: string) {
  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', props.entityType)
    formData.append('entity_id', props.entityId)
    formData.append('photo_type', props.photoType)

    const result = await $fetch<any>('/api/media/upload', {
      method: 'POST',
      body: formData,
    })

    emit('uploaded', result)
    if (pendingId) await removePendingUpload(pendingId)
    await loadPending()
    preview.value = null
  } catch (e: any) {
    const status = e?.statusCode || e?.status || e?.response?.status
    if (!pendingId && (!navigator.onLine || !status)) {
      await queueFile(file)
    } else {
      emit('error', e?.data?.message || 'Error al subir imagen')
    }
  } finally {
    uploading.value = false
  }
}

async function retryPendingUploads() {
  if (!navigator.onLine || retrying.value) return
  retrying.value = true
  try {
    for (const pending of [...pendingUploads.value]) {
      const file = new File([pending.blob], pending.fileName, { type: pending.mimeType })
      await uploadFile(file, pending.id)
    }
  } finally {
    retrying.value = false
  }
}

async function discardPending(id: string) {
  await removePendingUpload(id)
  await loadPending()
}

function formatPendingSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-3">
  <div
    class="relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
    :class="[
      dragOver ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/50',
      uploading ? 'opacity-50 pointer-events-none' : ''
    ]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="allowDocuments ? 'image/jpeg,image/png,image/webp,image/gif,application/pdf' : 'image/jpeg,image/png,image/webp,image/gif'"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Preview -->
    <div v-if="preview" class="mb-3">
      <img :src="preview" class="max-h-32 mx-auto rounded-lg object-contain" />
    </div>

    <!-- Uploading -->
    <div v-if="uploading" class="flex items-center justify-center gap-2">
      <ULoader size="sm" />
      <span class="text-sm text-muted">Subiendo...</span>
    </div>

    <!-- Idle -->
    <div v-else>
      <UIcon name="i-lucide-upload" class="size-8 mx-auto mb-2 text-muted" />
      <p class="text-sm font-medium">Arrastrá {{ allowDocuments ? 'una imagen o PDF' : 'una imagen' }} o hacé click</p>
      <p class="text-xs text-muted mt-1">{{ allowDocuments ? 'Imágenes hasta 5 MB · PDF hasta 10 MB' : 'Imágenes hasta 5 MB' }}</p>
    </div>
  </div>
  <div v-if="pendingUploads.length" class="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium">{{ pendingUploads.length }} archivo(s) pendiente(s) de subir</p>
        <p class="text-xs text-muted">Están guardados únicamente en este dispositivo.</p>
      </div>
      <UButton label="Subir pendientes" icon="i-lucide-cloud-upload" size="xs" :loading="retrying" :disabled="!online" @click="retryPendingUploads" />
    </div>
    <div v-for="pending in pendingUploads" :key="pending.id" class="flex items-center gap-2 rounded-md bg-default p-2 text-xs">
      <UIcon :name="pending.mimeType.startsWith('image/') ? 'i-lucide-image' : 'i-lucide-file-text'" class="size-4" />
      <span class="min-w-0 flex-1 truncate">{{ pending.fileName }}</span>
      <span class="text-muted">{{ formatPendingSize(pending.size) }}</span>
      <UButton icon="i-lucide-x" size="xs" color="error" variant="ghost" aria-label="Descartar archivo pendiente" @click="discardPending(pending.id)" />
    </div>
  </div>
  </div>
</template>
