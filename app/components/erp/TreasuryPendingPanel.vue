<script setup lang="ts">
import type { TreasuryPending, TreasuryPendingKind, TreasuryPendingItem } from '~/modulos/erp/treasury-reports/types/treasury-reports.types'
import { formatCheckDate, getArgentinaDateKey, getCheckDateKey } from '~/modulos/erp/checks/utils/check-dates'

const props = defineProps<{ data: TreasuryPending | null; loading: boolean; error: boolean; canUpdatePayments: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
const configs = [
  { id: 'advances' as const, title: 'Anticipos y créditos por aplicar', icon: 'i-lucide-wallet-cards', description: 'Saldo disponible del mismo tercero para asociar a documentos.', to: '/erp/treasury/payments?pending=advances' },
  { id: 'drafts' as const, title: 'Pagos y cobros en borrador', icon: 'i-lucide-file-pen-line', description: 'Cargas pendientes de revisar y confirmar.', to: '/erp/treasury/payments?pending=drafts' },
  { id: 'obligations' as const, title: 'Obligaciones próximas o vencidas', icon: 'i-lucide-calendar-clock', description: 'Vencidas o con vencimiento dentro de los próximos 7 días.', to: '/erp/treasury/taxes-services?view=pending&dashboard_due=1' },
  { id: 'transfers' as const, title: 'Transferencias pendientes', icon: 'i-lucide-arrow-left-right', description: 'Transferencias registradas que todavía requieren confirmación.', to: '/erp/treasury/cash-box-transfers?status=pending' },
]
const groups = computed(() => configs.flatMap(config => {
  const group = props.data?.[config.id]
  return group && group.count > 0 ? [{ ...config, ...group }] : []
}))
const money = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', currencyDisplay: 'code' }).format(amount)
const totalLabel = (totals: Array<{ amount: number; currency_code: string }>) => totals.map(total => money(total.amount, total.currency_code)).join(' · ')
function destination(group: TreasuryPendingKind, item: TreasuryPendingItem) {
  if (group === 'transfers') return { path: '/erp/treasury/cash-box-transfers', query: { transferId: item.id } }
  if (group === 'obligations') return { path: '/erp/treasury/taxes-services', query: { view: 'pending', obligation_id: item.id } }
  return { path: `/erp/treasury/payments/${item.id}`, query: group === 'advances' && props.canUpdatePayments ? { apply: '1' } : {} }
}
function actionLabel(group: TreasuryPendingKind) {
  if (group === 'advances') return props.canUpdatePayments ? 'Aplicar' : 'Ver anticipo'
  if (group === 'drafts') return props.canUpdatePayments ? 'Continuar carga' : 'Ver borrador'
  return 'Revisar'
}
</script>

<template>
  <section class="flex flex-col gap-4" aria-label="Pendientes de tesorería">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-base font-semibold">Pendientes de tesorería</h2>
        <p class="text-sm text-muted">Trabajo por completar o saldos por aplicar, empezando por los registros más antiguos.</p>
      </div>
      <UButton label="Actualizar" icon="i-lucide-refresh-cw" size="xs" color="neutral" variant="ghost" :loading="loading" @click="emit('refresh')" />
    </div>
    <div v-if="loading && !data" class="grid gap-4 lg:grid-cols-2"><USkeleton v-for="n in 2" :key="n" class="h-40 rounded-lg" /></div>
    <UAlert v-else-if="error" color="warning" variant="subtle" icon="i-lucide-circle-alert" title="No se pudieron cargar los pendientes" description="Usá Actualizar para volver a consultar." />
    <div v-else-if="groups.length" class="grid items-start gap-4 lg:grid-cols-2">
      <UCard v-for="group in groups" :key="group.id">
        <template #header>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="flex items-center gap-2 text-sm font-semibold"><UIcon :name="group.icon" class="size-4 shrink-0 text-primary" />{{ group.title }}<UBadge color="neutral" size="xs" variant="subtle">{{ group.count }}</UBadge></h3>
              <p class="mt-1 text-xs text-muted">{{ group.description }}</p>
              <p class="mt-2 text-sm font-medium tabular-nums">{{ totalLabel(group.totals) }}</p>
              <p v-if="group.estimated_count" class="text-xs text-muted">Incluye {{ group.estimated_count }} importe(s) estimado(s).</p>
            </div>
            <UButton label="Ver todos" :to="group.to" size="xs" variant="ghost" class="shrink-0" />
          </div>
        </template>
        <ul class="divide-y divide-default">
          <li v-for="item in group.items" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0 flex-1 basis-40">
              <NuxtLink :to="destination(group.id, item)" class="text-sm font-medium text-primary hover:underline">{{ item.label }}</NuxtLink>
              <p class="truncate text-xs text-muted" :title="item.detail">{{ item.detail }}</p>
              <p class="mt-1 text-xs" :class="group.id === 'obligations' && getCheckDateKey(item.date) <= getArgentinaDateKey() ? 'text-warning' : 'text-muted'">
                {{ group.id === 'obligations' ? (getCheckDateKey(item.date) < getArgentinaDateKey() ? 'Venció' : 'Vence') : 'Fecha' }} {{ formatCheckDate(item.date) }}
                <span v-if="group.id === 'advances'"> · {{ item.kind === 'COLLECTION' ? 'Cobro a cuenta' : 'Pago a cuenta' }}</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-3">
              <div class="text-right"><p class="text-sm font-semibold tabular-nums">{{ money(item.amount, item.currency_code) }}</p><span v-if="item.estimated" class="text-xs text-muted">Estimado</span></div>
              <UButton :label="actionLabel(group.id)" :to="destination(group.id, item)" variant="soft" size="xs" />
            </div>
          </li>
        </ul>
      </UCard>
    </div>
    <p v-else class="rounded-lg border border-default px-4 py-5 text-sm text-muted">No hay pendientes en los grupos que podés consultar.</p>
  </section>
</template>
