<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import SalesDocumentForm from '~/modulos/erp/facturas/components/FacturaForm.vue'
import { DocumentsPurchasesService } from '~/modulos/erp/purchases/purchases-documents.services'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const formRef = ref<InstanceType<typeof SalesDocumentForm> | null>(null)

const partyId = computed(() => (route.query.party_id as string) || undefined)
const parentInvoiceId = computed(() => (route.query.parent_invoice_id as string) || undefined)
const invoiceData = ref<any>(null)

onMounted(async () => {
  if (!parentInvoiceId.value) return
  try {
    const invoice = await DocumentsPurchasesService.getOne(parentInvoiceId.value)
    if (invoice?.document_types?.category !== 'INVOICE' || Number(invoice?.status) !== 2) {
      throw new Error('La factura de compra debe estar confirmada para generar el remito.')
    }
    invoiceData.value = invoice
  } catch (e: any) {
    toast.add({
      title: 'No se pudo cargar la factura de origen',
      description: e?.data?.message || e?.message,
      color: 'error'
    })
  }
})

const initialValues = computed(() => {
  if (!invoiceData.value) return partyId.value ? { party_id: partyId.value } : undefined

  return {
    party_id: invoiceData.value.party_id,
    currency_code: invoiceData.value.currency_code,
    exchange_rate: invoiceData.value.exchange_rate,
    rate_type: invoiceData.value.rate_type,
    descrip: invoiceData.value.descrip || '',
    ref: invoiceData.value.ref || '',
    commercial_adjustments: (invoiceData.value.commercial_adjustments ?? []).map((adjustment: any) => ({
      concept: adjustment.concept,
      value_type: adjustment.value_type,
      basis: adjustment.basis,
      value: Number(adjustment.value),
    })),
    items: (invoiceData.value.document_items ?? []).map((item: any) => ({
      product_id: item.product_id,
      variant_id: item.variant_id ?? undefined,
      variant_name: item.product_variants?.name ?? item.variant?.name ?? item.variant_name,
      product_name: item.products?.name ?? item.product?.name ?? item.product_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.original_unit_price ?? item.unit_price),
      discount_percentage: Number(item.discount_percentage ?? 0),
      purchase_unit_id: item.purchase_unit_id ?? undefined,
      unit_conversion_factor: Number(item.unit_conversion_factor ?? 1),
      stock_quantity: Number(item.stock_quantity ?? item.quantity),
      warehouse_id: item.warehouse_id ?? undefined,
    }))
  }
})

async function handleSubmit(payload: any) {
  if (saving.value) return
  try {
    saving.value = true
    const created = await DocumentsPurchasesService.create({
      ...payload,
      parent_document_id: parentInvoiceId.value || undefined,
    })
    toast.add({ title: 'Remito de Compra creado', color: 'success' })
    router.push(`/erp/purchases/remitos/${created.id}`)
  } catch (e: any) {
    const backendMsg = e?.data?.data?.message || e?.data?.message || e?.message || 'Error desconocido'
    toast.add({
      title: 'Error al crear remito de compra',
      description: Array.isArray(backendMsg) ? backendMsg[0] : backendMsg,
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
      title="Nuevo Remito de Compra"
      description="Completá los datos y agregá los productos"
    >
      <template #links>
        <UButton
          label="Guardar Remito de Compra"
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

    <div class="mx-auto w-full max-w-screen-2xl">
      <UAlert
        v-if="parentInvoiceId"
        class="mb-4"
        color="primary"
        variant="subtle"
        icon="i-lucide-link"
        title="Remito vinculado a una factura de compra"
        description="Los productos provienen de la factura seleccionada. El stock ingresará recién cuando confirmes este remito."
      />

      <SalesDocumentForm
        ref="formRef"
        :loading="saving"
        module-code="PURCHASES"
        category="REMITO"
        operational-mode
        :initial-values="initialValues"
        :parent-document-id="parentInvoiceId"
        @submit="handleSubmit"
      />
    </div>
  </UPage>
</template>
