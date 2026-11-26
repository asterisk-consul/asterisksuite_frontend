<script setup lang="ts">
defineProps<{ loading?: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const days = defineModel<number>({ required: true })
const emit = defineEmits<{ save: []; cancel: [] }>()
onBeforeUnmount(() => {
  if (open.value) emit('cancel')
  open.value = false
})
</script>

<template>
  <UPopover v-model:open="open">
    <UButton label="Configurar plazo de cheques" icon="i-lucide-settings-2" color="info" variant="soft" size="xs" class="self-start" />
    <template #content>
      <div class="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 p-4">
        <div>
          <p class="text-sm font-semibold">Avisos de vencimiento de cheques</p>
          <p class="mt-1 text-xs leading-5 text-muted">Elegí cuántos días antes del vencimiento se muestran los cheques. Las cantidades y los importes se actualizan como vista previa.</p>
        </div>
        <UFormField label="Días de anticipación para cheques" hint="Entre 1 y 365 días">
          <UInput v-model.number="days" type="number" :min="1" :max="365" :disabled="loading" class="w-full" @keyup.enter="emit('save')">
            <template #trailing><span class="text-xs text-muted">días</span></template>
          </UInput>
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" size="sm" :disabled="loading" @click="emit('cancel')" />
          <UButton label="Guardar" icon="i-lucide-check" size="sm" :loading="loading" @click="emit('save')" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
