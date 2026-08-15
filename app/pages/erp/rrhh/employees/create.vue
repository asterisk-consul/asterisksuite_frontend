<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'
import { mapFormToEmployeeDto } from '~/modulos/erp/employees/mapper/employee.mapper'

const router = useRouter()
const store = useEmployeesStore()

const saving = ref(false)

// Check for pending user data from settings redirect
const pendingUser = ref<{ name: string; email: string; password: string } | null>(null)

onMounted(() => {
  const stored = localStorage.getItem('pendingUser')
  if (stored) {
    try {
      pendingUser.value = JSON.parse(stored)
      localStorage.removeItem('pendingUser')
    } catch {
      localStorage.removeItem('pendingUser')
    }
  }
})

const initialForm = computed(() => {
  const base: any = { type: 'EMPLOYEE', currency_code: 'ARS' }

  if (pendingUser.value) {
    const nameParts = pendingUser.value.name.split(' ')
    base.first_name = nameParts[0] || ''
    base.last_name = nameParts.slice(1).join(' ') || ''
    base.createUser = true
    base.user_name = pendingUser.value.name
    base.user_email = pendingUser.value.email
    base.user_password = pendingUser.value.password
  }

  return base
})

const handleSubmit = async (formData: FormType) => {
  try {
    saving.value = true
    const payload = mapFormToEmployeeDto(formData)
    await store.create(payload)
    await router.push('/erp/rrhh/employees')
  } catch (error) {
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 max-w-3xl mx-auto">
    <BusinessPartyForm
      :model-value="initialForm"
      :loading="saving"
      @submit="handleSubmit"
    />
  </div>
</template>
