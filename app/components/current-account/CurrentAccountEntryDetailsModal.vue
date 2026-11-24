<script setup lang="ts">
import type { CurrentAccountEntry } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import {
  getCurrentAccountPaymentChecks,
  resolveCurrentAccountDescription,
  resolveCurrentAccountPaymentMethod,
  resolveCurrentAccountPaymentMethodSummary,
} from '~/modulos/erp/current-accounts/utils'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  entry: CurrentAccountEntry | null
  partyName?: string
  baseCurrency?: string
}>()

const payment = computed(() => props.entry?.payment ?? null)
const checks = computed(() => getCurrentAccountPaymentChecks(payment.value))
const checkApplications = computed(() => new Map(
  (payment.value?.payment_allocations ?? [])
    .filter(allocation => allocation.check)
    .map(allocation => [allocation.check!.id, Number(allocation.amount_applied)] as const),
))

const paymentStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', PAID: 'Pagado', REVERSED: 'Revertido', CANCELLED: 'Anulado',
}
const checkStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', CLEARED: 'Acreditado', BOUNCED: 'Rechazado', REJECTED: 'Rechazado', CANCELLED: 'Anulado',
}

const entryLabel = computed(() => props.entry
  ? ENTRY_TYPE_CONFIG[props.entry.type]?.label ?? props.entry.type
  : '')
const entryDescription = computed(() => resolveCurrentAccountDescription(props.entry?.description))

function formatCurrency(value: number | string | null | undefined, currency = 'ARS') {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const [year, month, day] = datePart.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}
</script>

<template>
  <UModal
    :open="open"
    title="Detalle del movimiento"
    :ui="{ content: 'sm:max-w-3xl' }"
    @update:open="open = $event"
  >
    <template #body>
      <div v-if="entry" class="space-y-5">
        <section class="grid gap-3 rounded-xl border border-default bg-elevated/40 p-4 sm:grid-cols-3">
          <div>
            <p class="text-xs text-muted">Movimiento</p>
            <UBadge :label="entryLabel" :color="(ENTRY_TYPE_CONFIG[entry.type]?.color as any) || 'neutral'" variant="subtle" />
          </div>
          <div><p class="text-xs text-muted">Fecha</p><p class="font-medium">{{ formatDate(entry.date) }}</p></div>
          <div><p class="text-xs text-muted">Cliente / proveedor</p><p class="font-medium">{{ partyName || '—' }}</p></div>
          <div><p class="text-xs text-muted">Importe original</p><p class="font-semibold">{{ formatCurrency(entry.amount, entry.currency_code) }}</p></div>
          <div><p class="text-xs text-muted">Importe en moneda base</p><p class="font-medium">{{ formatCurrency(entry.converted_amount ?? entry.amount, baseCurrency || 'ARS') }}</p></div>
          <div><p class="text-xs text-muted">Cotización</p><p class="font-medium">{{ entry.exchange_rate ?? '—' }}</p></div>
          <div><p class="text-xs text-muted">Saldo anterior</p><p class="font-medium">{{ formatCurrency(entry.balance_before, baseCurrency || 'ARS') }}</p></div>
          <div><p class="text-xs text-muted">Saldo posterior</p><p class="font-medium">{{ formatCurrency(entry.balance_after, baseCurrency || 'ARS') }}</p></div>
          <div><p class="text-xs text-muted">Registrado por</p><p class="font-medium">{{ entry.user_name || '—' }}</p></div>
          <p v-if="entryDescription" class="text-sm text-muted sm:col-span-3">{{ entryDescription }}</p>
        </section>

        <section v-if="payment" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold">{{ payment.type === 'COLLECTION' ? 'Cobro' : 'Pago' }} #{{ payment.number }}</h3>
            <div class="flex items-center gap-2">
              <UBadge :color="payment.deleted_at ? 'error' : payment.status === 'CONFIRMED' || payment.status === 'PAID' ? 'success' : 'neutral'" variant="subtle">
                {{ payment.deleted_at ? 'Eliminado' : paymentStatusLabels[payment.status] || payment.status }}
              </UBadge>
              <UButton
                :to="`/erp/treasury/payments/${payment.id}`"
                :label="payment.type === 'COLLECTION' ? 'Abrir cobro' : 'Abrir pago'"
                icon="i-lucide-arrow-up-right"
                size="xs"
                variant="outline"
              />
            </div>
          </div>

          <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><p class="text-xs text-muted">Medio de pago</p><p class="font-medium">{{ resolveCurrentAccountPaymentMethodSummary(payment) }}</p></div>
            <div><p class="text-xs text-muted">Fecha del pago</p><p class="font-medium">{{ formatDate(payment.payment_date || payment.date) }}</p></div>
            <div><p class="text-xs text-muted">Importe del pago / cobro</p><p class="font-medium">{{ formatCurrency(payment.amount, payment.currency_code) }}</p></div>
            <div v-if="payment.bank_account"><p class="text-xs text-muted">Cuenta bancaria</p><p class="font-medium">{{ payment.bank_account.bank_name }} · {{ payment.bank_account.name }}</p></div>
            <div v-if="payment.cash_box"><p class="text-xs text-muted">Caja</p><p class="font-medium">{{ payment.cash_box.name }}</p></div>
            <div v-if="payment.reference"><p class="text-xs text-muted">Referencia</p><p class="font-medium">{{ payment.reference }}</p></div>
            <div v-if="payment.exchange_rate"><p class="text-xs text-muted">Cotización del pago</p><p class="font-medium">{{ payment.exchange_rate }}</p></div>
            <p v-if="payment.description" class="text-sm text-muted sm:col-span-2 lg:col-span-3">{{ payment.description }}</p>
          </div>

          <div v-if="payment.documents?.length" class="space-y-2">
            <h4 class="text-sm font-medium">Comprobantes asociados</h4>
            <div v-for="application in payment.documents" :key="application.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default px-3 py-2 text-sm">
              <span>{{ application.document.document_types?.description || application.document.document_types?.code || 'Documento' }} #{{ application.document.number }} · {{ formatDate(application.document.date) }}</span>
              <span class="font-medium">Aplicado {{ formatCurrency(application.amount_applied, application.document.currency_code || payment.currency_code) }}</span>
            </div>
          </div>

          <div v-if="payment.payment_method === 'MIXED' && payment.tenders?.length" class="space-y-2">
            <h4 class="text-sm font-medium">Desglose de medios</h4>
            <div v-for="tender in payment.tenders" :key="tender.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default px-3 py-2 text-sm">
              <span>{{ resolveCurrentAccountPaymentMethod(tender.method) }}<template v-if="tender.cash_box"> · {{ tender.cash_box.name }}</template><template v-if="tender.bank_account"> · {{ tender.bank_account.bank_name }} · {{ tender.bank_account.name }}</template></span>
              <span class="font-medium">{{ formatCurrency(tender.amount, payment.currency_code) }}</span>
            </div>
          </div>

          <div v-if="checks.length" class="space-y-2">
            <h4 class="text-sm font-medium">Cheques asociados</h4>
            <article v-for="check in checks" :key="check.id" class="grid gap-3 rounded-xl border border-info/25 bg-info/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p class="text-xs text-muted">Cheque {{ check.is_own ? 'propio' : 'de terceros' }}</p><p class="font-semibold">N.º {{ check.check_number }}</p></div>
              <div><p class="text-xs text-muted">Banco emisor</p><p class="font-medium">{{ check.bank_name || '—' }}</p></div>
              <div><p class="text-xs text-muted">Emisor</p><p class="font-medium">{{ check.issuer_name || '—' }}</p></div>
              <div><p class="text-xs text-muted">Estado</p><p class="font-medium">{{ checkStatusLabels[check.status] || check.status }}</p></div>
              <div><p class="text-xs text-muted">Importe del cheque</p><p class="font-medium">{{ formatCurrency(check.amount, check.currency_code) }}</p></div>
              <div v-if="checkApplications.has(check.id)"><p class="text-xs text-muted">Aplicado a este pago</p><p class="font-medium">{{ formatCurrency(checkApplications.get(check.id), check.currency_code) }}</p></div>
              <div><p class="text-xs text-muted">Emisión / vencimiento</p><p class="font-medium">{{ formatDate(check.issue_date) }} / {{ formatDate(check.due_date) }}</p></div>
            </article>
          </div>
        </section>
      </div>
      <div v-else class="py-8 text-center text-sm text-muted">Seleccioná un movimiento para ver el detalle.</div>
    </template>
  </UModal>
</template>
