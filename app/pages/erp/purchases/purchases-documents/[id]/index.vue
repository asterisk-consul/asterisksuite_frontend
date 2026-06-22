<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaView from '~/modulos/erp/facturas/components/FacturaView.vue'

import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'

const documentsPurchasesStore = useDocumentsPurchasesStore()

const toast = useToast()

const route = useRoute()

const router = useRouter()

const { mainCollapsed } = useSidebarState()

const loading = ref(true)

const factura = computed(() => documentsPurchasesStore.current)
console.log(factura)

onMounted(async () => {
  try {
    await documentsPurchasesStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="factura ? `Factura #${factura.number}` : 'Factura'">
        <template #leading>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            @click="mainCollapsed = !mainCollapsed"
          />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-pencil"
            @click="router.push(`/erp/purchases/purchases-documents/${route.params.id}/edit`)"
          >
            Editar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageBody>
          <FacturaView v-if="factura" :document="factura" />

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
