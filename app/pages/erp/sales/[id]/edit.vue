<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'

import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'

import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'

const documentsSalesStore = useDocumentsSalesStore()

const route = useRoute()

const router = useRouter()

const toast = useToast()

const { mainCollapsed } = useSidebarState()

const saving = ref(false)

const loading = ref(true)

const factura = computed(() => {
  const doc = documentsSalesStore.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})
const isRemito = computed(() => documentsSalesStore.current?.document_types?.category === 'REMITO')

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)

onMounted(async () => {
  try {
    await documentsSalesStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true

    await documentsSalesStore.update(route.params.id as string, payload)

    toast.add({
      title: isRemito.value ? 'Remito actualizado' : 'Factura actualizada',
      description: isRemito.value ? 'Se guardaron las cantidades y depósitos de salida.' : 'Factura actualizada con éxito',
      color: 'success'
    })

    router.push(isRemito.value
      ? `/erp/remitos/${route.params.id}`
      : `/erp/sales/${route.params.id}`)
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
      <UDashboardNavbar :title="isRemito ? 'Editar remito' : 'Editar factura'">
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
          :title="isRemito ? 'Preparar remito' : 'Editar factura'"
          :description="isRemito ? 'Revisá cantidades y elegí el depósito de salida de cada producto.' : 'Modificá la factura'"
          :links="[
            {
              label: 'Guardar Cambios',

              icon: 'i-lucide-check',

              loading: saving,

              onClick: () => formRef?.submit()
            }
          ]"
        />

        <UPageBody class="mx-auto w-full max-w-screen-2xl">
          <FacturaForm
            v-if="factura"
            ref="formRef"
            :initial-values="factura"
            :loading="saving"
            module-code="SALES"
            :operational-mode="isRemito"
            @submit="handleSubmit"
          />

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
