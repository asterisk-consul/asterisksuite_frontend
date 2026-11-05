<script setup lang="ts">
import { usePartnersService } from '~/modulos/erp/partners/service/partners.service'
import type { Partner } from '~/modulos/erp/partners/types/partners.types'
import { HrService } from '~/modulos/erp/hr/services/hr.service'
import type { PartnerFunds, PartnerInvestmentPlan } from '~/modulos/erp/hr/types/hr.types'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ success: [] }>()

const partnersService = usePartnersService()
const toast = useToast()
const investors = ref<Partner[]>([])
const selectedInvestorId = ref('')
const currencyCode = ref('ARS')
const description = ref('')
const funds = ref<PartnerFunds | null>(null)
const plans = ref<PartnerInvestmentPlan[]>([])
const loadingInvestors = ref(false)
const loadingDetails = ref(false)
const saving = ref(false)
const error = ref('')
const idempotencyKey = ref('')
let requestId = 0

function localDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonth(value: string) {
  const [year = new Date().getFullYear(), month = new Date().getMonth() + 1, day = new Date().getDate()] = value.split('-').map(Number)
  const nextMonth = new Date(year, month, 1)
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
  return localDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(day, lastDay)))
}

const installments = ref([{ due_date: '', amount: 0 }, { due_date: '', amount: 0 }])
const currencyOptions = [
  { label: 'Peso Argentino (ARS)', value: 'ARS' },
  { label: 'Dólar (USD)', value: 'USD' }
]
const investorOptions = computed(() => investors.value.map(investor => ({
  label: `${investor.first_name} ${investor.last_name}`.trim(),
  value: investor.id
})))
const selectedInvestor = computed(() => investors.value.find(investor => investor.id === selectedInvestorId.value) ?? null)
const totalAmount = computed(() => Math.round((installments.value.reduce((sum, item) => sum + Number(item.amount || 0), 0) + Number.EPSILON) * 100) / 100)
const canSave = computed(() => Boolean(
  selectedInvestor.value?.party_id
  && installments.value.length >= 2
  && installments.value.every(item => item.due_date && Number(item.amount) > 0)
  && totalAmount.value <= Number(funds.value?.available ?? 0)
  && !loadingDetails.value
  && !saving.value
))

watch([selectedInvestorId, currencyCode, description, installments], () => {
  if (!saving.value) idempotencyKey.value = ''
}, { deep: true })

function money(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currencyCode.value,
    maximumFractionDigits: 2
  }).format(Number(amount ?? 0))
}

function dateLabel(value: string) {
  const dateOnly = value?.split('T')[0]
  return dateOnly ? new Date(`${dateOnly}T12:00:00`).toLocaleDateString('es-AR') : '—'
}

function installmentStatus(status: string) {
  return ({ DRAFT: 'Borrador', PAID: 'Pagado', CONFIRMED: 'Confirmado', CANCELLED: 'Anulado' } as Record<string, string>)[status] ?? status
}

function planStatus(status: string) {
  return ({ ACTIVE: 'En curso', COMPLETED: 'Completado', CANCELLED: 'Anulado' } as Record<string, string>)[status] ?? status
}

async function loadInvestors() {
  loadingInvestors.value = true
  try {
    investors.value = (await partnersService.findAll())
      .filter(partner => partner.partner_kind === 'INVESTOR' && partner.is_active && partner.party_id)
  } catch (cause: any) {
    error.value = cause?.data?.message || 'No se pudieron cargar los inversionistas.'
  } finally {
    loadingInvestors.value = false
  }
}

async function loadDetails() {
  const investor = selectedInvestor.value
  const currentRequest = ++requestId
  funds.value = null
  plans.value = []
  if (!investor?.party_id) {
    loadingDetails.value = false
    return
  }

  loadingDetails.value = true
  error.value = ''
  try {
    const [nextFunds, nextPlans] = await Promise.all([
      HrService.getPartnerFunds(investor.party_id, currencyCode.value),
      HrService.getPartnerInvestmentPlans(investor.id)
    ])
    if (currentRequest === requestId) {
      funds.value = nextFunds
      plans.value = nextPlans
    }
  } catch (cause: any) {
    if (currentRequest === requestId) error.value = cause?.data?.message || 'No se pudieron cargar los saldos y planes.'
  } finally {
    if (currentRequest === requestId) loadingDetails.value = false
  }
}

function addInstallment() {
  const lastDate = installments.value.at(-1)?.due_date || localDate(new Date())
  installments.value.push({ due_date: addMonth(lastDate), amount: 0 })
}

function removeInstallment(index: number) {
  if (installments.value.length <= 2) return
  installments.value.splice(index, 1)
}

async function createPlan() {
  if (!selectedInvestor.value || !canSave.value) return
  saving.value = true
  error.value = ''
  try {
    if (!idempotencyKey.value) idempotencyKey.value = crypto.randomUUID()
    const plan = await HrService.createPartnerInvestmentPlan(selectedInvestor.value.id, {
      idempotency_key: idempotencyKey.value,
      currency_code: currencyCode.value,
      description: description.value.trim() || undefined,
      installments: installments.value.map(item => ({ due_date: item.due_date, amount: Number(item.amount) }))
    })
    toast.add({
      title: 'Devolución programada',
      description: `Se crearon ${plan.installments.length} vales RETIRO en borrador por ${money(totalAmount.value)}.`,
      color: 'success'
    })
    installments.value = [{ due_date: '', amount: 0 }, { due_date: '', amount: 0 }]
    description.value = ''
    idempotencyKey.value = ''
    await loadDetails()
    emit('success')
  } catch (cause: any) {
    error.value = cause?.data?.message || cause?.message || 'No se pudo crear el plan.'
  } finally {
    saving.value = false
  }
}

function closeModal() {
  open.value = false
}

watch([open, selectedInvestorId, currencyCode], async ([isOpen]) => {
  if (!isOpen) return
  if (!investors.value.length && !loadingInvestors.value) await loadInvestors()
  await loadDetails()
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Programar devolución de inversión"
    description="Armá cuotas que quedarán como vales RETIRO en borrador."
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto' }"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-calendar-clock"
          title="Las cuotas no se pagan automáticamente"
          description="Cada cuota crea un vale RETIRO en borrador. Al confirmarlo, elegís caja o banco; recién entonces se registra la salida y se descuenta del aporte. Las cuotas programadas reservan ese saldo frente a retiros manuales."
        />

        <UAlert v-if="error" color="error" variant="subtle" :title="error" />

        <div class="grid gap-4 sm:grid-cols-[1fr_220px]">
          <UFormField label="Inversionista" required>
            <USelectMenu
              v-model="selectedInvestorId"
              :items="investorOptions"
              value-key="value"
              searchable
              :loading="loadingInvestors"
              :placeholder="investorOptions.length ? 'Seleccioná una persona' : 'No hay inversionistas activos'"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Moneda" required>
            <USelect v-model="currencyCode" :items="currencyOptions" class="w-full" />
          </UFormField>
        </div>

        <div v-if="selectedInvestor" class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-4">
          <div><p class="text-xs text-muted">Aportes confirmados</p><p class="font-medium">{{ money(funds?.contributions ?? 0) }}</p></div>
          <div><p class="text-xs text-muted">Retiros confirmados</p><p class="font-medium">{{ money(funds?.withdrawals ?? 0) }}</p></div>
          <div><p class="text-xs text-muted">Reservado en cuotas</p><p class="font-medium">{{ money(funds?.planned_withdrawals ?? 0) }}</p></div>
          <div><p class="text-xs text-muted">Disponible para planificar</p><p class="font-semibold text-primary">{{ money(funds?.available ?? 0) }}</p></div>
        </div>

        <UFormField label="Descripción (opcional)">
          <UInput v-model="description" placeholder="Ej.: devolución de inversión inicial" class="w-full" maxlength="200" />
        </UFormField>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold">Cuotas</h3>
              <p class="text-sm text-muted">Indicá el vencimiento y el importe de cada una. Las fechas deben estar ordenadas.</p>
            </div>
            <UButton label="Agregar cuota" icon="i-lucide-plus" variant="soft" :disabled="installments.length >= 120" @click="addInstallment" />
          </div>

          <div v-for="(installment, index) in installments" :key="index" class="grid items-end gap-3 rounded-lg border border-default p-3 sm:grid-cols-[100px_1fr_1fr_auto]">
            <div class="pb-2 text-sm font-medium">Cuota {{ index + 1 }}</div>
            <UFormField label="Vencimiento" required>
              <UInput v-model="installment.due_date" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Importe" required>
              <UInput v-model.number="installment.amount" type="number" min="0.01" step="0.01" class="w-full" />
            </UFormField>
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" :disabled="installments.length <= 2" :aria-label="`Quitar cuota ${index + 1}`" @click="removeInstallment(index)" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
          <div>
            <p class="text-sm text-muted">Total del plan</p>
            <p class="text-xl font-semibold">{{ money(totalAmount) }}</p>
          </div>
          <UButton
            label="Crear plan y vales en borrador"
            icon="i-lucide-calendar-plus"
            :loading="saving"
            :disabled="!canSave"
            @click="createPlan"
          />
        </div>

        <section v-if="selectedInvestor" class="flex flex-col gap-3 border-t border-default pt-5">
          <div>
            <h3 class="font-semibold">Planes registrados</h3>
            <p class="text-sm text-muted">El saldo pendiente refleja cuotas cuyo vale sigue en borrador.</p>
          </div>
          <p v-if="loadingDetails" class="text-sm text-muted">Cargando planes…</p>
          <p v-else-if="!plans.length" class="rounded-lg border border-dashed border-default p-4 text-sm text-muted">Todavía no hay planes para este inversionista.</p>
          <article v-for="plan in plans" :key="plan.id" class="rounded-xl border border-default p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-medium">{{ plan.description || 'Devolución de inversión' }}</p>
                <p class="text-sm text-muted">{{ plan.installments.length }} cuotas · Total {{ money(plan.total_amount) }} · Pendiente {{ money(plan.pending_amount) }}</p>
              </div>
              <UBadge :label="planStatus(plan.status)" :color="plan.status === 'COMPLETED' ? 'success' : plan.status === 'CANCELLED' ? 'neutral' : 'info'" variant="subtle" />
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div v-for="installment in plan.installments" :key="installment.id" class="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm">
                <span>Cuota {{ installment.installment_number }} · {{ dateLabel(installment.due_date) }} · Vale #{{ installment.vale.number }}</span>
                <span class="shrink-0 text-right">{{ money(installment.amount) }}<span class="block text-xs text-muted">{{ installmentStatus(installment.vale.status) }}</span></span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton label="Cerrar" color="neutral" variant="ghost" :disabled="saving" @click="closeModal" />
      </div>
    </template>
  </UModal>
</template>
