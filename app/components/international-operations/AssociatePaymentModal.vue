<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { usePaymentsService } from '~/modulos/erp/payments/service/payments.service'

interface Props {
  open: boolean
  operationId: string
  excludePaymentIds?: string[]
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'associated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const service = usePaymentsService()

const loading = ref(false)

// USelectMenu guarda el objeto completo { label, value }
const selectedPayment = ref<{ label: string; value: string } | null>(null)
const selectedPaymentId = computed(() => selectedPayment.value?.value ?? null)

const payments = ref<Array<{
  id: string
  number: number
  date: string
  amount: number
  currency_code: string
  status: string
  payment_method: string
  party_name?: string
}>>([])

const fetchPayments = async () => {
  loading.value = true
  try {
    const pays = await service.findAll({ limit: 200 })
    payments.value = pays.map((p: any) => ({
      id: p.id,
      number: p.number,
      date: p.date,
      amount: Number(p.amount),
      currency_code: p.currency_code,
      status: p.status,
      payment_method: p.payment_method,
      party_name: p.party?.name
    })).filter(p => !props.excludePaymentIds?.includes(p.id))
  } catch (err) {
    console.error('Error fetching payments:', err)
  } finally {
    loading.value = false
  }
}

const paymentOptions = computed(() => payments.value.map(p => ({
  label: `Pago Nº ${String(p.number).padStart(8, '0')} — ${p.party_name || '—'} — ${p.currency_code} ${p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} — ${p.payment_method} — ${p.status}`,
  value: p.id
})))

watch(() => props.open, (open) => {
  if (open) {
    fetchPayments()
    selectedPayment.value = null
  }
})

const handleAssociate = async () => {
  if (!selectedPaymentId.value) return
  try {
    loading.value = true
    await $fetch(`/api/international-operations/${props.operationId}/payments`, {
      method: 'POST',
      body: { payment_id: selectedPaymentId.value }
    })
    emit('associated')
    emit('update:open', false)
  } catch (err) {
    console.error('Error associating payment:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="props.open"
    title="Asociar Pago"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Pago" name="payment_id" required>
          <USelectMenu
            v-model="selectedPayment"
            :items="paymentOptions"
            placeholder="Buscar y seleccionar pago..."
            searchable
            clear
            class="w-full"
            :disabled="loading"
          />
        </UFormField>

        <div v-if="loading" class="text-center py-4">
          <USkeleton class="h-8 w-48 mx-auto" />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton variant="ghost" @click="emit('update:open', false)" :disabled="loading">Cancelar</UButton>
      <UButton @click="handleAssociate" :disabled="loading || !selectedPaymentId">Asociar</UButton>
    </template>
  </UModal>
</template>