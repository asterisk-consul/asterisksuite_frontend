<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import OrdenCompraForm from '~/modulos/erp/documents/orden-compra/OrdenCompraForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'
import { buildDocumentDuplicateValues, buildDocumentExtensionDuplicateValues } from '~/modulos/erp/documents/utils/document-duplicate'
import { getDocumentSubmitError } from '~/utils/document-submit-error'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)
const extensionRef = ref<InstanceType<typeof OrdenCompraForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const duplicateId = computed(() => (route.query.duplicate_id as string) || undefined)
const duplicateData = ref<any>(null)
const extensionDraft = ref<Record<string, any>>({})

onMounted(async () => {
  if (!duplicateId.value) return
  try {
    duplicateData.value = await DocumentsPurchasesService.getOne(duplicateId.value)
    if (duplicateData.value.document_types?.category !== 'ORDER') throw new Error('El documento no es una orden de compra.')
    extensionDraft.value = buildDocumentExtensionDuplicateValues(duplicateData.value.orden_compra_doc)
    toast.add({ title: 'Copia preparada', description: 'Revisá los datos y guardá para crear el borrador con el próximo número disponible.', color: 'info' })
  } catch (e: any) {
    duplicateData.value = null
    toast.add({ title: 'No se pudo cargar la orden para duplicarla', description: e?.data?.message || e?.message, color: 'error' })
  }
})

const initialValues = computed(() => {
  if (duplicateData.value) return buildDocumentDuplicateValues(duplicateData.value)
  return partyId.value ? { party_id: partyId.value } : undefined
})

async function handleSubmit(payload: any) {
  if (saving.value) return
  try {
    saving.value = true
    const extension = extensionRef.value?.getFormData()
    const created = await DocumentsPurchasesService.create({ ...payload, ...extension })
    toast.add({ title: 'Orden de Compra creada', color: 'success' })
    router.push(`/erp/purchases/orders/${created.id}`)
  } catch (e: any) {
    toast.add({
      title: 'Error al crear orden de compra',
      description: getDocumentSubmitError(e, 'No se pudo crear la orden de compra.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Nueva Orden de Compra"
      description="Completá los datos y agregá los productos"
    >
      <template #links>
        <UButton
          label="Guardar Orden de Compra"
          icon="i-lucide-check"
          :loading="saving"
          @click="formRef?.submit()"
        >
          <template #trailing>
            <KeyboardShortcutHint :keys="['Ctrl', 'S']" />
          </template>
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mx-auto w-full max-w-screen-2xl space-y-5">
      <SalesDocumentForm
        ref="formRef"
        :loading="saving"
        module-code="PURCHASES"
        category="ORDER"
        :initial-values="initialValues"
        @submit="handleSubmit"
      >
        <template #document-details>
          <OrdenCompraForm ref="extensionRef" v-model="extensionDraft" />
        </template>
      </SalesDocumentForm>
    </div>
  </UPage>
</template>
