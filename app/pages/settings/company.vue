<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompaniesStore } from '~/modulos/companies/store/company.store'
import { useCompanyRole } from '~/composables/useCompanyRole'

const auth = useAuthStore()
const companyStore = useCompaniesStore()
const toast = useToast()
const { isOwnerOrAdmin } = useCompanyRole()

const loadingData = ref(true)
const saving = ref(false)

const companySchema = z.object({
  name: z.string().min(2, 'Muy corto'),
  taxId: z.string().optional(),
  vat_condition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal(''))
})

type CompanySchema = z.output<typeof companySchema>

const form = reactive<CompanySchema>({
  name: '',
  taxId: '',
  vat_condition: undefined,
  address: '',
  phone: '',
  email: ''
})

const vatConditionOptions = [
  { label: 'Responsable Inscripto', value: 'RESPONSABLE_INSCRIPTO' },
  { label: 'Monotributo', value: 'MONOTRIBUTO' },
  { label: 'Exento', value: 'EXENTO' }
]

const companyId = computed(() => auth.selectedCompany?.id ?? '')

onMounted(async () => {
  if (!companyId.value) {
    loadingData.value = false
    return
  }

  try {
    const company = await companyStore.fetchOne(companyId.value)
    form.name = company.name ?? ''
    form.taxId = company.tax_id ?? ''
    form.vat_condition = (company.vat_condition as any) ?? undefined
    form.address = company.address ?? ''
    form.phone = company.phone ?? ''
    form.email = company.email ?? ''
  } catch (e: any) {
    toast.add({
      title: 'Error al cargar empresa',
      description: e?.data?.message || 'No se pudo obtener la información',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    loadingData.value = false
  }
})

async function onSubmit(event: FormSubmitEvent<CompanySchema>) {
  if (!companyId.value) return

  saving.value = true
  try {
    const payload = {
      ...event.data,
      email: event.data.email || undefined
    }
    await companyStore.update(companyId.value, payload)
    toast.add({
      title: 'Empresa actualizada',
      description: 'Los cambios fueron guardados correctamente',
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Error al actualizar',
      description: e?.data?.message || 'No se pudieron guardar los cambios',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Empresa" description="Información general de la empresa" />

    <UAlert
      v-if="!isOwnerOrAdmin"
      color="warning"
      icon="i-lucide-shield-alert"
      title="Sin permisos"
      description="Solo los usuarios con rol OWNER o ADMIN pueden editar la información de la empresa."
    />

    <div v-if="loadingData" class="flex justify-center py-8">
      <ULoader />
    </div>

    <template v-else>
      <UForm
        id="company-form"
        :schema="companySchema"
        :state="form"
        :disabled="!isOwnerOrAdmin"
        @submit="onSubmit"
      >
        <UPageCard
          title="Datos de la empresa"
          description="Información fiscal y de contacto."
          variant="naked"
          orientation="horizontal"
          class="mb-4"
        >
          <UButton
            v-if="isOwnerOrAdmin"
            form="company-form"
            label="Guardar cambios"
            color="neutral"
            type="submit"
            :loading="saving"
            class="w-fit lg:ms-auto"
          />
        </UPageCard>

        <UPageCard variant="subtle">
          <UFormField
            label="Nombre"
            description="Nombre oficial de la empresa."
            required
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="form.name" placeholder="Nombre de la empresa" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            label="CUIT / Nro. Identificación"
            description="Número de identificación fiscal."
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="form.taxId" placeholder="20-12345678-9" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            label="Condición IVA"
            description="Condición frente al IVA."
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <USelect
              v-model="form.vat_condition"
              :items="vatConditionOptions"
              placeholder="Seleccionar condición"
              class="w-full max-w-xs"
            />
          </UFormField>
          <USeparator />
          <UFormField
            label="Dirección"
            description="Domicilio fiscal."
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="form.address" placeholder="Av. Principal 1234" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            label="Teléfono"
            description="Número de contacto."
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="form.phone" placeholder="+54 11 1234-5678" autocomplete="off" />
          </UFormField>
          <USeparator />
          <UFormField
            label="Email"
            description="Correo electrónico de la empresa."
            class="flex max-sm:flex-col justify-between items-start gap-4"
          >
            <UInput v-model="form.email" type="email" placeholder="empresa@ejemplo.com" autocomplete="off" />
          </UFormField>
        </UPageCard>
      </UForm>
    </template>
  </UPage>
</template>
