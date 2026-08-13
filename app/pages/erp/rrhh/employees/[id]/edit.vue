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

const extraTabs = [
  { label: 'Datos Laborales', slot: 'employeeData' }
]

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
      :extra-tabs="extraTabs"
      header-title="Editar Empleado"
      @submit="handleSubmit"
    >
      <template #employeeData="{ form }">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Datos Laborales</h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Cargo" name="position">
                <UInput v-model="form.position" placeholder="Ej: Desarrollador" class="w-full" />
              </UFormField>

              <UFormField label="Departamento" name="department">
                <UInput v-model="form.department" placeholder="Ej: IT" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Fecha Ingreso" name="hire_date">
                <UInput v-model="form.hire_date" type="date" class="w-full" />
              </UFormField>

              <UFormField label="Sueldo" name="salary">
                <UInput v-model="form.salary" placeholder="0.00" type="number" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Moneda" name="currency_code">
              <USelectMenu
                v-model="form.currency_code"
                :items="[
                  { label: 'Pesos (ARS)', value: 'ARS' },
                  { label: 'Dólares (USD)', value: 'USD' }
                ]"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>
      </template>
    </BusinessPartyForm>
  </div>
</template>
