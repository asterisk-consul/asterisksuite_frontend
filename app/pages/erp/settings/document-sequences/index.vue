<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCompanyRole } from '~/composables/useCompanyRole'
import { useDocumentsTypesStore } from '~/modulos/erp/documents/documents-types/store/documents-types.store'

const { isOwnerOrAdmin } = useCompanyRole()
const toast = useToast()
const router = useRouter()
const documentsTypesStore = useDocumentsTypesStore()

if (!isOwnerOrAdmin.value) {
  router.push('/erp/treasury/dashboard')
}

const loading = ref(true)
const saving = ref(false)
const modalOpen = ref(false)
const editingSequence = ref<any>(null)
const deleteModalOpen = ref(false)
const deletingSequence = ref<any>(null)

const form = reactive({
  name: '',
  point_of_sale: '0001',
  prefix: '',
  range_start: 1,
  range_end: 999999,
  automatic: true,
  document_type_ids: [] as string[]
})

const sequences = ref<any[]>([])

const documentTypeOptions = computed(() => {
  return (documentsTypesStore.items ?? [])
    .filter(dt => dt.active)
    .map(dt => ({
      label: `${dt.code} - ${dt.description}`,
      value: dt.id
    }))
})

const fetchSequences = async () => {
  loading.value = true
  try {
    sequences.value = await $fetch<any[]>('/api/erp/document-sequences')
  } catch (e: any) {
    toast.add({ title: 'Error al cargar secuencias', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchSequences(),
    documentsTypesStore.fetchAll()
  ])
})

const openCreate = () => {
  editingSequence.value = null
  Object.assign(form, {
    name: '',
    point_of_sale: '0001',
    prefix: '',
    range_start: 1,
    range_end: 999999,
    automatic: true,
    document_type_ids: []
  })
  modalOpen.value = true
}

const openEdit = (seq: any) => {
  editingSequence.value = seq
  const linkedTypes = (seq.document_type_sequences ?? [])
    .map((link: any) => link.document_types)
    .filter(Boolean)
    .map((dt: any) => ({
      label: `${dt.code} - ${dt.description}`,
      value: dt.id
    }))
  Object.assign(form, {
    name: seq.name,
    point_of_sale: seq.point_of_sale,
    prefix: seq.prefix || '',
    range_start: seq.range_start || 1,
    range_end: seq.range_end || 999999,
    automatic: seq.automatic,
    document_type_ids: linkedTypes
  })
  modalOpen.value = true
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload = {
      ...form,
      document_type_ids: form.document_type_ids.map((item: any) => typeof item === 'string' ? item : item.value)
    }
    if (editingSequence.value) {
      await $fetch(`/api/erp/document-sequences/${editingSequence.value.id}`, {
        method: 'PATCH',
        body: payload
      })
      toast.add({ title: 'Secuencia actualizada', color: 'success' })
    } else {
      await $fetch('/api/erp/document-sequences', {
        method: 'POST',
        body: form
      })
      toast.add({ title: 'Secuencia creada', color: 'success' })
    }
    modalOpen.value = false
    await fetchSequences()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (seq: any) => {
  deletingSequence.value = seq
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingSequence.value) return
  try {
    await $fetch(`/api/erp/document-sequences/${deletingSequence.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Secuencia eliminada', color: 'success' })
    deleteModalOpen.value = false
    await fetchSequences()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

function getLinkedDocTypes(seq: any) {
  return (seq.document_type_sequences ?? []).map((link: any) => link.document_types).filter(Boolean)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Secuencias de Numeración"
      description="Configurar numeración de comprobantes por punto de venta"
    >
      <template #links>
        <UButton label="Nueva secuencia" icon="i-lucide-plus" color="primary" variant="solid" @click="openCreate" />
      </template>
    </AppPageHeader>

    <div v-if="loading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <div v-else-if="sequences.length === 0" class="text-center py-12 text-muted">
      <UIcon name="i-lucide-hash" class="size-12 mx-auto mb-3 opacity-30" />
      <p>No hay secuencias configuradas</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="seq in sequences"
        :key="seq.id"
        class="p-5 rounded-xl border border-default bg-default hover:border-primary/50 transition-colors"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="text-sm font-semibold">{{ seq.name }}</p>
            <p class="text-xs text-muted">PV: {{ seq.point_of_sale }} | Prefijo: {{ seq.prefix || '—' }}</p>
          </div>
          <UBadge
            :label="seq.automatic ? 'Automática' : 'Manual'"
            :color="seq.automatic ? 'success' : 'neutral'"
            variant="soft"
            size="xs"
          />
        </div>

        <div class="grid grid-cols-3 gap-3 mb-3">
          <div class="text-center p-2 rounded bg-muted/30">
            <p class="text-xs text-muted">Inicio</p>
            <p class="text-sm font-semibold">{{ seq.range_start || '—' }}</p>
          </div>
          <div class="text-center p-2 rounded bg-muted/30">
            <p class="text-xs text-muted">Actual</p>
            <p class="text-sm font-bold text-primary">{{ seq.current_number }}</p>
          </div>
          <div class="text-center p-2 rounded bg-muted/30">
            <p class="text-xs text-muted">Fin</p>
            <p class="text-sm font-semibold">{{ seq.range_end || '—' }}</p>
          </div>
        </div>

        <div v-if="getLinkedDocTypes(seq).length" class="mb-3">
          <p class="text-xs text-muted mb-1">Tipos asociados:</p>
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="dt in getLinkedDocTypes(seq)"
              :key="dt.id"
              :label="dt.code"
              color="primary"
              variant="soft"
              size="xs"
            />
          </div>
        </div>

        <div class="flex items-center gap-1 pt-2 border-t border-default">
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click="openEdit(seq)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="confirmDelete(seq)" />
        </div>
      </div>
    </div>

    <!-- CREATE/EDIT MODAL -->
    <UModal
      v-model:open="modalOpen"
      :title="editingSequence ? 'Editar secuencia' : 'Nueva secuencia'"
      :ui="{ width: 'max-w-lg' }"
    >
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleSubmit">
          <UFormField label="Nombre" name="name" required>
            <UInput v-model="form.name" placeholder="Ej: Factura A - Punto 1" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Punto de venta" name="point_of_sale" required>
              <UInput v-model="form.point_of_sale" placeholder="0001" />
            </UFormField>
            <UFormField label="Prefijo" name="prefix">
              <UInput v-model="form.prefix" placeholder="A, B, C..." />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Rango inicio" name="range_start">
              <UInput v-model.number="form.range_start" type="number" />
            </UFormField>
            <UFormField label="Rango fin" name="range_end">
              <UInput v-model.number="form.range_end" type="number" />
            </UFormField>
          </div>
          <UCheckbox v-model="form.automatic" label="Numeración automática" />
          <UFormField label="Tipos de documento asociados" name="document_type_ids">
            <USelectMenu
              v-model="form.document_type_ids"
              :items="documentTypeOptions"
              placeholder="Seleccionar tipos de documento"
              multiple
              searchable
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton label="Guardar" type="submit" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar secuencia">
      <template #body>
        <p>
          ¿Estás seguro de que deseas eliminar la secuencia
          <strong>{{ deletingSequence?.name }}</strong>
          ?
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" :loading="saving" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
