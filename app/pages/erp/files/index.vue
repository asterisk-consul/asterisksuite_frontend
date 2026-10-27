<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

import { h, resolveComponent } from 'vue'
import { UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { createTableBuilder } from '~/composables/table/createColumns'
import { useServerTable } from '~/composables/table/useServerTable'

interface FileAssociation {
  entity_type: string
  entity_id: string
  label: string
  url?: string | null
}

interface LibraryFile {
  id: string
  file_name: string
  mime_type: string
  file_size: number
  created_at: string
  uploaded_by_name: string
  associations: FileAssociation[]
}

const files = ref<LibraryFile[]>([])
const totalRows = ref(0)
const loading = ref(false)
const loadError = ref('')
const toast = useToast()
const NuxtLink = resolveComponent('NuxtLink')
let latestRequestId = 0

async function loadFiles(query: { page: number; pageSize: number; search?: string; sort?: string; order?: 'asc' | 'desc' }) {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<{ items: LibraryFile[]; total: number }>('/api/media/library', { query })
    if (requestId !== latestRequestId) return
    files.value = response.items
    totalRows.value = response.total
  } catch (error: any) {
    if (requestId !== latestRequestId) return
    files.value = []
    totalRows.value = 0
    loadError.value = error?.data?.message || 'No se pudieron cargar los archivos. Intentá nuevamente.'
    toast.add({ title: 'Error al cargar archivos', description: loadError.value, color: 'error' })
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const serverTable = useServerTable(loadFiles)
const { page, pageSize, search, sorting, filters } = serverTable

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

function formatFileSize(value: number) {
  if (!value) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const build = createTableBuilder<LibraryFile>({ locale: 'es-AR', onSortFieldSelect })
const columns = computed<TableColumn<LibraryFile>[]>(() => build([
  {
    key: 'file_name', label: 'Archivo', sortable: true,
    meta: { label: 'Archivo', filter: false },
    cell: ({ row }) => h('div', { class: 'min-w-40' }, [
      h('p', { class: 'truncate font-medium text-highlighted', title: row.original.file_name }, row.original.file_name),
      h('p', { class: 'text-xs text-muted' }, row.original.mime_type),
    ]),
  },
  {
    key: 'associations', label: 'Asociado a',
    cell: ({ row }) => {
      const associations = row.original.associations
      if (!associations.length) return 'Sin asociación registrada'
      return h('div', { class: 'flex min-w-48 flex-col gap-1' }, associations.map((association) =>
        association.url
          ? h(NuxtLink, { to: association.url, class: 'truncate text-primary hover:underline', title: association.label }, () => association.label)
          : h('span', { class: 'truncate text-muted', title: `${association.label} · ${association.entity_id}` }, association.label),
      ))
    },
  },
  { key: 'uploaded_by_name', label: 'Subido por' },
  { key: 'created_at', label: 'Fecha de carga', sortable: true, date: true },
  { key: 'file_size', label: 'Tamaño', sortable: true, cell: ({ row }) => formatFileSize(row.original.file_size) },
  {
    id: 'actions', label: 'Acciones',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1' }, [
      h(UButton, {
        label: 'Ver', icon: 'i-lucide-eye', size: 'xs', variant: 'soft',
        to: `/api/media/files/${row.original.id}/view`, target: '_blank', external: true,
      }),
      h(UButton, {
        label: 'Descargar', icon: 'i-lucide-download', size: 'xs', color: 'neutral', variant: 'ghost',
        to: `/api/media/files/${row.original.id}/download`, target: '_blank', external: true,
      }),
    ]),
  },
]))

const sortFields = [
  { label: 'Fecha de carga', value: 'created_at' },
  { label: 'Nombre', value: 'file_name' },
  { label: 'Tamaño', value: 'file_size' },
]

const emptyMessage = computed(() => search.value.trim()
  ? 'No encontramos archivos con esa búsqueda.'
  : 'Todavía no hay archivos adjuntos para esta empresa.')
const fileCountLabel = computed(() => `${totalRows.value.toLocaleString('es-AR')} ${totalRows.value === 1 ? 'archivo' : 'archivos'}`)

</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <AppPageHeader
      title="Archivos adjuntos"
      description="Buscá archivos de esta empresa y abrí el documento o movimiento al que están vinculados."
    />

    <UPageCard variant="subtle" class="min-w-0 overflow-hidden">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">Biblioteca de archivos</h2>
          <p class="text-sm text-muted">Los archivos y sus asociaciones respetan la empresa seleccionada.</p>
        </div>
        <UBadge :label="fileCountLabel" color="neutral" variant="subtle" />
      </div>

      <UAlert v-if="loadError" color="error" variant="subtle" :description="loadError">
        <template #actions>
          <UButton label="Reintentar" icon="i-lucide-refresh-cw" size="xs" color="error" variant="soft" @click="serverTable.refresh()" />
        </template>
      </UAlert>

      <div v-else-if="!loading && !files.length" class="rounded-lg border border-dashed border-default px-4 py-12 text-center text-sm text-muted">
        <UIcon name="i-lucide-folder-open" class="mx-auto mb-2 size-8" />
        <p>{{ emptyMessage }}</p>
      </div>

      <AsteriskTable
        v-else
        v-model:page="page"
        v-model:search="search"
        v-model:filters="filters"
        v-model:sorting="sorting"
        :data="files"
        :columns="columns"
        :loading="loading"
        :total-rows="totalRows"
        :page-size="pageSize"
        :sort-fields="sortFields"
        search-placeholder="Buscar por nombre de archivo..."
        storage-key="company-files-library"
        server-side
        compact
      />
    </UPageCard>
  </div>
</template>
