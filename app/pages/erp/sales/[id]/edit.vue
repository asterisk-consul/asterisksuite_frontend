<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

import FacturaForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import OrdenVentaForm from '~/modulos/erp/documents/orden-venta/OrdenVentaForm.vue'

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
const category = computed(() => documentsSalesStore.current?.document_types?.category)
const isOrder = computed(() => category.value === 'ORDER')
const isRemito = computed(() => category.value === 'REMITO')
const pageTitle = computed(() => {
  const labels: Record<string, string> = {
    QUOTE: 'presupuesto',
    ORDER: 'orden de venta',
    REMITO: 'remito',
    INVOICE: 'factura',
    CREDIT_NOTE: 'nota de crédito',
    DEBIT_NOTE: 'nota de débito'
  }
  return labels[category.value ?? ''] ?? 'documento de venta'
})
const orderDetails = computed(() => documentsSalesStore.current?.orden_venta_doc ?? undefined)

useBreadcrumbEntityLabel(
  computed(() => `/erp/sales/${route.params.id as string}`),
  computed(() => formatDocumentBreadcrumbLabel(documentsSalesStore.current))
)

const formRef = ref<InstanceType<typeof FacturaForm> | null>(null)
const ordenVentaRef = ref<InstanceType<typeof OrdenVentaForm> | null>(null)

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

    const extensionData = isOrder.value && ordenVentaRef.value
      ? ordenVentaRef.value.getFormData()
      : {}

    await documentsSalesStore.update(route.params.id as string, {
      ...payload,
      ...extensionData
    })

    toast.add({
      title: `${pageTitle.value.charAt(0).toUpperCase()}${pageTitle.value.slice(1)} actualizado`,
      description: isRemito.value
        ? 'Se guardaron las cantidades y depósitos de salida.'
        : `La ${pageTitle.value} se actualizó correctamente.`,
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
      <UDashboardNavbar :title="`Editar ${pageTitle}`">
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
          :title="isRemito ? 'Preparar remito' : `Editar ${pageTitle}`"
          :description="isRemito ? 'Revisá cantidades y elegí el depósito de salida de cada producto.' : `Modificá los datos de la ${pageTitle}.`"
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
            :category="category"
            :operational-mode="isRemito"
            @submit="handleSubmit"
          />

          <OrdenVentaForm
            v-if="factura && isOrder"
            ref="ordenVentaRef"
            :model-value="orderDetails"
            :loading="saving"
          />

          <div v-else-if="loading" class="p-10 text-center">Cargando...</div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>
