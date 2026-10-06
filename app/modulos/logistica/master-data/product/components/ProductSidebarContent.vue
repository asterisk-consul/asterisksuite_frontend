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
        url: p.medium_url || p.url || `/api/media/files/${fileId}/medium`,
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

function setUploadVisible(value: boolean) {
  showUpload.value = value
}

function setAddingCategory(value: boolean) {
  addingCategory.value = value
}

function setAddingTag(value: boolean) {
  addingTag.value = value
}

const currentPhoto = computed(() => photos.value[currentIndex.value] || null)
</script>

<template>
  <UCard class="overflow-hidden">
    <div class="grid gap-6 lg:grid-cols-[minmax(220px,280px)_1fr]">
      <section v-if="product?.id" class="space-y-3">
        <div
          v-if="!hasImages && !showUpload"
          class="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50"
          :class="dragOver ? 'border-primary bg-primary/5' : 'border-default bg-muted/20'"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="onDrop"
          @click="fileInput?.click()"
        >
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
          <UIcon name="i-lucide-image-plus" class="mb-3 size-10 text-muted" />
          <p class="text-sm font-medium">Arrastrá una imagen del producto</p>
          <p class="mt-1 text-xs text-muted">JPEG, PNG, WebP o GIF · Máx. 5 MB</p>
        </div>

        <div v-if="uploading" class="flex items-center justify-center gap-2 py-4 text-sm text-muted">
          <div class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Subiendo imagen…
        </div>

        <div v-if="hasImages" class="space-y-2">
          <div class="group/image relative aspect-square overflow-hidden rounded-xl border border-default bg-muted/30">
            <img v-if="currentPhoto" :src="currentPhoto.url || currentPhoto.thumb_url" :alt="currentPhoto.file_name" class="size-full object-contain" />
            <template v-if="photos.length > 1">
              <UButton class="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/image:opacity-100" icon="i-lucide-chevron-left" color="neutral" variant="solid" size="xs" square @click="prevImage" />
              <UButton class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/image:opacity-100" icon="i-lucide-chevron-right" color="neutral" variant="solid" size="xs" square @click="nextImage" />
              <UBadge class="absolute bottom-2 left-1/2 -translate-x-1/2" color="neutral" variant="solid" :label="`${currentIndex + 1} / ${photos.length}`" />
            </template>
            <UButton v-if="currentPhoto" class="absolute right-2 top-2 opacity-0 group-hover/image:opacity-100" icon="i-lucide-trash-2" color="error" variant="solid" size="xs" square @click="deletePhoto(currentPhoto.id)" />
          </div>

          <div v-if="photos.length > 1" class="flex gap-1.5 overflow-x-auto pb-1">
            <button v-for="(photo, index) in photos" :key="photo.id" class="size-12 shrink-0 overflow-hidden rounded-md border-2" :class="index === currentIndex ? 'border-primary' : 'border-default opacity-60'" @click="currentIndex = index">
              <img :src="photo.thumb_url || photo.url" class="size-full object-cover" />
            </button>
          </div>

          <UButton v-if="photos.length < 5 && !showUpload" label="Agregar imagen" icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" @click="setUploadVisible(true)" />
        </div>

        <div v-if="showUpload" class="space-y-2">
          <div class="cursor-pointer rounded-lg border-2 border-dashed border-default p-4 text-center hover:border-primary/50" @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop="onDrop" @click="fileInput?.click()">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            <p class="text-xs text-muted">Arrastrá una imagen o hacé clic para elegirla</p>
          </div>
          <UButton label="Cancelar" size="xs" variant="ghost" color="neutral" @click="setUploadVisible(false)" />
        </div>
      </section>

      <div v-else class="flex min-h-56 items-center justify-center rounded-xl border border-default bg-elevated">
        <UIcon name="i-lucide-package" class="size-12 text-muted" />
      </div>

      <section class="min-w-0 space-y-6">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-muted">Producto</p>
          <h2 class="mt-1 truncate text-xl font-semibold text-highlighted">{{ product?.name || 'Producto sin guardar' }}</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <UBadge color="neutral" variant="subtle" icon="i-lucide-barcode" :label="product?.sku ? `SKU ${product.sku}` : 'Sin SKU'" />
            <UBadge color="primary" variant="subtle" :label="PRODUCT_TYPE_LABELS[(product as any)?.product_type as ProductType] || 'Sin tipo'" />
          </div>
        </div>

        <USeparator />

        <div class="grid gap-6 xl:grid-cols-2">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Categorías</p>
                <p class="text-xs text-muted">Organizan y facilitan la búsqueda del producto.</p>
              </div>
              <UButton v-if="product?.id && !addingCategory" size="xs" variant="ghost" icon="i-lucide-plus" label="Agregar" @click="setAddingCategory(true)" />
            </div>
            <div v-if="product?.product_categories?.length" class="flex flex-wrap gap-1.5">
              <UBadge v-for="cat in product.product_categories" :key="cat.category_id" :label="cat.categories?.name" size="sm" variant="subtle" color="neutral">
                <template #trailing><button class="ml-1 opacity-50 hover:opacity-100" @click="handleRemoveCategory(cat.category_id, product!.id, cat.categories?.name)">×</button></template>
              </UBadge>
            </div>
            <p v-else class="text-sm text-muted">Sin categorías asignadas.</p>
            <ProductCategorySelect v-if="addingCategory" class="mt-3" :product-id="product?.id" :product-categories="product?.product_categories ?? []" @selected="selectCategory" @cancel="addingCategory = false" />
          </div>

          <div>
            <div class="mb-3 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">Etiquetas</p>
                <p class="text-xs text-muted">Añaden referencias rápidas para identificarlo.</p>
              </div>
              <UButton v-if="product?.id && !addingTag" size="xs" variant="ghost" icon="i-lucide-plus" label="Agregar" @click="setAddingTag(true)" />
            </div>
            <div v-if="product?.product_tags?.length" class="flex flex-wrap gap-1.5">
              <UBadge v-for="tag in product.product_tags" :key="tag.tag_id" :label="tag.tags?.name" size="sm" variant="subtle">
                <template #trailing><button class="ml-1 opacity-50 hover:opacity-100" @click="handleRemoveTag(tag.tag_id, product!.id, tag.tags?.name)">×</button></template>
              </UBadge>
            </div>
            <p v-else class="text-sm text-muted">Sin etiquetas asignadas.</p>
            <ProductTagsSelect v-if="addingTag" class="mt-3" :product-id="product?.id" :tags="product?.product_tags ?? []" @selected="selectTag" @cancel="addingTag = false" />
          </div>
        </div>
      </section>
    </div>
  </UCard>
</template>