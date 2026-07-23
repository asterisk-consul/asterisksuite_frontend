<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'

import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'

import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'

const documentsPurchasesStore = useDocumentsPurchasesStore()

const route = useRoute()

const router = useRouter()

const toast = useToast()

const { mainCollapsed } = useSidebarState()

const saving = ref(false)

const loading = ref(true)

const factura = computed(() => {
  const doc = documentsPurchasesStore.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)

onMounted(async () => {
  try {
    await documentsPurchasesStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true

    await documentsPurchasesStore.update(route.params.id as string, payload)

    toast.add({
      title: 'Factura actualizada',
      description: 'Factura actualizada con exito',
      color: 'success'
    })

    router.push(`/erp/purchases/purchases-documents/${route.params.id}`)
  } catch (e: any) {
    toast.add({
      title: 'Error al actualizar',
      description: e?.data?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Editar Factura">
        <template #leading>
          <UButton
            icon="i-lucide-panel-left-close"
            variant="ghost"
            color="neutral"
            @click="mainCollapsed = !mainCollapsed"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UPage>
        <UPageHeader
          title="Editar Factura"
          description="Modificá la factura"
          :links="[
            {
              label: 'Guardar Cambios',

              icon: 'i-lucide-check',

              loading: saving,

              onClick: () => formRef?.submit()
            }
          ]"
        />

        <UPageBody>
          <FacturaForm
            v-if="factura"
            ref="formRef"
            :initial-values="factura"
            :loading="saving"
            @submit="handleSubmit"
          />

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
