<script setup lang="ts">
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
definePageMeta({ middleware: ['auth'] })
const service = useCreditCardsService()
const { bankAccounts, init: initBanks } = useBankAccounts()
const toast = useToast()
const loading = ref(true)
const rows = ref<any[]>([])
const showCleared = ref(false)
const modalOpen = ref(false)
const selected = ref<any>(null)
const form = reactive({ bank_account_id: '', date: today(), commission_amount: 0, tax_amount: 0, withholding_amount: 0, other_deductions: 0, net_amount: 0, reference: '', notes: '' })
const bankOptions = computed(() => bankAccounts.value.filter((b: any) => b.active && (!selected.value || b.currency_code === selected.value.currency_code)).map((b: any) => ({ label: `${b.bank_name} · ${b.name} · ${b.currency_code}`, value: b.id })))
const deductions = computed(() => Number(form.commission_amount || 0) + Number(form.tax_amount || 0) + Number(form.withholding_amount || 0) + Number(form.other_deductions || 0))
const calculatedNet = computed(() => Number(selected.value?.amount || 0) - deductions.value)
const load = async () => { loading.value = true; try { rows.value = await service.transactions({ type: 'COLLECTION', ...(showCleared.value ? {} : { status: 'PENDING' }) }) } finally { loading.value = false } }
watch(showCleared, load)
const openSettle = (row: any) => { selected.value = row; Object.assign(form, { bank_account_id: '', date: today(), commission_amount: Number(row.commission_amount || 0), tax_amount: 0, withholding_amount: 0, other_deductions: 0, net_amount: Number(row.net_amount || row.amount), reference: '', notes: '' }); modalOpen.value = true }
watch(calculatedNet, value => { if (modalOpen.value) form.net_amount = Number(value.toFixed(2)) })
const settle = async () => { try { await service.settle(selected.value.id, form); toast.add({ title: 'Liquidación acreditada en el banco', color: 'success' }); modalOpen.value = false; await load() } catch (error: any) { toast.add({ title: 'No se pudo acreditar', description: error?.data?.message, color: 'error' }) } }
const closeModal = () => { modalOpen.value = false }
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('es-AR') : 'Sin fecha'
const money = (value: any, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0))
onMounted(async () => { await Promise.all([load(), initBanks()]) })
</script>

<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Liquidaciones de tarjeta" description="Controlá cobros pendientes y registrá el ingreso real en la cuenta bancaria correspondiente.">
      <template #links><USwitch v-model="showCleared" label="Mostrar acreditadas" /></template>
    </AppPageHeader>
    <UAlert color="info" variant="subtle" icon="i-lucide-landmark" title="El banco se afecta al confirmar la acreditación" description="La factura ya está cobrada, pero el dinero permanece pendiente hasta registrar la liquidación del adquirente." />
    <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 4" :key="n" class="h-20" /></div>
    <div v-else class="space-y-3">
      <UCard v-for="row in rows" :key="row.id">
        <div class="grid gap-4 md:grid-cols-[1.3fr_.8fr_.8fr_.8fr_auto] items-center">
          <div><div class="flex gap-2 items-center"><strong>{{ row.credit_card.name }}</strong><UBadge :label="row.clearing_status === 'CLEARED' ? 'Acreditada' : (row.expected_clearing_date && new Date(row.expected_clearing_date) < new Date() ? 'Vencida' : 'Pendiente')" :color="row.clearing_status === 'CLEARED' ? 'success' : 'warning'" /></div><p class="text-sm text-muted">{{ row.payment?.party?.name || 'Cliente' }} · autorización {{ row.authorization || 'sin informar' }}</p></div>
          <div><p class="text-xs text-muted">Fecha esperada</p><strong>{{ dateLabel(row.expected_clearing_date) }}</strong></div>
          <div><p class="text-xs text-muted">Bruto</p><strong>{{ money(row.amount, row.currency_code) }}</strong></div>
          <div><p class="text-xs text-muted">Neto esperado</p><strong>{{ money(row.net_amount, row.currency_code) }}</strong></div>
          <UButton v-if="row.clearing_status !== 'CLEARED'" label="Acreditar" icon="i-lucide-landmark" @click="openSettle(row)" />
        </div>
      </UCard>
      <UAlert v-if="!rows.length" color="neutral" variant="subtle" title="No hay liquidaciones para mostrar" />
    </div>
    <UModal v-model:open="modalOpen" title="Registrar acreditación" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Cuenta bancaria" required><USelectMenu v-model="form.bank_account_id" :items="bankOptions" value-key="value" class="w-full" /></UFormField>
          <UFormField label="Fecha real" required><DataPicker v-model="form.date" /></UFormField>
          <UFormField label="Comisión"><UInput v-model.number="form.commission_amount" type="number" class="w-full" /></UFormField><UFormField label="IVA / impuestos sobre comisión"><UInput v-model.number="form.tax_amount" type="number" class="w-full" /></UFormField>
          <UFormField label="Retenciones"><UInput v-model.number="form.withholding_amount" type="number" class="w-full" /></UFormField><UFormField label="Otros descuentos"><UInput v-model.number="form.other_deductions" type="number" class="w-full" /></UFormField>
          <UFormField label="Neto acreditado" required><UInput v-model.number="form.net_amount" type="number" class="w-full" /></UFormField><UFormField label="Referencia bancaria"><UInput v-model="form.reference" class="w-full" /></UFormField>
          <UFormField class="sm:col-span-2" label="Motivo de diferencia" :description="Math.abs(calculatedNet - form.net_amount) > .01 ? `Diferencia: ${money(form.net_amount - calculatedNet, selected?.currency_code)}` : 'El neto coincide con el cálculo'"><UTextarea v-model="form.notes" class="w-full" /></UFormField>
        </div>
        <div class="rounded-lg bg-elevated p-4 mt-5 flex justify-between"><span>Bruto {{ money(selected?.amount, selected?.currency_code) }} · descuentos {{ money(deductions, selected?.currency_code) }}</span><strong>Neto {{ money(form.net_amount, selected?.currency_code) }}</strong></div>
        <div class="flex justify-end gap-2 pt-6"><UButton label="Cancelar" variant="ghost" @click="closeModal" /><UButton label="Confirmar acreditación" :disabled="!form.bank_account_id" @click="settle" /></div>
      </template>
    </UModal>
  </UPage>
</template>
