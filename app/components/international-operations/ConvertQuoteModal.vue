<script setup lang="ts">
import QuoteAssignmentFields from './QuoteAssignmentFields.vue'
import { useDocumentTypes } from '~/modulos/erp/documents/documents-types/composable/useDocumentTypes'
import { useInternationalOperationsService } from '~/modulos/international-operations/service/international-operations.service'
import type { OperationQuoteRelation, QuoteAssignmentInput } from '~/modulos/international-operations/types/international-operations.types'

const props = defineProps<{ open: boolean; operationId: string; operationCurrencyCode: string; containers: Array<{ id: string; container_number: string }>; quote: OperationQuoteRelation | null; refreshing?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; converted: [] }>()
const types = useDocumentTypes()
const service = useInternationalOperationsService()
const toast = useToast()
const saving = ref(false)
const busy = computed(() => saving.value || !!props.refreshing)
const confirmDocument = ref(false)
const documentTypeId = ref('')
const assignment = ref<QuoteAssignmentInput>({ container_id: '', expense_type: 'MERCHANDISE' })
const targetOptions = computed(() => types.items.value.filter(type => type.direction === -1 && ['ORDER', 'INVOICE'].includes(type.category) && type.active !== false).map(type => ({ label: `${type.category === 'ORDER' ? 'Orden de compra' : 'Factura de compra'} · ${type.code} — ${type.description}`, value: type.id })))
const valid = computed(() => props.quote && assignment.value.container_id && documentTypeId.value && (assignment.value.expense_type !== 'OTHER' || assignment.value.custom_expense_description?.trim()) && (props.quote.document?.currency_code === props.operationCurrencyCode || Number(assignment.value.exchange_rate) > 0))
watch(() => props.open, async visible => {
  if (!visible || !props.quote) return
  confirmDocument.value = false
  documentTypeId.value = ''
  assignment.value = { container_id: props.quote.container_id ?? (props.containers.length === 1 ? props.containers[0]!.id : ''), expense_type: props.quote.expense_type ?? 'MERCHANDISE', custom_expense_description: props.quote.custom_expense_description ?? '', exchange_rate: props.quote.exchange_rate == null ? null : Number(props.quote.exchange_rate) }
  try { await types.init() } catch (error: any) { toast.add({ title: 'No se pudieron cargar los tipos de compra', description: error?.data?.message, color: 'error' }) }
})
async function convert() {
  if (!valid.value || !props.quote || saving.value) return
  saving.value = true
  try {
    const result = await service.convertQuote(props.operationId, props.quote.id, { ...assignment.value, document_type_id: documentTypeId.value, confirm: confirmDocument.value })
    toast.add({ title: result.document.status === 2 ? 'Comprobante creado y confirmado' : 'Comprobante creado en borrador', description: 'Conserva el contenedor y la categoría del presupuesto seleccionado.', color: 'success' })
    emit('converted')
  } catch (error: any) {
    toast.add({ title: 'No se pudo transformar el presupuesto', description: error?.data?.message ?? error?.message, color: 'error' })
  } finally { saving.value = false }
}

function handleOpenChange(value: boolean) {
  if (!value && busy.value) return
  emit('update:open', value)
}
</script>

<template>
  <UModal :open="open" :dismissible="!busy" title="Elegir y transformar presupuesto" description="La propuesta seleccionada genera un comprobante de compra en el mismo contenedor y categoría." :ui="{ content: 'sm:max-w-2xl' }" @update:open="handleOpenChange">
    <template #body>
      <div class="flex flex-col gap-5">
        <div v-if="busy" role="status" aria-live="polite" class="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <UIcon name="i-lucide-loader-circle" class="size-5 shrink-0 animate-spin text-primary" />
          <div>
            <p class="text-sm font-medium">{{ saving ? 'Generando el comprobante de compra…' : 'Actualizando los documentos de la operación…' }}</p>
            <p class="text-xs text-muted">La operación puede tardar unos segundos. No cierres esta ventana.</p>
          </div>
        </div>
        <UAlert :title="`Presupuesto #${quote?.document?.number ?? ''} · ${quote?.document?.business_parties?.name ?? ''}`" description="Las otras propuestas de este contenedor y categoría se marcarán como rechazadas. Las demás categorías conservan sus propuestas." color="info" variant="subtle" />
        <UFormField label="Comprobante a generar" required><USelect v-model="documentTypeId" :items="targetOptions" :disabled="busy" placeholder="Elegí orden de compra o factura de compra" class="w-full" /></UFormField>
        <QuoteAssignmentFields v-model="assignment" :containers="containers" :document-currency-code="quote?.document?.currency_code" :operation-currency-code="operationCurrencyCode" :disabled="busy || !!quote?.container_id" />
        <div class="flex flex-col gap-2 rounded-xl border border-default p-4">
          <USwitch v-model="confirmDocument" label="Confirmar al transformar" :disabled="busy" />
          <p class="text-sm text-muted">Por defecto se crea en borrador para revisar y editar. Los impuestos se calculan según el tipo destino. Activá esta opción si ya está listo: se aplicarán las validaciones y efectos habituales al confirmar compras.</p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2"><UButton label="Cancelar" variant="ghost" :disabled="busy" @click="handleOpenChange(false)" /><UButton :label="saving ? 'Creando comprobante…' : refreshing ? 'Actualizando documentos…' : confirmDocument ? 'Crear y confirmar' : 'Crear borrador'" icon="i-lucide-file-check" :loading="busy" :disabled="!valid || busy" @click="convert" /></div>
    </template>
  </UModal>
</template>
