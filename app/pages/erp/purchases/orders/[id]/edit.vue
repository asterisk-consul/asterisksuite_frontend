<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import OrdenCompraForm from '~/modulos/erp/documents/orden-compra/OrdenCompraForm.vue'
import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'
import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'

const store = useDocumentsPurchasesStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const loading = ref(true)

const factura = computed(() => {
  const doc = store.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})

const extensionData = computed(() => store.current?.orden_compra_doc ?? null)

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)
const extensionRef = ref<InstanceType<typeof OrdenCompraForm> | null>(null)

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
    const extension = extensionRef.value?.getFormData()
    await store.update(route.params.id as string, { ...payload, ...extension })
    toast.add({ title: 'Orden de compra actualizada', color: 'success' })
    router.push(`/erp/purchases/orders/${route.params.id}`)
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
      title="Editar Orden de Compra"
      description="Modificá la orden de compra"
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

    <div class="max-w-4xl space-y-4">
      <FacturaForm
        v-if="factura"
        ref="formRef"
        :initial-values="factura"
        :loading="saving"
        module-code="PURCHASES"
        category="ORDER"
        @submit="handleSubmit"
      />
      <OrdenCompraForm
        ref="extensionRef"
        :model-value="extensionData"
        :loading="saving"
      />
      <div v-if="!factura && loading" class="p-10 text-center">Cargando...</div>
    </div>
  </UPage>
</template>
