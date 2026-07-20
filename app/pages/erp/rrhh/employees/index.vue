<script setup lang="ts">
definePageMeta({
  layout: 'rrhh',
  middleware: ['auth']
})

const employees = ref<any[]>([])
const loading = ref(false)

async function loadEmployees() {
  loading.value = true
  try {
    employees.value = await $fetch('/api/erp/employees')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadEmployees())

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const columns = [
  { id: 'name', header: 'Nombre' },
  { id: 'document', header: 'Documento' },
  { id: 'position', header: 'Cargo' },
  { id: 'department', header: 'Departamento' },
  { id: 'salary', header: 'Sueldo' },
  { id: 'status', header: 'Estado' },
]
</script>

<template>
  <UPage>
    <AppPageHeader title="Empleados" description="Gestión de empleados y sueldos" />

    <UPageCard variant="subtle">
      <UTable :data="employees" :columns="columns" :loading="loading">
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.first_name }} {{ row.original.last_name }}</span>
        </template>

        <template #document-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.document_type }}-{{ row.original.document_number }}</span>
        </template>

        <template #position-cell="{ row }">
          {{ row.original.position ?? '-' }}
        </template>

        <template #department-cell="{ row }">
          {{ row.original.department ?? '-' }}
        </template>

        <template #salary-cell="{ row }">
          {{ row.original.salary ? fmt(Number(row.original.salary)) : '-' }}
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
