<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BusinessPartyForm from '~/modulos/logistica/master-data/bussiness-parties/components/BusinessPartyForm.vue'
import type { BusinessPartyForm as FormType } from '~/modulos/logistica/master-data/bussiness-parties/types/bussines-parties.types'
import { useEmployeesStore } from '~/modulos/erp/employees/store/employees.store'
import { mapEmployeeToForm, mapFormToEmployeeDto } from '~/modulos/erp/employees/mapper/employee.mapper'

const route = useRoute()
const router = useRouter()
const store = useEmployeesStore()

const id = route.params.id as string
const saving = ref(false)
const loading = ref(true)
const formData = ref<FormType | null>(null)

onMounted(async () => {
  try {
    const data = await store.fetchOne(id)
    formData.value = mapEmployeeToForm(data)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async (form: FormType) => {
  try {
    saving.value = true
    const payload = mapFormToEmployeeDto(form)
    await store.update(id, payload)
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
    <div v-if="loading" class="text-center py-8">Cargando...</div>

    <BusinessPartyForm
      v-else-if="formData"
      :model-value="formData"
      :loading="saving"
      header-title="Editar Empleado"
      @submit="handleSubmit"
    />
  </div>
</template>
