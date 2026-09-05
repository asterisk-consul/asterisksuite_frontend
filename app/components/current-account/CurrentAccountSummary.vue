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
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <!-- TOTAL CRÉDITO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-lg flex items-center justify-center shrink-0" :class="creditBg">
          <UIcon name="i-lucide-arrow-down-left" class="size-5" :class="creditColor" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Total Crédito</p>
          <p class="text-lg font-bold" :class="creditColor">{{ formatCurrency(totalCredit) }}</p>
          <p v-if="accountCount" class="text-xs text-muted">{{ accountCount }} movimientos</p>
        </div>
      </div>
    </UPageCard>

    <!-- TOTAL DÉBITO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-lg flex items-center justify-center shrink-0" :class="debitBg">
          <UIcon name="i-lucide-arrow-up-right" class="size-5" :class="debitColor" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Total Débito</p>
          <p class="text-lg font-bold" :class="debitColor">{{ formatCurrency(totalDebit) }}</p>
        </div>
      </div>
    </UPageCard>

    <!-- SALDO NETO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-lg flex items-center justify-center shrink-0" :class="iconBg">
          <UIcon name="i-lucide-scale" class="size-5" :class="iconColor" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Saldo neto — {{ bLabel }}</p>
          <p class="text-lg font-bold" :class="bColor">
            {{ formatCurrency(balance) }}
          </p>
          <p v-if="partyTypeLabel" class="text-xs text-muted">{{ partyTypeLabel }}</p>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
