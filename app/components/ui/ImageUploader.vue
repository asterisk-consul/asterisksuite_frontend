<script setup lang="ts">
interface Props {
  entityType: string
  entityId: string
  photoType?: string
  maxFiles?: number
  maxSizeMb?: number
}

const props = withDefaults(defineProps<Props>(), {
  photoType: 'default',
  maxFiles: 5,
  maxSizeMb: 5,
})

const emit = defineEmits<{
  uploaded: [file: any]
  error: [message: string]
}>()

const uploading = ref(false)
const dragOver = ref(false)
const preview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement>()

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

function processFile(file: File) {
  if (!file.type.startsWith('image/')) {
    emit('error', 'Solo se permiten archivos de imagen')
    return
  }

  if (file.size > maxSizeBytes.value) {
    emit('error', `El archivo excede ${props.maxSizeMb}MB`)
    return
  }

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    preview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  uploadFile(file)
}

async function uploadFile(file: File) {
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
    preview.value = null
  } catch (e: any) {
    emit('error', e?.data?.message || 'Error al subir imagen')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
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
      accept="image/jpeg,image/png,image/webp,image/gif"
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
      <p class="text-sm font-medium">Arrastrá una imagen o hacé click</p>
      <p class="text-xs text-muted mt-1">JPEG, PNG, WebP, GIF — Max {{ maxSizeMb }}MB</p>
    </div>
  </div>
</template>
