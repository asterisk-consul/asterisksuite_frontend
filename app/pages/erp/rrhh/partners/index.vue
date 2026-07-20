<script setup lang="ts">
definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const partners = ref<any[]>([])
const loading = ref(false)

async function loadPartners() {
  loading.value = true
  try {
    partners.value = await $fetch('/api/erp/partners')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPartners())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const columns = [
  { id: 'name', header: 'Nombre' },
  { id: 'document', header: 'Documento' },
  { id: 'share', header: '% Participación' },
  { id: 'capital', header: 'Capital' },
  { id: 'status', header: 'Estado' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Socios" description="Gestión de socios y participaciones" />

    <UPageCard variant="subtle">
      <UTable :data="partners" :columns="columns" :loading="loading">
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.first_name }} {{ row.original.last_name }}</span>
        </template>

        <template #document-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.document_type }}-{{ row.original.document_number }}</span>
        </template>

        <template #share-cell="{ row }">
          {{ row.original.share_percentage ? `${row.original.share_percentage}%` : '-' }}
        </template>

        <template #capital-cell="{ row }">
          {{ row.original.capital_contributed ? fmt(Number(row.original.capital_contributed)) : '-' }}
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.is_active ? 'Activo' : 'Inactivo'"
            :color="row.original.is_active ? 'success' : 'error'"
            variant="subtle"
          />
        </template>
      </UTable>
    </UPageCard>
  </UPage>
</template>
