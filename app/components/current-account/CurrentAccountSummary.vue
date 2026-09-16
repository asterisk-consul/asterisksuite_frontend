<script setup lang="ts">
import { balanceColorClass, balanceLabel, creditCardColor, debitCardColor, creditCardBg, debitCardBg, balanceIconBg, balanceIconColor } from '~/modulos/erp/current-accounts/balance-utils'

const props = defineProps<{
  balance: number
  totalDebit: number
  totalCredit: number
  partyType?: string
  partyTypeLabel?: string
  accountCount?: number
}>()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

const bColor = computed(() => balanceColorClass(props.balance, props.partyType))
const bLabel = computed(() => balanceLabel(props.balance, props.partyType))
const creditColor = computed(() => creditCardColor(props.partyType))
const debitColor = computed(() => debitCardColor(props.partyType))
const creditBg = computed(() => creditCardBg(props.partyType))
const debitBg = computed(() => debitCardBg(props.partyType))
const iconBg = computed(() => balanceIconBg(props.balance, props.partyType))
const iconColor = computed(() => balanceIconColor(props.balance, props.partyType))
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
    <UPageCard variant="subtle" class="relative overflow-hidden lg:col-span-6">
      <div class="absolute -right-12 -top-12 size-40 rounded-full bg-primary/5" />
      <div class="relative flex min-h-32 items-center gap-5">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl" :class="iconBg">
          <UIcon name="i-lucide-scale" class="size-7" :class="iconColor" />
        </div>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Saldo actual</p>
            <UBadge :label="bLabel" variant="subtle" size="sm" />
          </div>
          <p class="mt-1 text-3xl font-bold tracking-tight" :class="bColor">{{ formatCurrency(balance) }}</p>
          <p class="mt-1 text-sm text-muted">
            {{ partyTypeLabel }}<span v-if="accountCount"> · {{ accountCount }} movimiento{{ accountCount === 1 ? '' : 's' }}</span>
          </p>
        </div>
      </div>
    </UPageCard>

    <UPageCard variant="subtle" class="lg:col-span-3">
      <div class="flex min-h-32 flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total débito</p>
          <div class="flex size-9 items-center justify-center rounded-xl" :class="debitBg">
            <UIcon name="i-lucide-arrow-up-right" class="size-4" :class="debitColor" />
          </div>
        </div>
        <div>
          <p class="text-xl font-bold" :class="debitColor">{{ formatCurrency(totalDebit) }}</p>
          <p class="mt-1 text-xs text-muted">Movimientos que incrementan el débito</p>
        </div>
      </div>
    </UPageCard>

    <UPageCard variant="subtle" class="lg:col-span-3">
      <div class="flex min-h-32 flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">Total crédito</p>
          <div class="flex size-9 items-center justify-center rounded-xl" :class="creditBg">
            <UIcon name="i-lucide-arrow-down-left" class="size-4" :class="creditColor" />
          </div>
        </div>
        <div>
          <p class="text-xl font-bold" :class="creditColor">{{ formatCurrency(totalCredit) }}</p>
          <p class="mt-1 text-xs text-muted">Movimientos que incrementan el crédito</p>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
