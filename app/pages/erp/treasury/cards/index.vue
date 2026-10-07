<script setup lang="ts">
import { useCreditCardsService } from '~/modulos/erp/credit-cards/credit-cards.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
definePageMeta({ middleware: ['auth'] })
const service = useCreditCardsService()
const toast = useToast()
const loading = ref(true)
const items = ref<any[]>([])
const modalOpen = ref(false)
const paymentOpen = ref(false)
const editing = ref<any>(null)
const selectedInstallment = ref<any>(null)
const installments = ref<any[]>([])
const { bankAccounts, init: loadBanks } = useBankAccounts()
const tab = ref<'COMPANY' | 'CUSTOMER'>('COMPANY')
const emptyForm = () => ({ name: '', type: tab.value, brand: 'VISA', last_four: '', bank_name: '', holder_name: '', holder_id: '', credit_limit: null, currency_code: 'ARS', commission_rate: null, clearing_days: null, closing_day: null, due_day: null, active: true })
const form = reactive(emptyForm())
const filtered = computed(() => items.value.filter(item => item.type === tab.value))
const title = computed(() => tab.value === 'COMPANY' ? 'Tarjetas corporativas' : 'Canales de cobro')
const bankOptions = computed(() => bankAccounts.value.filter((b: any) => b.active !== false && b.currency_code === selectedInstallment.value?.currency_code).map((b: any) => ({ label: `${b.name} · ${b.bank_name}`, value: b.id })))
const paymentForm = reactive({ bank_account_id: '', date: new Date().toISOString().slice(0, 10), amount: 0, reference: '', notes: '' })
const load = async () => { loading.value = true; try { const [cards, dues] = await Promise.all([service.findAll(), service.installments({ status: 'PENDING' })]); items.value = cards; installments.value = dues } finally { loading.value = false } }
const openCreate = () => { editing.value = null; Object.assign(form, emptyForm()); modalOpen.value = true }
const openEdit = (item: any) => { editing.value = item; Object.assign(form, item); modalOpen.value = true }
const save = async () => {
  try {
    const payload = { ...form, type: tab.value, last_four: form.last_four || '0000', holder_name: form.holder_name || form.name, bank_name: form.bank_name || form.name }
    if (editing.value) await service.update(editing.value.id, payload); else await service.create(payload)
    toast.add({ title: editing.value ? 'Configuración actualizada' : 'Configuración creada', color: 'success' }); modalOpen.value = false; await load()
  } catch (error: any) { toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' }) }
}
const openPayment = (item: any) => { selectedInstallment.value = item; Object.assign(paymentForm, { bank_account_id: '', date: new Date().toISOString().slice(0, 10), amount: Number(item.amount), reference: '', notes: '' }); paymentOpen.value = true }
const payInstallment = async () => {
  try { await service.payInstallment(selectedInstallment.value.id, { ...paymentForm }); toast.add({ title: 'Pago de tarjeta registrado', color: 'success' }); paymentOpen.value = false; await load() }
  catch (error: any) { toast.add({ title: 'No se pudo registrar el pago', description: error?.data?.message, color: 'error' }) }
}
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(amount || 0))
const shortDate = (date: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
onMounted(() => Promise.all([load(), loadBanks()]))
</script>

<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Tarjetas" description="Administrá tarjetas corporativas y canales utilizados para cobrar ventas.">
      <template #links><UButton label="Nueva configuración" icon="i-lucide-plus" @click="openCreate" /></template>
    </AppPageHeader>
    <UTabs v-model="tab" :items="[{ label: 'Corporativas', value: 'COMPANY', icon: 'i-lucide-credit-card' }, { label: 'Canales de cobro', value: 'CUSTOMER', icon: 'i-lucide-badge-dollar-sign' }]" />
    <UAlert v-if="tab === 'CUSTOMER'" color="info" variant="subtle" icon="i-lucide-info" title="Configurá adquirentes, comercios o procesadores" description="No guardes números completos ni códigos de seguridad de tarjetas de clientes." />
    <div v-if="loading" class="grid md:grid-cols-3 gap-4"><USkeleton v-for="n in 3" :key="n" class="h-40" /></div>
    <div v-else class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      <UPageCard v-for="item in filtered" :key="item.id" :title="item.name" :description="`${item.brand} · ${item.currency_code}`">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">{{ tab === 'COMPANY' ? 'Terminación' : 'Comisión estimada' }}</span><strong>{{ tab === 'COMPANY' ? `•••• ${item.last_four}` : `${Number(item.commission_rate || 0)}%` }}</strong></div>
          <div class="flex justify-between"><span class="text-muted">{{ tab === 'COMPANY' ? 'Cierre / vencimiento' : 'Acreditación' }}</span><span>{{ tab === 'COMPANY' ? `${item.closing_day || '—'} / ${item.due_day || '—'}` : `${item.clearing_days || 0} días` }}</span></div>
          <div class="flex justify-between"><span class="text-muted">Operaciones</span><span>{{ item._count?.transactions || 0 }}</span></div>
        </div>
        <template #footer><UButton label="Editar" icon="i-lucide-pencil" variant="soft" block @click="openEdit(item)" /></template>
      </UPageCard>
      <UAlert v-if="!filtered.length" class="md:col-span-2 xl:col-span-3" color="neutral" variant="subtle" :title="`No hay ${title.toLowerCase()} configurados`" />
    </div>
    <UPageCard v-if="tab === 'COMPANY'" title="Próximas cuotas" description="El banco se descuenta recién cuando registrás el pago de la cuota o resumen.">
      <div v-if="installments.length" class="divide-y divide-default">
        <div v-for="due in installments" :key="due.id" class="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1 min-w-0"><p class="font-medium">{{ due.transaction.credit_card.name }} · cuota {{ due.installment_number }}/{{ due.total_installments }}</p><p class="text-sm text-muted">Vence {{ shortDate(due.due_date) }}<span v-if="due.transaction.payment?.party"> · {{ due.transaction.payment.party.name }}</span></p></div>
          <strong>{{ money(due.amount, due.currency_code) }}</strong><UButton label="Registrar pago" variant="soft" @click="openPayment(due)" />
        </div>
      </div>
      <UAlert v-else color="neutral" variant="subtle" title="No hay cuotas pendientes" />
    </UPageCard>
    <UModal v-model:open="modalOpen" :title="editing ? `Editar ${title.toLowerCase()}` : `Nueva ${title.toLowerCase()}`" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField :label="tab === 'COMPANY' ? 'Nombre de la tarjeta' : 'Nombre del canal'" required><UInput v-model="form.name" class="w-full" /></UFormField>
          <UFormField label="Marca" required><USelect v-model="form.brand" :items="['VISA','MASTERCARD','AMEX','NARANJA','CABAL','OTHER']" class="w-full" /></UFormField>
          <UFormField :label="tab === 'COMPANY' ? 'Banco emisor' : 'Adquirente / procesador'" required><UInput v-model="form.bank_name" class="w-full" /></UFormField>
          <UFormField label="Moneda" required><USelect v-model="form.currency_code" :items="['ARS','USD','EUR']" class="w-full" /></UFormField>
          <template v-if="tab === 'COMPANY'">
            <UFormField label="Titular"><UInput v-model="form.holder_name" class="w-full" /></UFormField><UFormField label="Últimos 4 dígitos"><UInput v-model="form.last_four" maxlength="4" class="w-full" /></UFormField>
            <UFormField label="Límite"><UInput v-model.number="form.credit_limit" type="number" class="w-full" /></UFormField><div class="grid grid-cols-2 gap-3"><UFormField label="Día de cierre"><UInput v-model.number="form.closing_day" type="number" /></UFormField><UFormField label="Día de vencimiento"><UInput v-model.number="form.due_day" type="number" /></UFormField></div>
          </template>
          <template v-else><UFormField label="Comisión estimada %"><UInput v-model.number="form.commission_rate" type="number" step="0.01" class="w-full" /></UFormField><UFormField label="Días para acreditar"><UInput v-model.number="form.clearing_days" type="number" class="w-full" /></UFormField></template>
        </div>
        <div class="flex justify-end gap-2 pt-6"><UButton label="Cancelar" variant="ghost" @click="modalOpen = false" /><UButton label="Guardar" @click="save" /></div>
      </template>
    </UModal>
    <UModal v-model:open="paymentOpen" title="Registrar pago de tarjeta" :ui="{ content: 'sm:max-w-xl' }">
      <template #body><div class="space-y-4">
        <UAlert color="info" variant="subtle" :title="selectedInstallment ? `${selectedInstallment.transaction.credit_card.name} · cuota ${selectedInstallment.installment_number}/${selectedInstallment.total_installments}` : ''" description="Este registro descontará el importe de la cuenta bancaria elegida." />
        <div class="grid sm:grid-cols-2 gap-4"><UFormField label="Cuenta bancaria" required><USelectMenu v-model="paymentForm.bank_account_id" :items="bankOptions" value-key="value" class="w-full" /></UFormField><UFormField label="Fecha" required><UInput v-model="paymentForm.date" type="date" class="w-full" /></UFormField><UFormField label="Importe" required><UInput v-model.number="paymentForm.amount" type="number" step="0.01" class="w-full" /></UFormField><UFormField label="Referencia"><UInput v-model="paymentForm.reference" class="w-full" /></UFormField></div>
        <UFormField label="Observaciones"><UTextarea v-model="paymentForm.notes" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2"><UButton label="Cancelar" variant="ghost" @click="paymentOpen = false" /><UButton label="Confirmar pago" :disabled="!paymentForm.bank_account_id || paymentForm.amount <= 0" @click="payInstallment" /></div>
      </div></template>
    </UModal>
  </UPage>
</template>
