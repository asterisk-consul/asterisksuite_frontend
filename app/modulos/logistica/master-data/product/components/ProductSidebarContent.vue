<script setup lang="ts">
import type { Product, ProductType } from '~/modulos/logistica/master-data/product/types/product.types'
import ProductTagsSelect from '~/modulos/logistica/master-data/product-tags/components/ProductTagSelect.vue'
import ProductCategorySelect from '~/modulos/logistica/master-data/product-categories/components/ProductCategorySelect.vue'
import { PRODUCT_TYPE_LABELS } from '~/modulos/logistica/master-data/product/composable/product-labels'

import { useProductTagsStore } from '~/modulos/logistica/master-data/product-tags/store/product-tags.store'
import { useProductCategoriesStore } from '~/modulos/logistica/master-data/product-categories/store/product-categories.store'

const toast = useToast()
const productTagsStore = useProductTagsStore()
const productCategoriesStore = useProductCategoriesStore()
const addingTag = ref(false)
const addingCategory = ref(false)
const uploading = ref(false)
const photos = ref<any[]>([])
const showUpload = ref(false)
const fileInput = ref<HTMLInputElement>()
const dragOver = ref(false)
const currentIndex = ref(0)

const props = defineProps<{
  product: Product | null
}>()

async function loadPhotos() {
  if (!props.product?.id) return
  try {
    const url = `/api/media/photos/product/${props.product.id}`
    console.log('[GALLERY] Fetching photos from:', url)
    const data = await $fetch<any[]>(url)

    // Filtrar eliminados en frontend
    const active = data.filter((p: any) => !p.deleted_at)

    photos.value = active.map((p: any) => {
      const fileId = p.file_id || p.files?.id
      return {
        id: p.id,
        photo_type: p.photo_type,
        file_id: fileId,
        url: p.url || `/uploads/products/${fileId}_full.webp`,
        thumb_url: p.thumb_url || `/uploads/products/${fileId}_thumb.webp`,
        medium_url: p.medium_url || `/uploads/products/${fileId}_medium.webp`,
        file_name: p.file_name || p.files?.file_name,
        file_size: p.file_size || p.files?.file_size,
      }
    })

    if (currentIndex.value >= photos.value.length) {
      currentIndex.value = Math.max(0, photos.value.length - 1)
    }

    console.log('[GALLERY] Photos loaded:', photos.value.length)
  } catch (e) {
    console.error('[GALLERY] Error loading photos:', e)
  }
}

onMounted(() => loadPhotos())

watch(() => props.product?.id, (id) => {
  if (id) loadPhotos()
})

const hasImages = computed(() => photos.value.length > 0)

const selectCategory = () => {
  toast.add({
    title: 'Categorías modificadas',
    description: 'Se actualizaron las categorías del producto.',
    color: 'success'
  })
  addingCategory.value = false
}

const selectTag = () => {
  toast.add({
    title: 'Etiquetas modificadas',
    description: 'Se actualizaron las etiquetas del producto.',
    color: 'success'
  })
  addingTag.value = false
}

const handleRemoveCategory = (categoryId: string, productId: string, categoryName?: string) => {
  try {
    productCategoriesStore.remove(productId, categoryId)
    toast.add({ title: 'Categoría eliminada', description: `"${categoryName}" fue removida.`, color: 'success' })
  } catch {
    toast.add({ title: 'Error', description: `No se pudo eliminar "${categoryName}".`, color: 'error' })
  }
}

const handleRemoveTag = async (tagId: string, productId: string, tagName?: string) => {
  try {
    productTagsStore.remove(productId, tagId)
    toast.add({ title: 'Etiqueta eliminada', description: `"${tagName}" fue removida.`, color: 'success' })
  } catch {
    toast.add({ title: 'Error', description: `No se pudo eliminar "${tagName}".`, color: 'error' })
  }
}

async function handleUpload(file: File) {
  if (!props.product?.id) return

  console.log('[UPLOAD] File:', file.name, file.size, file.type)

  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'Archivo muy grande', description: 'Máximo 5MB', color: 'error' })
    return
  }

  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Tipo no permitido', description: 'Solo imágenes', color: 'error' })
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'product')
    formData.append('entity_id', props.product.id)
    formData.append('photo_type', 'frontal')

    console.log('[UPLOAD] Posting to /api/media/upload...')
    const result = await $fetch<any>('/api/media/upload', { method: 'POST', body: formData })
    console.log('[UPLOAD] Result:', JSON.stringify(result))

    toast.add({ title: 'Imagen subida', color: 'success' })
    await loadPhotos()
    showUpload.value = false
  } catch (e: any) {
    console.error('[UPLOAD] Error:', e)
    toast.add({ title: 'Error al subir', description: e?.data?.message || 'Error', color: 'error' })
  } finally {
    uploading.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleUpload(file)
  if (input) input.value = ''
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) handleUpload(file)
}

async function deletePhoto(photoId: string) {
  console.log('[DELETE] photoId:', photoId)
  console.log('[DELETE] photos before:', photos.value.map(p => p.id))
  try {
    const result = await $fetch(`/api/media/photos/${photoId}`, { method: 'DELETE' })
    console.log('[DELETE] result:', result)
    photos.value = photos.value.filter((p) => p.id !== photoId)
    console.log('[DELETE] photos after:', photos.value.map(p => p.id))
    if (currentIndex.value >= photos.value.length) {
      currentIndex.value = Math.max(0, photos.value.length - 1)
    }
    toast.add({ title: 'Imagen eliminada', color: 'success' })
  } catch (e: any) {
    console.error('[DELETE] Error:', e?.data || e?.message || e)
    toast.add({ title: 'Error al eliminar', description: e?.data?.message || 'Error', color: 'error' })
  }
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function prevImage() {
  currentIndex.value = currentIndex.value > 0 ? currentIndex.value - 1 : photos.value.length - 1
}

function nextImage() {
  currentIndex.value = currentIndex.value < photos.value.length - 1 ? currentIndex.value + 1 : 0
}

const currentPhoto = computed(() => photos.value[currentIndex.value] || null)
</script>

<template>
  <div class="space-y-5 w-full">
    <!-- GALERÍA + UPLOAD -->
    <div v-if="product?.id" class="space-y-3">
      <!-- Sin imágenes: dropzone grande -->
      <div
        v-if="!hasImages && !showUpload"
        class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50"
        :class="dragOver ? 'border-primary bg-primary/5' : 'border-default'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop="onDrop"
        @click="fileInput?.click()"
      >
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
        <UIcon name="i-lucide-image-plus" class="size-10 mx-auto mb-2 text-muted" />
        <p class="text-sm font-medium">Arrastrá una imagen del producto</p>
        <p class="text-xs text-muted mt-1">JPEG, PNG, WebP o GIF — Máx. 5MB</p>
      </div>

      <!-- Subiendo -->
      <div v-if="uploading" class="flex items-center justify-center gap-2 py-4">
        <div class="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span class="text-xs text-muted">Subiendo...</span>
      </div>

      <!-- Con imágenes: carrusel + controles -->
      <div v-if="hasImages" class="space-y-2">
        <!-- Imagen grande + controles -->
        <div class="relative aspect-square rounded-xl overflow-hidden border border-default bg-muted/30 group/image">
          <img
            v-if="currentPhoto"
            :src="currentPhoto.url || currentPhoto.thumb_url"
            :alt="currentPhoto.file_name"
            class="w-full h-full object-contain"
          />

          <!-- Controles: solo al hacer hover -->
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none">
            <!-- Navegación (solo si hay más de 1) -->
            <template v-if="photos.length > 1">
              <button
                class="absolute left-1.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors pointer-events-auto"
                @click="prevImage"
              >
                <UIcon name="i-lucide-chevron-left" class="size-4" />
              </button>
              <button
                class="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors pointer-events-auto"
                @click="nextImage"
              >
                <UIcon name="i-lucide-chevron-right" class="size-4" />
              </button>

              <!-- Contador -->
              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs">
                {{ currentIndex + 1 }} / {{ photos.length }}
              </div>
            </template>

            <!-- Botón eliminar -->
            <button
              v-if="currentPhoto"
              class="absolute top-2 right-2 size-7 rounded-full bg-error/80 text-white flex items-center justify-center hover:bg-error transition-colors pointer-events-auto"
              @click="deletePhoto(currentPhoto.id)"
            >
              <UIcon name="i-lucide-trash-2" class="size-3.5" />
            </button>
          </div>
        </div>

        <!-- Thumbnails -->
        <div v-if="photos.length > 1" class="flex gap-1.5 overflow-x-auto">
          <button
            v-for="(photo, index) in photos"
            :key="photo.id"
            class="size-12 rounded-md overflow-hidden border-2 shrink-0 transition-colors"
            :class="index === currentIndex ? 'border-primary' : 'border-default opacity-60 hover:opacity-100'"
            @click="currentIndex = index"
          >
            <img :src="photo.thumb_url || photo.url" class="w-full h-full object-cover" />
          </button>
        </div>

        <!-- Botón agregar más -->
        <div v-if="photos.length < 5 && !showUpload">
          <UButton
            label="Agregar imagen"
            icon="i-lucide-plus"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="showUpload = true"
          />
        </div>

        <!-- Upload inline -->
        <div v-if="showUpload" class="mt-1">
          <div
            class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50"
            :class="dragOver ? 'border-primary bg-primary/5' : 'border-default'"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop="onDrop"
            @click="fileInput?.click()"
          >
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            <p class="text-xs text-muted">Arrastrá o hacé click para agregar</p>
          </div>
          <UButton label="Cancelar" size="xs" variant="ghost" class="mt-1" @click="showUpload = false" />
        </div>
      </div>
    </div>

    <!-- Sin producto: placeholder -->
    <div v-else class="aspect-square rounded-xl border border-default overflow-hidden bg-elevated">
      <div class="h-full flex items-center justify-center">
        <UIcon name="i-lucide-package" class="size-12 text-muted" />
      </div>
    </div>

    <!-- Datos -->
    <div class="space-y-3">
      <div>
        <p class="text-xs text-muted">SKU</p>
        <p class="text-sm font-medium">{{ product?.sku }}</p>
      </div>
      <div>
        <p class="text-xs text-muted">Tipo</p>
        <p class="text-sm font-medium">
          {{ PRODUCT_TYPE_LABELS[(product as any)?.product_type as ProductType] }}
        </p>
      </div>
    </div>

    <USeparator />

    <!-- Categorías -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Categorías</span>
        <UButton v-if="!addingCategory" size="xs" variant="ghost" icon="i-lucide-plus" @click="addingCategory = true" />
      </div>
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          class="font-bold rounded-full"
          v-for="cat in product?.product_categories ?? []"
          :key="cat.category_id"
          :label="cat.categories?.name"
          size="sm"
          variant="subtle"
          color="neutral"
        >
          <template #trailing>
            <span
              class="ml-1 cursor-pointer opacity-50 hover:opacity-100 leading-none"
              @click="handleRemoveCategory(cat.category_id, product!.id, cat.categories?.name)"
            >
              ×
            </span>
          </template>
        </UBadge>
      </div>
      <ProductCategorySelect
        v-if="addingCategory"
        :productId="product?.id"
        :productCategories="product?.product_categories ?? []"
        @selected="selectCategory"
        @cancel="addingCategory = false"
      />
    </div>

    <USeparator />

    <!-- Tags -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Etiquetas</span>
        <UButton v-if="!addingTag" size="xs" variant="ghost" icon="i-lucide-plus" @click="addingTag = true" />
      </div>
      <div class="flex flex-wrap gap-1 mb-2">
        <UBadge
          v-for="tag in product?.product_tags ?? []"
          :key="tag.tag_id"
          :label="tag.tags?.name"
          size="sm"
          variant="subtle"
        >
          <template #trailing>
            <span
              class="ml-1 cursor-pointer opacity-50 hover:opacity-100 leading-none"
              @click="handleRemoveTag(tag.tag_id, product!.id, tag.tags?.name)"
            >
              ×
            </span>
          </template>
        </UBadge>
      </div>
      <ProductTagsSelect
        v-if="addingTag"
        :productId="product?.id"
        :tags="product?.product_tags ?? []"
        @selected="selectTag"
        @cancel="addingTag = false"
      />
    </div>
  </div>
</template>
