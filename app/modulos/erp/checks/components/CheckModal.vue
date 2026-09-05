<script setup lang="ts">
import type { CheckFormData, BankAccountItem } from './CheckForm.vue'
import CheckForm from './CheckForm.vue'

const props = withDefaults(defineProps<{
  check?: CheckFormData
  loading?: boolean
  bankAccountItems?: BankAccountItem[]
}>(), {
  bankAccountItems: () => [],
})

const emit = defineEmits<{
  success: [check: CheckFormData]
}>()

const open = defineModel<boolean>('open', { default: false })

const handleSubmit = (form: CheckFormData) => {
  emit('success', form)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="check?.id ? 'Editar cheque' : 'Nuevo cheque'" :ui="{ width: 'max-w-2xl' }">
    <template #body>
      <CheckForm
        :model-value="check"
        :loading="loading"
        :bank-account-items="bankAccountItems"
        @submit="handleSubmit"
        @cancel="open = false"
      />
    </template>
  </UModal>
</template>
