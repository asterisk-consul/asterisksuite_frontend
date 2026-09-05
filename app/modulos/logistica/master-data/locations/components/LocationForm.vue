<script setup lang="ts">
import { reactive } from 'vue'

const emit = defineEmits<{
  submit: [data: any]
  cancel: []
}>()

const form = reactive({
  address: '',
  city: '',
  province: '',
  country: 'Argentina',
  postalCode: ''
})

function submit() {
  emit('submit', { ...form })
}
</script>

<template>
  <UForm :state="form" class="space-y-4" @submit="submit">
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Dirección" name="address">
        <UInput v-model="form.address" placeholder="Av. General Paz 1234" class="w-full" />
      </UFormField>

      <UFormField label="Ciudad" name="city">
        <UInput v-model="form.city" placeholder="Córdoba Capital" class="w-full" />
      </UFormField>

      <UFormField label="Provincia" name="province">
        <UInput v-model="form.province" placeholder="Córdoba" class="w-full" />
      </UFormField>

      <UFormField label="País" name="country">
        <UInput v-model="form.country" placeholder="Argentina" class="w-full" />
      </UFormField>

      <UFormField label="Código Postal" name="postalCode">
        <UInput v-model="form.postalCode" placeholder="5000" class="w-full" />
      </UFormField>
    </div>

    <div class="flex justify-end gap-2 pt-4">
      <UButton variant="soft" @click="emit('cancel')">Cancelar</UButton>
      <UButton type="submit" color="primary">Crear ubicación</UButton>
    </div>
  </UForm>
</template>
