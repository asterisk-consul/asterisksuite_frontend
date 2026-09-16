<script setup lang="ts">
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'

const props = defineProps<{ open: boolean; account: CurrentAccount; balance: number }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()
const toast = useToast()
const { addEntry } = useCurrentAccounts()
const loading = ref(false)
const targetBalance = ref(0)
const reason = ref('')
const date = ref(today())

watch(() => props.open, (open) => {
  if (open) {
    targetBalance.value = Number(props.balance)
    reason.value = ''
    date.value = today()
  }
})

const difference = computed(() => Number((targetBalance.value - Number(props.balance)).toFixed(2)))
const formatCurrency = (value: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 2,
}).format(value)

async function submit() {
  if (Math.abs(difference.value) < 0.01) {
    toast.add({ title: 'El saldo correcto es igual al saldo actual', color: 'warning' })
    return
  }
  if (!reason.value.trim()) {
    toast.add({ title: 'Indicá el motivo de la corrección', color: 'error' })
    return
  }
  try {
    loading.value = true
    await addEntry({
      party_id: props.account.party_id,
      party_type: props.account.party_type,
      currency_code: 'ARS',
      type: 'ADJUSTMENT',
      amount: Math.abs(difference.value),
      balance_effect: difference.value > 0 ? 'INCREASE' : 'DECREASE',
      description: reason.value.trim(),
      reference_type: 'manual_balance_correction',
      date: date.value,
    })
    toast.add({ title: 'Ajuste registrado', description: `Nuevo saldo: ${formatCurrency(targetBalance.value)}`, color: 'success' })
    emit('update:open', false)
    emit('saved')
  } catch (error: any) {
    toast.add({ title: 'No se pudo corregir el saldo', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Registrar ajuste de saldo"
    description="Indicá el saldo real y el sistema calculará el movimiento necesario."
    :ui="{ content: 'w-[calc(100vw-2rem)] max-w-xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-5">
        <div class="rounded-xl border border-info/30 bg-info/5 p-4">
          <div class="flex gap-3">
            <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0 text-info" />
            <div>
              <p class="font-medium">Este procedimiento no modifica el saldo inicial</p>
              <p class="mt-1 text-sm text-muted">
                Agrega un movimiento de ajuste con fecha y motivo para llevar la cuenta al saldo correcto y conservar el historial.
              </p>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UPageCard variant="subtle">
            <p class="text-xs text-muted">Saldo actual</p>
            <p class="text-lg font-semibold">{{ formatCurrency(balance) }}</p>
          </UPageCard>
          <UPageCard variant="subtle">
            <p class="text-xs text-muted">Ajuste calculado</p>
            <p class="text-lg font-semibold" :class="difference < 0 ? 'text-error' : 'text-success'">
              {{ difference > 0 ? '+' : '' }}{{ formatCurrency(difference) }}
            </p>
          </UPageCard>
        </div>
        <UFormField label="Saldo correcto" description="Podés ingresar un importe positivo, cero o negativo." required>
          <UInput v-model.number="targetBalance" type="number" step="0.01" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Fecha" required>
          <UInput v-model="date" type="date" size="lg" class="w-full" />
        </UFormField>
        <UFormField label="Motivo de la corrección" required>
          <UTextarea v-model="reason" placeholder="Ej.: corrección del saldo migrado" :rows="3" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" @click="emit('update:open', false)" />
        <UButton label="Registrar movimiento de ajuste" icon="i-lucide-check" :loading="loading" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
