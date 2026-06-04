<script setup lang="ts">
import type { CreateProductDto } from '~/modulos/logistica/master-data/product/types/product.types'

import { useAccountsStore } from '~/modulos/contabilidad/store/accounts.store'
import { useAccounts } from '~/modulos/contabilidad/composable/useAccounts'

const accountsStore = useAccountsStore()

const { items: accounts } = storeToRefs(accountsStore)

const { items } = useAccounts(accounts)

const form = defineModel<CreateProductDto>({
  required: true
})

onMounted(() => {
  if (!accounts.value.length) {
    accountsStore.fetchAll()
  }
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
    <!-- ========================= -->
    <!-- INCOME -->
    <!-- ========================= -->

    <UFormField label="Cuenta ingresos">
      <USelectMenu
        v-model="form.income_account_id"
        :items="items"
        value-key="value"
        searchable
        class="w-full"
        placeholder="Seleccionar cuenta"
      />
    </UFormField>

    <!-- ========================= -->
    <!-- EXPENSE -->
    <!-- ========================= -->

    <UFormField label="Cuenta egresos">
      <USelectMenu
        v-model="form.expense_account_id"
        :items="items"
        value-key="value"
        searchable
        class="w-full"
        placeholder="Seleccionar cuenta"
      />
    </UFormField>

    <!-- ========================= -->
    <!-- INVENTORY -->
    <!-- ========================= -->

    <UFormField label="Cuenta inventario">
      <USelectMenu
        v-model="form.inventory_account_id"
        :items="items"
        value-key="value"
        searchable
        class="w-full"
        placeholder="Seleccionar cuenta"
      />
    </UFormField>
  </div>
</template>
