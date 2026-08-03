<script setup lang="ts">
const props = defineProps<{
  balance: number
  totalDebit: number
  totalCredit: number
  currencyCode?: string
  partyType?: string
  partyTypeLabel?: string
  accountCount?: number
}>()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: props.currencyCode || 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

const balanceColor = computed(() => {
  if (props.balance > 0) return 'text-success'
  if (props.balance < 0) return 'text-error'
  return 'text-muted'
})

const balanceLabel = computed(() => {
  if (props.balance > 0) return 'A pagar'
  if (props.balance < 0) return 'A cobrar'
  return 'Saldo 0'
})
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <!-- TOTAL CRÉDITO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Total Crédito</p>
          <p class="text-lg font-bold text-success">{{ formatCurrency(totalCredit) }}</p>
          <p v-if="accountCount" class="text-xs text-muted">{{ accountCount }} cuentas</p>
        </div>
      </div>
    </UPageCard>

    <!-- TOTAL DÉBITO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-arrow-up-right" class="size-5 text-error" />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Total Débito</p>
          <p class="text-lg font-bold text-error">{{ formatCurrency(totalDebit) }}</p>
        </div>
      </div>
    </UPageCard>

    <!-- SALDO NETO -->
    <UPageCard variant="subtle">
      <div class="flex items-center gap-4">
        <div
          class="size-10 rounded-lg flex items-center justify-center shrink-0"
          :class="balance >= 0 ? 'bg-primary/10' : 'bg-warning/10'"
        >
          <UIcon
            name="i-lucide-scale"
            class="size-5"
            :class="balance >= 0 ? 'text-primary' : 'text-warning'"
          />
        </div>
        <div>
          <p class="text-xs text-muted font-medium uppercase">Saldo neto — {{ balanceLabel }}</p>
          <p class="text-lg font-bold" :class="balanceColor">
            {{ formatCurrency(balance) }}
          </p>
          <p v-if="partyTypeLabel" class="text-xs text-muted">{{ partyTypeLabel }}</p>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
