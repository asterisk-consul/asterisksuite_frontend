<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import type { ButtonProps } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCashBoxTransfers } from '~/modulos/erp/cash-box-transfers/composables/useCashBoxTransfers'
import { cashBoxTransferColumns } from '~/modulos/erp/cash-box-transfers/columns'
import type { CreateCashBoxTransferInput } from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { transfers, loading, init, create, confirm, cancel, remove } = useCashBoxTransfers()

const sorting = ref<SortingState>([])
const modalOpen = ref(false)

const form = reactive<CreateCashBoxTransferInput>({
  source_type: 'cash_box',
  source_id: '',
  dest_type: 'bank_account',
  dest_id: '',
  amount: 0,
  currency_code: 'ARS',
  transfer_type: 'CASH_TO_BANK',
  description: ''
})

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [
    {
      id: columnId,
      desc: current?.id === columnId ? !current.desc : false
    }
  ]
}

const openCreate = () => {
  Object.assign(form, {
    source_type: 'cash_box', source_id: '', dest_type: 'bank_account',
    dest_id: '', amount: 0, currency_code: 'ARS',
    transfer_type: 'CASH_TO_BANK', description: ''
  })
  modalOpen.value = true
}

const handleSubmit = async () => {
  await create({ ...form })
  modalOpen.value = false
}

onMounted(() => init())

const columns = cashBoxTransferColumns({
  onSortFieldSelect
})

const links: ButtonProps[] = [
  {
    label: 'Nueva transferencia',
    icon: 'i-heroicons-plus',
    color: 'primary',
    variant: 'solid',
    onClick: openCreate
  }
]

const filterFields: FilterField[] = [
  { id: 'description', label: 'Filtrar por descripción...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'created_at' },
  { label: 'Tipo', value: 'transfer_type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Estado', value: 'status' }
]

const transferTypes = [
  { label: 'Caja → Caja', value: 'CASH_TO_CASH' },
  { label: 'Caja → Banco', value: 'CASH_TO_BANK' },
  { label: 'Banco → Caja', value: 'BANK_TO_CASH' },
  { label: 'Banco → Banco', value: 'BANK_TO_BANK' }
]
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Transferencias"
      description="Transferencias entre cajas y cuentas bancarias"
      :links="links"
    />

    <LogisticaTable
      :loading="loading"
      :data="transfers"
      :columns="columns"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <!-- CREATE MODAL -->
    <UModal v-model:open="modalOpen" title="Nueva transferencia">
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleSubmit">
          <UFormField label="Tipo de transferencia" name="transfer_type" required>
            <USelectMenu v-model="form.transfer_type" :items="transferTypes" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Origen (ID)" name="source_id" required>
              <UInput v-model="form.source_id" placeholder="UUID origen" />
            </UFormField>
            <UFormField label="Destino (ID)" name="dest_id" required>
              <UInput v-model="form.dest_id" placeholder="UUID destino" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Monto" name="amount" required>
              <UInput v-model.number="form.amount" type="number" />
            </UFormField>
            <UFormField label="Moneda" name="currency_code">
              <UInput v-model="form.currency_code" />
            </UFormField>
          </div>
          <UFormField label="Descripción" name="description">
            <UInput v-model="form.description" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton label="Crear" type="submit" />
          </div>
        </UForm>
      </template>
    </UModal>
  </UPage>
</template>
