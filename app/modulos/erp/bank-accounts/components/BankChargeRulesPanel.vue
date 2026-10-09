<script setup lang="ts">
import type { BankChargeRule, BankChargeRuleInput } from '../types/bank-accounts.types'
import { useBankAccountsService } from '../service/bank-accounts.service'
import { useBankConcepts } from '~/modulos/erp/bank-concepts/composable/useBankConcepts'

const props = defineProps<{ accountId: string; currencyCode: string }>()
const service = useBankAccountsService()
const concepts = useBankConcepts()
const toast = useToast()
const rules = ref<BankChargeRule[]>([])
const loading = ref(false)
const saving = ref(false)
const modalOpen = ref(false)
const editing = ref<BankChargeRule | null>(null)

const triggers = [
  { label: 'Pago desde banco', value: 'BANK_PAYMENT' }, { label: 'Cobro en banco', value: 'BANK_COLLECTION' },
  { label: 'Liquidación de tarjeta', value: 'CARD_SETTLEMENT' }, { label: 'Depósito de cheque', value: 'CHECK_DEPOSIT' },
  { label: 'Rechazo de cheque', value: 'CHECK_REJECTION' }, { label: 'Rescate de inversión', value: 'INVESTMENT_REDEMPTION' },
  { label: 'Cancelación anticipada de plazo fijo', value: 'FIXED_TERM_EARLY_CANCEL' }
]
const calculationTypes = [
  { label: 'Importe fijo', value: 'FIXED' }, { label: 'Porcentaje', value: 'PERCENTAGE' },
  { label: 'Fijo + porcentaje', value: 'FIXED_PLUS_PERCENTAGE' }
]
const conceptItems = computed(() => concepts.activeConcepts.value.map(c => ({ label: `${c.code} · ${c.name}`, value: c.id })))
const triggerLabel = (value: string) => triggers.find(x => x.value === value)?.label ?? value
const calculationLabel = (rule: BankChargeRule) => {
  if (rule.calculation_type === 'FIXED') return `${rule.fixed_amount || 0} ${rule.currency_code || props.currencyCode}`
  if (rule.calculation_type === 'PERCENTAGE') return `${rule.percentage || 0}%`
  return `${rule.fixed_amount || 0} ${rule.currency_code || props.currencyCode} + ${rule.percentage || 0}%`
}

const form = reactive<BankChargeRuleInput>({
  bank_concept_id: '', name: '', trigger: 'BANK_PAYMENT', calculation_type: 'PERCENTAGE',
  fixed_amount: 0, percentage: null, minimum_amount: null, maximum_amount: null,
  currency_code: props.currencyCode, valid_from: null, valid_until: null, priority: 0, editable: true, active: true
})
async function load() { loading.value = true; try { rules.value = await service.getChargeRules(props.accountId) } finally { loading.value = false } }
function openCreate() { editing.value = null; Object.assign(form, { bank_concept_id: '', name: '', trigger: 'BANK_PAYMENT', calculation_type: 'PERCENTAGE', fixed_amount: 0, percentage: null, minimum_amount: null, maximum_amount: null, currency_code: props.currencyCode, valid_from: null, valid_until: null, priority: 0, editable: true, active: true }); modalOpen.value = true }
function openEdit(rule: BankChargeRule) { editing.value = rule; Object.assign(form, { ...rule, valid_from: rule.valid_from?.slice(0, 10) || null, valid_until: rule.valid_until?.slice(0, 10) || null }); modalOpen.value = true }
async function save() {
  saving.value = true
  try {
    if (editing.value) await service.updateChargeRule(props.accountId, editing.value.id, { ...form })
    else await service.createChargeRule(props.accountId, { ...form })
    toast.add({ title: editing.value ? 'Regla actualizada' : 'Regla creada', color: 'success' })
    modalOpen.value = false; await load()
  } catch (e: any) { toast.add({ title: 'No se pudo guardar', description: e?.data?.message || e?.message, color: 'error' }) }
  finally { saving.value = false }
}
async function remove(rule: BankChargeRule) { await service.removeChargeRule(props.accountId, rule.id); toast.add({ title: 'Regla eliminada', color: 'success' }); await load() }
onMounted(async () => { await Promise.all([load(), concepts.init()]) })
</script>

<template>
  <UPageCard variant="subtle">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><h3 class="text-sm font-semibold">Comisiones sugeridas</h3><p class="mt-1 text-xs text-muted">Se precargan según la operación. El usuario siempre las revisa antes de confirmar.</p></div>
        <UButton label="Nueva regla" icon="i-lucide-plus" size="sm" @click="openCreate" />
      </div>
    </template>
    <div v-if="loading" class="py-6 text-center text-sm text-muted">Cargando reglas…</div>
    <div v-else-if="!rules.length" class="rounded-lg border border-dashed border-default p-5 text-center text-sm text-muted">Todavía no hay reglas configuradas para esta cuenta.</div>
    <div v-else class="divide-y divide-default">
      <div v-for="rule in rules" :key="rule.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <div class="min-w-0"><div class="flex items-center gap-2"><span class="font-medium">{{ rule.name }}</span><UBadge :color="rule.active ? 'success' : 'neutral'" variant="subtle">{{ rule.active ? 'Activa' : 'Inactiva' }}</UBadge></div><p class="text-xs text-muted">{{ triggerLabel(rule.trigger) }} · {{ rule.bank_concept?.name }} · {{ calculationLabel(rule) }}</p></div>
        <div class="flex gap-1"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="openEdit(rule)"/><UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="remove(rule)"/></div>
      </div>
    </div>
  </UPageCard>

  <UModal v-model:open="modalOpen" title="Regla de comisión bancaria" description="Define cuándo y cómo sugerir este cargo.">
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Nombre" required class="sm:col-span-2"><UInput v-model="form.name" class="w-full" placeholder="Ej. Comisión por transferencia" /></UFormField>
        <UFormField label="Se aplica en" required><USelect v-model="form.trigger" :items="triggers" class="w-full" /></UFormField>
        <UFormField label="Concepto bancario" required><USelectMenu v-model="form.bank_concept_id" value-key="value" :items="conceptItems" searchable class="w-full" /></UFormField>
        <UFormField label="Cálculo" required><USelect v-model="form.calculation_type" :items="calculationTypes" class="w-full" /></UFormField>
        <UFormField v-if="form.calculation_type !== 'PERCENTAGE'" label="Importe fijo"><UInput v-model.number="form.fixed_amount" type="number" min="0" class="w-full" /></UFormField>
        <UFormField v-if="form.calculation_type !== 'FIXED'" label="Porcentaje"><UInput v-model.number="form.percentage" type="number" min="0" step="0.01" class="w-full"><template #trailing>%</template></UInput></UFormField>
        <UFormField label="Mínimo opcional"><UInput v-model.number="form.minimum_amount" type="number" min="0" class="w-full" /></UFormField>
        <UFormField label="Tope opcional"><UInput v-model.number="form.maximum_amount" type="number" min="0" class="w-full" /></UFormField>
        <UFormField label="Vigente desde"><UInput v-model="form.valid_from" type="date" class="w-full" /></UFormField>
        <UFormField label="Vigente hasta"><UInput v-model="form.valid_until" type="date" class="w-full" /></UFormField>
        <div class="sm:col-span-2 flex flex-wrap gap-5"><UCheckbox v-model="form.active" label="Regla activa"/><UCheckbox v-model="form.editable" label="Permitir corregir la sugerencia"/></div>
      </div>
    </template>
    <template #footer><div class="flex w-full justify-end gap-2"><UButton label="Cancelar" color="neutral" variant="ghost" @click="modalOpen=false"/><UButton label="Guardar regla" :loading="saving" :disabled="!form.name || !form.bank_concept_id" @click="save"/></div></template>
  </UModal>
</template>
