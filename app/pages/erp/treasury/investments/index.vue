<script setup lang="ts">
import { useFinancialInvestmentsService } from '~/modulos/erp/financial-investments/financial-investments.service'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'

definePageMeta({ middleware: ['auth'] })
const service = useFinancialInvestmentsService()
const { bankAccounts, init: initBanks } = useBankAccounts()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const rows = ref<any[]>([])
const summary = ref<any>({ by_currency: [] })
const modalOpen = ref(false)
const typeFilter = ref('ACTIVE')
const today = () => new Date().toISOString().slice(0, 10)
const form = reactive<any>({ type: 'FIXED_TERM', name: '', institution_name: '', currency_code: 'ARS', source_bank_account_id: '', destination_bank_account_id: '', capital_amount: null, start_date: today(), maturity_date: '', annual_nominal_rate: null, day_count_basis: 365, liquidity_type: 'NON_CANCELABLE', early_cancel_available_from: '', early_cancel_annual_rate: null, initial_unit_value: null, units: null, auto_renew: false, reference: '', notes: '' })

const bankOptions = computed(() => bankAccounts.value.filter((b: any) => b.active && b.currency_code === form.currency_code).map((b: any) => ({ label: `${b.bank_name} · ${b.name} · ${money(b.balance, b.currency_code)}`, value: b.id })))
const filtered = computed(() => typeFilter.value === 'ALL' ? rows.value : rows.value.filter(r => ['ACTIVE', 'MATURED_PENDING_SETTLEMENT'].includes(r.display_status || r.status)))
const expectedUnits = computed(() => form.type === 'INVESTMENT_FUND' && form.capital_amount && form.initial_unit_value ? Number(form.capital_amount) / Number(form.initial_unit_value) : 0)
const fixedTermDays = computed(() => {
  if (!form.start_date || !form.maturity_date) return 0
  return Math.max(0, Math.round((new Date(`${form.maturity_date}T00:00:00Z`).getTime() - new Date(`${form.start_date}T00:00:00Z`).getTime()) / 86400000))
})
const expectedFixedTermInterest = computed(() => {
  if (!form.capital_amount || !form.annual_nominal_rate || !fixedTermDays.value) return 0
  return Number(form.capital_amount) * (Number(form.annual_nominal_rate) / 100) * fixedTermDays.value / Number(form.day_count_basis || 365)
})
const expectedFixedTermTotal = computed(() => Number(form.capital_amount || 0) + expectedFixedTermInterest.value)
const canSubmit = computed(() => {
  if (!form.name || !form.source_bank_account_id || !Number(form.capital_amount)) return false
  if (form.type === 'FIXED_TERM') {
    const baseComplete = Boolean(form.maturity_date && fixedTermDays.value > 0 && Number(form.annual_nominal_rate) >= 0)
    return form.liquidity_type === 'PRE_CANCELABLE'
      ? baseComplete && Boolean(form.early_cancel_available_from) && Number(form.early_cancel_annual_rate) >= 0
      : baseComplete
  }
  if (form.type === 'INVESTMENT_FUND') return Number(form.initial_unit_value) > 0
  return true
})
const load = async () => { loading.value = true; try { [rows.value, summary.value] = await Promise.all([service.findAll(), service.summary()]) } finally { loading.value = false } }
const money = (value: any, currency = 'ARS') => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0))
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Sin vencimiento'
const typeLabel = (type: string) => ({ FIXED_TERM: 'Plazo fijo', INVESTMENT_FUND: 'Fondo / FIMA', OTHER: 'Otra inversión' }[type] || type)
const statusLabel = (status: string) => ({ ACTIVE: 'Activa', MATURED_PENDING_SETTLEMENT: 'Vencida por liquidar', REDEEMED: 'Rescatada', RENEWED: 'Renovada', CANCELLED: 'Cancelada' }[status] || status)
const openCreate = () => { Object.assign(form, { type: 'FIXED_TERM', name: '', institution_name: '', currency_code: 'ARS', source_bank_account_id: '', destination_bank_account_id: '', capital_amount: null, start_date: today(), maturity_date: '', annual_nominal_rate: null, day_count_basis: 365, liquidity_type: 'NON_CANCELABLE', early_cancel_available_from: '', early_cancel_annual_rate: null, initial_unit_value: null, units: null, auto_renew: false, reference: '', notes: '' }); modalOpen.value = true }
watch(() => form.source_bank_account_id, id => { if (id && !form.destination_bank_account_id) form.destination_bank_account_id = id })
watch(() => form.type, type => {
  if (type === 'FIXED_TERM') { form.initial_unit_value = null; form.units = null }
  if (type === 'INVESTMENT_FUND') { form.maturity_date = ''; form.annual_nominal_rate = null; form.auto_renew = false }
})
watch(() => form.liquidity_type, type => { if (type === 'NON_CANCELABLE') { form.early_cancel_available_from = ''; form.early_cancel_annual_rate = null } })
const save = async () => { saving.value = true; try { await service.create({ ...form, units: form.type === 'INVESTMENT_FUND' ? (form.units || expectedUnits.value) : undefined, maturity_date: form.type === 'FIXED_TERM' ? form.maturity_date : undefined, annual_nominal_rate: form.type === 'FIXED_TERM' ? form.annual_nominal_rate : undefined, initial_unit_value: form.type === 'INVESTMENT_FUND' ? form.initial_unit_value : undefined }); toast.add({ title: 'Inversión constituida', description: 'El capital fue debitado de la cuenta bancaria.', color: 'success' }); modalOpen.value = false; await load() } catch (e: any) { toast.add({ title: 'No se pudo constituir', description: e?.data?.message || e?.message, color: 'error' }) } finally { saving.value = false } }
onMounted(async () => { await initBanks(); await load() })
</script>

<template>
  <UPage class="space-y-5">
    <AppPageHeader title="Inversiones" description="Controlá plazos fijos, fondos FIMA, rendimientos y próximas acreditaciones.">
      <template #links><UButton icon="i-lucide-plus" label="Nueva inversión" @click="openCreate" /></template>
    </AppPageHeader>

    <div class="grid gap-3 md:grid-cols-3">
      <UCard v-for="item in summary.by_currency" :key="item.currency_code">
        <p class="text-xs uppercase tracking-wide text-muted">Valor actual · {{ item.currency_code }}</p><p class="mt-1 text-2xl font-semibold">{{ money(item.current_value, item.currency_code) }}</p>
        <div class="mt-3 flex justify-between text-sm"><span class="text-muted">Capital {{ money(item.capital, item.currency_code) }}</span><span class="text-success">+ {{ money(item.accrued_return, item.currency_code) }}</span></div>
      </UCard>
      <UCard v-if="!summary.by_currency?.length"><p class="text-muted">Todavía no hay capital invertido.</p></UCard>
    </div>

    <div class="flex items-center justify-between gap-3"><h2 class="text-lg font-semibold">Cartera</h2><UButtonGroup><UButton label="Activas" :variant="typeFilter === 'ACTIVE' ? 'solid' : 'outline'" @click="typeFilter = 'ACTIVE'"/><UButton label="Todas" :variant="typeFilter === 'ALL' ? 'solid' : 'outline'" @click="typeFilter = 'ALL'"/></UButtonGroup></div>
    <div v-if="loading" class="space-y-3"><USkeleton v-for="n in 3" :key="n" class="h-32" /></div>
    <div v-else class="grid gap-4 xl:grid-cols-2">
      <UCard v-for="row in filtered" :key="row.id" class="hover:ring-1 hover:ring-primary/40 cursor-pointer" @click="navigateTo(`/erp/treasury/investments/${row.id}`)">
        <div class="flex items-start justify-between gap-3"><div><div class="flex flex-wrap items-center gap-2"><strong class="text-lg">{{ row.name }}</strong><UBadge :label="typeLabel(row.type)" color="neutral" variant="subtle"/><UBadge :label="statusLabel(row.display_status || row.status)" :color="(row.display_status || row.status) === 'ACTIVE' ? 'success' : 'warning'"/></div><p class="mt-1 text-sm text-muted">{{ row.institution_name || row.source_bank_account?.bank_name }}</p></div><UIcon name="i-lucide-chevron-right" class="text-muted"/></div>
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p class="text-xs text-muted">Capital</p><strong>{{ money(row.capital_amount, row.currency_code) }}</strong></div><div><p class="text-xs text-muted">Valor actual</p><strong>{{ money(row.current_value, row.currency_code) }}</strong></div><div><p class="text-xs text-muted">Rendimiento</p><strong class="text-success">{{ money(row.accrued_return, row.currency_code) }}</strong></div><div><p class="text-xs text-muted">{{ row.type === 'FIXED_TERM' ? 'Vencimiento' : 'Última valuación' }}</p><strong>{{ dateLabel(row.type === 'FIXED_TERM' ? row.maturity_date : row.current_unit_value_date) }}</strong></div></div>
      </UCard>
      <UAlert v-if="!filtered.length" class="xl:col-span-2" title="No hay inversiones para mostrar" color="neutral" variant="subtle"/>
    </div>

    <UModal v-model:open="modalOpen" title="Nueva inversión" description="La confirmación debitará el capital de la cuenta bancaria." :ui="{ content: 'sm:max-w-4xl' }">
      <template #body><div class="space-y-5">
        <div class="grid gap-4 sm:grid-cols-2"><UFormField label="Tipo" required><USelect v-model="form.type" :items="[{label:'Plazo fijo',value:'FIXED_TERM'},{label:'Fondo / FIMA',value:'INVESTMENT_FUND'},{label:'Otra inversión',value:'OTHER'}]" value-key="value" class="w-full"/></UFormField><UFormField label="Nombre" required><UInput v-model="form.name" placeholder="Ej. Plazo fijo Banco Nación" class="w-full"/></UFormField><UFormField label="Institución"><UInput v-model="form.institution_name" class="w-full"/></UFormField><UFormField label="Moneda" required><USelect v-model="form.currency_code" :items="['ARS','USD','EUR']" class="w-full"/></UFormField><UFormField label="Cuenta de origen" required><USelectMenu v-model="form.source_bank_account_id" :items="bankOptions" value-key="value" class="w-full"/></UFormField><UFormField label="Cuenta de acreditación"><USelectMenu v-model="form.destination_bank_account_id" :items="bankOptions" value-key="value" class="w-full"/></UFormField><UFormField label="Capital" required><UInput v-model.number="form.capital_amount" type="number" min="0" step="0.01" class="w-full"/></UFormField><UFormField label="Fecha de constitución" required><UInput v-model="form.start_date" type="date" class="w-full"/></UFormField></div>
        <div v-if="form.type === 'FIXED_TERM'" class="space-y-4 rounded-lg bg-elevated p-4">
          <UAlert icon="i-lucide-calculator" color="info" variant="subtle" title="Ingresá la TNA informada por el banco" description="El sistema calculará automáticamente el interés diario, el valor actual y el importe estimado al vencimiento." />
          <div class="grid gap-4 sm:grid-cols-3"><UFormField label="Fecha de vencimiento" description="Debe ser posterior a la constitución" required><UInput v-model="form.maturity_date" type="date" :min="form.start_date" class="w-full"/></UFormField><UFormField label="TNA informada por el banco (%)" description="Ejemplo: ingresá 35 para una TNA del 35%" required><UInput v-model.number="form.annual_nominal_rate" type="number" step="0.0001" placeholder="35" class="w-full"/></UFormField><UFormField label="Base de cálculo" description="Usá la indicada por el banco; normalmente 365"><USelect v-model="form.day_count_basis" :items="[{label:'365 días',value:365},{label:'360 días',value:360}]" value-key="value" class="w-full"/></UFormField></div>
          <div class="grid gap-4 sm:grid-cols-3"><UFormField label="Disponibilidad del dinero" description="Según las condiciones del certificado"><USelect v-model="form.liquidity_type" :items="[{label:'Tradicional · no permite retiro anticipado',value:'NON_CANCELABLE'},{label:'Precancellable · permite retiro anticipado',value:'PRE_CANCELABLE'}]" value-key="value" class="w-full"/></UFormField><template v-if="form.liquidity_type === 'PRE_CANCELABLE'"><UFormField label="Disponible para precancelar desde" description="Fecha mínima informada por el banco" required><UInput v-model="form.early_cancel_available_from" type="date" :min="form.start_date" :max="form.maturity_date" class="w-full"/></UFormField><UFormField label="TNA de precancelación (%)" description="Puede ser menor que la tasa al vencimiento" required><UInput v-model.number="form.early_cancel_annual_rate" type="number" step="0.0001" class="w-full"/></UFormField></template></div>
          <UAlert v-if="form.liquidity_type === 'PRE_CANCELABLE'" icon="i-lucide-circle-alert" color="warning" variant="subtle" title="El rescate anticipado usa otra tasa" description="Si retirás antes del vencimiento, el sistema calculará capital más el interés acumulado hasta ese día usando la TNA de precancelación. El importe final podrá corregirse con lo informado por el banco." />
          <div v-if="expectedFixedTermInterest" class="grid gap-3 rounded-md border border-default bg-default p-3 sm:grid-cols-3"><div><p class="text-xs text-muted">Duración</p><strong>{{ fixedTermDays }} días</strong></div><div><p class="text-xs text-muted">Interés estimado</p><strong class="text-success">{{ money(expectedFixedTermInterest, form.currency_code) }}</strong></div><div><p class="text-xs text-muted">Valor al vencimiento</p><strong>{{ money(expectedFixedTermTotal, form.currency_code) }}</strong></div></div>
          <USwitch v-model="form.auto_renew" label="El banco informa renovación automática"/>
        </div>
        <div v-if="form.type === 'INVESTMENT_FUND'" class="space-y-4 rounded-lg bg-elevated p-4">
          <UAlert icon="i-lucide-info" color="info" variant="subtle" title="Estos datos figuran en la constancia del fondo" description="Ingresá el valor de cuotaparte informado por el banco. Si dejás vacía la cantidad, el sistema la calcula dividiendo el capital por ese valor." />
          <div class="grid gap-4 sm:grid-cols-2"><UFormField label="Valor de cuotaparte informado por el banco" description="Valor correspondiente a la fecha de suscripción" required><UInput v-model.number="form.initial_unit_value" type="number" step="0.00000001" placeholder="Ej. 125,50" class="w-full"/></UFormField><UFormField label="Cuotapartes adquiridas (opcional)" :description="expectedUnits ? `Si lo dejás vacío se guardarán ${expectedUnits.toLocaleString('es-AR', { maximumFractionDigits: 8 })} cuotapartes` : 'Primero ingresá el capital y el valor de cuotaparte'"><UInput v-model.number="form.units" type="number" step="0.00000001" placeholder="Dejar vacío para calcular" class="w-full"/></UFormField></div>
          <div v-if="expectedUnits" class="flex items-center justify-between rounded-md border border-default bg-default p-3"><span class="text-sm text-muted">Cálculo automático: capital ÷ valor de cuotaparte</span><strong>{{ expectedUnits.toLocaleString('es-AR', { maximumFractionDigits: 8 }) }} cuotapartes</strong></div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2"><UFormField label="Referencia"><UInput v-model="form.reference" class="w-full"/></UFormField><UFormField label="Notas"><UTextarea v-model="form.notes" class="w-full"/></UFormField></div>
        <div class="flex justify-end gap-2"><UButton label="Cancelar" variant="ghost" @click="modalOpen=false"/><UButton label="Constituir inversión" :loading="saving" :disabled="!canSubmit" @click="save"/></div>
      </div></template>
    </UModal>
  </UPage>
</template>
