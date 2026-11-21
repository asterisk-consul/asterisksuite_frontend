<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmColor?: 'primary' | 'warning' | 'error'
  icon?: string
  warningTitle?: string
  warningDescription?: string
  loading?: boolean
}>(), {
  confirmColor: 'primary',
  icon: 'i-lucide-circle-help',
  loading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const onOpenChange = (open: boolean) => {
  if (!open) emit('cancel')
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :dismissible="!loading"
    @update:open="onOpenChange"
  >
    <template #body>
      <div class="flex items-start gap-3 rounded-xl border border-default bg-muted/20 p-4">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-lg"
          :class="confirmColor === 'error' ? 'bg-error/10 text-error' : confirmColor === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'"
        >
          <UIcon :name="icon" class="size-5" />
        </div>
        <p class="pt-1 text-sm text-default">{{ description }}</p>
      </div>
      <UAlert
        v-if="warningDescription"
        :title="warningTitle || 'Revisá antes de continuar'"
        :description="warningDescription"
        :icon="icon"
        color="warning"
        variant="subtle"
      />
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="Volver" color="neutral" variant="ghost" :disabled="loading" @click="emit('cancel')" />
        <UButton :label="confirmLabel" :icon="icon" :color="confirmColor" :loading="loading" @click="emit('confirm')" />
      </div>
    </template>
  </UModal>
</template>
