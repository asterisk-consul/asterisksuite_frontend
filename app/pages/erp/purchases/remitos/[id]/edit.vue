<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { useDocumentsSalesStore } from '~/modulos/erp/sales/stores/sales.store'
import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'

const store = useDocumentsSalesStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const loading = ref(true)

const factura = computed(() => {
  const doc = store.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)

onMounted(async () => {
  try {
    await store.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: any) {
  try {
    saving.value = true
    await store.update(route.params.id as string, payload)
    toast.add({ title: 'Remito de compra actualizado', color: 'success' })
    router.push(`/erp/purchases/remitos/${route.params.id}`)
  } catch (e: any) {
    toast.add({ title: 'Error al actualizar', description: e?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Editar Remito de Compra"
      description="Modificá el remito de compra"
    >
      <template #links>
        <UButton
          label="Guardar Cambios"
          icon="i-lucide-check"
          :loading="saving"
          @click="formRef?.submit()"
        />
      </template>
    </AppPageHeader>

    <div class="mx-auto w-full max-w-screen-2xl">
      <FacturaForm
        v-if="factura"
        ref="formRef"
        :initial-values="factura"
        :loading="saving"
        module-code="PURCHASES"
        category="REMITO"
        @submit="handleSubmit"
      />
      <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
    </div>
  </UPage>
</template>
