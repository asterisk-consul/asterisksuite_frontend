<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import CashBoxForm from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'
import type { CashBoxFormData } from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'

const router = useRouter()
const { create, addUserRole } = useCashBoxes()
const toast = useToast()
const saving = ref(false)

const formRef = ref<InstanceType<typeof CashBoxForm> | null>(null)

const handleSubmit = async (formData: CashBoxFormData) => {
  if (saving.value) return
  saving.value = true
  try {
    const created = await create({
      name: formData.name,
      currency_code: formData.currency_code,
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
  } catch (error: any) {
    toast.add({
      title: 'No se pudo crear la caja',
      description: error?.data?.message || error?.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="mx-auto w-full max-w-5xl space-y-6">
    <AppPageHeader
      title="Nueva caja"
      description="Configurá la moneda, el saldo inicial y quiénes podrán operar con ella."
    />

    <div>
      <CashBoxForm
        ref="formRef"
        :is-edit="false"
        :loading="saving"
        @submit="handleSubmit"
        @cancel="router.push('/erp/treasury/cash-boxes')"
      />
    </div>
  </UPage>
</template>
