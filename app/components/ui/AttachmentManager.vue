<script setup lang="ts">
const props = withDefaults(defineProps<{
  entityType: string
  entityId: string
  readonly?: boolean
  allowUpload?: boolean
  maxFiles?: number
  defaultExpanded?: boolean
}>(), { readonly: false, allowUpload: true, maxFiles: 10, defaultExpanded: false })

const gallery = ref<any>()
const expanded = ref(props.defaultExpanded)
const toast = useToast()
const emit = defineEmits<{ uploaded: [file: any] }>()

const onUploaded = async (file: any) => {
  await gallery.value?.loadPhotos()
  toast.add({ title: 'Archivo adjuntado', color: 'success' })
  emit('uploaded', file)
}

const onError = (message: string) => toast.add({ title: 'No se pudo adjuntar', description: message, color: 'error' })
</script>

<template>
  <UCard :ui="{ body: expanded ? '' : 'hidden' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-files" class="size-5" /></div>
        <div class="min-w-0 flex-1">
          <p class="font-medium">Archivo del comprobante</p>
          <p class="truncate text-sm text-muted">Fotos hasta 5 MB o PDF hasta 10 MB.</p>
        </div>
        <UButton
          :label="expanded ? 'Contraer' : 'Ver o adjuntar'"
          :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-paperclip'"
          color="neutral"
          variant="soft"
          size="sm"
          @click="expanded = !expanded"
        />
      </div>
    </template>
    <div class="space-y-4">
      <UiImageUploader
        v-if="allowUpload"
        :entity-type="entityType"
        :entity-id="entityId"
        :max-files="maxFiles"
        :max-size-mb="5"
        allow-documents
        @uploaded="onUploaded"
        @error="onError"
      />
      <UiImageGallery ref="gallery" :entity-type="entityType" :entity-id="entityId" :max-files="maxFiles" :readonly="readonly" />
    </div>
  </UCard>
</template>
