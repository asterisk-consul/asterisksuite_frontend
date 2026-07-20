<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { ButtonProps } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import { checkColumns } from '~/modulos/erp/checks/columns'
import type { Check } from '~/modulos/erp/checks/types/checks.types'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const router = useRouter()

const {
  checks,
  loading,
  init,
  remove,
  clear,
  bounce,
  confirm,
  reject
} = useChecks()

const sorting = ref<SortingState>([])
const deleteModalOpen = ref(false)
const deletingCheck = ref<Check | null>(null)

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

const goToCreate = () => {
  router.push('/erp/treasury/checks/create')
}

const goToEdit = (row: Check) => {
  router.push(`/erp/treasury/checks/${row.id}/edit`)
}

const confirmDelete = (check: Check) => {
  deletingCheck.value = check
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingCheck.value) return
  await remove(deletingCheck.value.id)
  deleteModalOpen.value = false
}

onMounted(() => init())

const columns = checkColumns({
  onDetail: goToEdit,
  onEdit: goToEdit,
  onDelete: confirmDelete,
  onSortFieldSelect,
  onStatusChange: async (row, newStatus) => {
    const prev = row.status
    try {
      row.status = newStatus
      if (newStatus === 'CONFIRMED') {
        await confirm(row.id)
      } else if (newStatus === 'CLEARED') {
        await clear(row.id)
      } else if (newStatus === 'BOUNCED') {
        await bounce(row.id)
      } else if (newStatus === 'CANCELLED') {
        await reject(row.id)
      }
    } catch (e: any) {
      row.status = prev
      console.error('Error changing check status:', e)
    }
  }
})

const links: ButtonProps[] = [
  {
    label: 'Nuevo cheque',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: goToCreate
  }
]

const filterFields: FilterField[] = [
  { id: 'check_number', label: 'Filtrar por N° cheque...', class: 'w-40' },
  { id: 'bank_name', label: 'Filtrar por banco...', class: 'w-40' },
  { id: 'issuer_name', label: 'Filtrar por emisor...', class: 'w-40' },
  { id: 'party_name', label: 'Filtrar por cliente/proveedor...', class: 'w-48' }
]

const sortFields: SortField[] = [
  { label: 'N° Cheque', value: 'check_number' },
  { label: 'Banco', value: 'bank_name' },
  { label: 'Emisor', value: 'issuer_name' },
  { label: 'Monto', value: 'amount' },
  { label: 'Emisión', value: 'issue_date' },
  { label: 'Vencimiento', value: 'due_date' },
  { label: 'Estado', value: 'status' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Cheques"
      description="Gestión de cheques propios y de terceros"
      :links="links"
    />

    <LogisticaTable
      :loading="loading"
      :data="checks"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar cheque">
      <template #body>
        <p>¿Estás seguro de que deseas eliminar el cheque N° <strong>{{ deletingCheck?.check_number }}</strong>?</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
