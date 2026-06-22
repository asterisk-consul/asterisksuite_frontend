<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

import { useBusinessPartiesByType } from '~/modulos/logistica/master-data/bussiness-parties/composable/useBusinessPartiesByType'
import { BusinessPartyColumns } from '~/modulos/logistica/master-data/bussiness-parties/columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const { filteredItems, loading, fetchAll, goToCreate, goToEdit } =
  useBusinessPartiesByType('client', '/erp/sales/customers')

const columns = BusinessPartyColumns({ onEdit: goToEdit })

onMounted(fetchAll)
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Clientes">
        <template #right>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            class="rounded-full"
            @click="goToCreate"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <UPageCard variant="subtle">
          <LogisticaTable
            :loading="loading"
            :data="filteredItems"
            :columns="columns"
          />
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
