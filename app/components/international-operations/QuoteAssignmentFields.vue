<script setup lang="ts">
import type { QuoteAssignmentInput } from '~/modulos/international-operations/types/international-operations.types'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'

const props = defineProps<{
  containers: Array<{ id: string; container_number: string }>
  documentCurrencyCode?: string
  operationCurrencyCode?: string
  disabled?: boolean
}>()
const assignment = defineModel<QuoteAssignmentInput>({ required: true })
const { expenseTypeOptions } = useInternationalOperations()
const { autoResolve, loading: rateLoading } = useExchangeRate()
const containerOptions = computed(() => props.containers.map(container => ({ label: container.container_number, value: container.id })))
const mismatch = computed(() => props.documentCurrencyCode && props.operationCurrencyCode && props.documentCurrencyCode !== props.operationCurrencyCode)
let rateRequest = 0
watch([() => props.documentCurrencyCode, () => props.operationCurrencyCode, () => assignment.value] as const, async ([currency, operationCurrency], previous) => {
  const request = ++rateRequest
  if (!currency || !operationCurrency) return
  if (currency === operationCurrency) { assignment.value.exchange_rate = 1; return }
  if (previous[0] && (previous[0] !== currency || previous[1] !== operationCurrency)) assignment.value.exchange_rate = null
  if (Number(assignment.value.exchange_rate) > 0) return
  try {
    const foreign = currency === 'ARS' ? operationCurrency : currency
    const target = currency === 'ARS' || operationCurrency === 'ARS' ? 'ARS' : operationCurrency
    const rate = await autoResolve(foreign, target)
    if (request === rateRequest && !(Number(assignment.value.exchange_rate) > 0)) assignment.value.exchange_rate = rate ?? null
  } catch { /* La cotización puede cargarse manualmente. */ }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4 rounded-xl border border-default bg-muted/20 p-4">
    <div><p class="font-medium">Asociación del presupuesto</p><p class="text-sm text-muted">Compará propuestas para el mismo contenedor y categoría. El comprobante elegido conservará esta asociación.</p></div>
    <UAlert v-if="!containers.length" color="warning" title="Primero creá un contenedor en esta operación" variant="subtle" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <UFormField label="Contenedor" required><USelect v-model="assignment.container_id" :items="containerOptions" placeholder="Elegir contenedor" :disabled="disabled || !containers.length" class="w-full" /></UFormField>
      <UFormField label="Categoría de gasto" required><USelect v-model="assignment.expense_type" :items="expenseTypeOptions" :disabled="disabled" class="w-full" /></UFormField>
    </div>
    <UFormField v-if="assignment.expense_type === 'OTHER'" label="Concepto de otros gastos" required><UInput v-model="assignment.custom_expense_description" :disabled="disabled" :maxlength="255" class="w-full" /></UFormField>
    <UFormField v-if="mismatch" label="Cotización para la operación" description="Para ARS/moneda extranjera, indicá los ARS por una unidad extranjera." required><UInput v-model.number="assignment.exchange_rate" type="number" :min="0.000001" :step="0.000001" :loading="rateLoading" class="w-full" /></UFormField>
  </div>
</template>
