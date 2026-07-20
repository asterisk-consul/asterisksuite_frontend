<script setup lang="ts">
definePageMeta({
  layout: 'treasury',
  middleware: ['auth']
})

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import CashBoxForm from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'
import type { CashBoxFormData } from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'

const router = useRouter()
const { create, addUserRole } = useCashBoxes()

const formRef = ref<InstanceType<typeof CashBoxForm> | null>(null)

const handleSubmit = async (formData: CashBoxFormData) => {
  try {
    const created = await create({
      name: formData.name,
      type: formData.type as any,
      opening_balance: formData.opening_balance,
      is_main: formData.is_main,
      active: formData.active
    })

    if (created?.id && formRef.value?.pendingUsers) {
      for (const p of formRef.value.pendingUsers) {
        await addUserRole(created.id, p.userId, p.role)
      }
    }

    router.push('/erp/treasury/cash-boxes')
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Nueva caja"
      description="Crear una nueva caja"
    />

    <div class="max-w-3xl">
      <CashBoxForm
        ref="formRef"
        :is-edit="false"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/cash-boxes')"
      />
    </div>
  </UPage>
</template>
