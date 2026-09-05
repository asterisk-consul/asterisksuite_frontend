<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import CashBoxForm from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'
import type { CashBoxFormData } from '~/modulos/erp/cash-boxes/components/CashBoxForm.vue'

const route = useRoute()
const router = useRouter()
const boxId = route.params.id as string
const toast = useToast()

const {
  current: box,
  fetchOne,
  update,
  loading
} = useCashBoxes()

const formRef = ref<InstanceType<typeof CashBoxForm> | null>(null)

const formData = ref<CashBoxFormData | null>(null)

onMounted(async () => {
  const data = await fetchOne(boxId)
  if (data) {
    formData.value = {
      name: data.name,
      currency_code: data.currency_code ?? 'ARS',
      type: data.type,
      opening_balance: Number(data.opening_balance),
      is_main: data.is_main,
      active: data.active
    }
    if (data.user_roles?.length) {
      await nextTick()
      await nextTick()
      formRef.value?.setBoxUsers(data.user_roles)
    }
  }
})

const handleSubmit = async (data: CashBoxFormData) => {
  try {
    await update(boxId, {
      name: data.name,
      type: data.type as any,
      opening_balance: data.opening_balance,
      is_main: data.is_main,
      active: data.active
    })
    toast.add({ title: 'Caja actualizada', color: 'success' })
    router.push(`/erp/treasury/cash-boxes/${boxId}`)
  } catch (error: any) {
    toast.add({ title: 'Error al guardar', description: error?.data?.message || error?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Editar caja"
      description="Modificar caja existente"
    />

    <div v-if="loading" class="flex justify-center py-8">
      <ULoader />
    </div>

    <div v-else-if="formData" class="max-w-3xl">
      <CashBoxForm
        ref="formRef"
        v-model="formData"
        :is-edit="true"
        :box-id="boxId"
        @submit="handleSubmit"
        @cancel="router.push(`/erp/treasury/cash-boxes/${boxId}`)"
      />
    </div>
  </UPage>
</template>
