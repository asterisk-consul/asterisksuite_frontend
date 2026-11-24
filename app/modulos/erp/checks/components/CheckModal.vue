<script setup lang="ts">
import type { CheckFormData, BankAccountItem, BankConceptItem } from './CheckForm.vue'
import CheckForm from './CheckForm.vue'

const props = withDefaults(defineProps<{
  check?: CheckFormData
  loading?: boolean
  bankAccountItems?: BankAccountItem[]
  bankConceptItems?: BankConceptItem[]
  currencyItems?: BankAccountItem[]
  forcedType?: 'OWN' | 'THIRD_PARTY'
}>(), {
  bankAccountItems: () => [],
  bankConceptItems: () => [],
})

const emit = defineEmits<{
  success: [check: CheckFormData]
}>()

const open = defineModel<boolean>('open', { default: false })

const handleSubmit = (form: CheckFormData) => {
  if (props.loading) return
  emit('success', form)
}
</script>

<template>
  <UModal v-model:open="open" :title="check?.id ? 'Editar cheque' : 'Nuevo cheque'" description="Completá los datos bancarios, el importe y el vencimiento." :ui="{ content: 'sm:max-w-4xl' }">
    <template #body>
      <CheckForm
        :model-value="check"
        :loading="loading"
        :bank-account-items="bankAccountItems"
        :bank-concept-items="bankConceptItems"
        :currency-items="currencyItems"
        :forced-type="forcedType"
        @submit="handleSubmit"
        @cancel="open = false"
      />
    </template>
  </UModal>
</template>
