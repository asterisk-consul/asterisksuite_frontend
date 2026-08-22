<script setup lang="ts">
defineProps<{
  form: Record<string, any>
}>()
</script>

<template>
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

      <USwitch v-model="form.is_salesperson" label="Es vendedor" />

      <UFormField v-if="form.is_salesperson" label="Comisión por defecto (%)" name="default_commission_rate">
        <UInput
          v-model.number="form.default_commission_rate"
          type="number"
          placeholder="0.00"
          :min="0"
          :max="100"
          class="w-full"
        />
      </UFormField>
    </div>
  </UCard>
</template>
