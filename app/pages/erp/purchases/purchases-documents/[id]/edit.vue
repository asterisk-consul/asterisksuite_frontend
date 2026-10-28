<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'

import { useDocumentsPurchasesStore } from '~/modulos/erp/purchases/stores/purchases.store'

import { mapDocumentToFacturaForm } from '~/modulos/erp/facturas/mappers/factura.mapper'
import { getDocumentSubmitError } from '~/utils/document-submit-error'

const documentsPurchasesStore = useDocumentsPurchasesStore()

const route = useRoute()

const router = useRouter()

const toast = useToast()

const saving = ref(false)

const loading = ref(true)

const factura = computed(() => {
  const doc = documentsPurchasesStore.current
  return doc ? mapDocumentToFacturaForm(doc) : null
})

useBreadcrumbEntityLabel(
  computed(() => `/erp/purchases/purchases-documents/${route.params.id as string}`),
  computed(() => formatDocumentBreadcrumbLabel(documentsPurchasesStore.current))
)

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)

onMounted(async () => {
  try {
    await documentsPurchasesStore.fetchOne(route.params.id as string)
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: any) {
  if (saving.value) return
  try {
    saving.value = true

    await documentsPurchasesStore.update(route.params.id as string, {
      ...payload,
      expected_updated_at: documentsPurchasesStore.current?.updated_at
    })
    formRef.value?.completeDraft()

    toast.add({
      title: 'Factura actualizada',
      description: 'Factura actualizada con exito',
      color: 'success'
    })

    router.push(`/erp/purchases/purchases-documents/${route.params.id}`)
  } catch (e: any) {
    toast.add({
      title: e?.statusCode === 409 || e?.status === 409 ? 'El documento cambió' : 'Error al actualizar',
      description: getDocumentSubmitError(e, 'No se pudo actualizar la factura de compra.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <UPage class="space-y-6">
        <AppPageHeader
          title="Editar Factura"
          description="Modificá la factura"
        >
          <template #links>
            <UButton label="Guardar Cambios" icon="i-lucide-check" :loading="saving" @click="formRef?.submit()">
              <template #trailing>
                <KeyboardShortcutHint :keys="['Ctrl', 'S']" />
              </template>
            </UButton>
          </template>
        </AppPageHeader>

        <UPageBody class="mx-auto w-full max-w-screen-2xl">
          <FacturaForm
            v-if="factura"
            ref="formRef"
            :initial-values="factura"
            :loading="saving"
            module-code="PURCHASES"
            @submit="handleSubmit"
          />

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
