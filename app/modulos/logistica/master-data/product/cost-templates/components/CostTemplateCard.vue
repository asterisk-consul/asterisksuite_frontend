<script setup lang="ts">
import { useCostTemplates } from '../composables/useCostTemplates'
import type { CostTemplate } from '../types/cost-template.types'

const props = defineProps<{
  productId: string
  templateId: string | null
}>()

const emit = defineEmits<{
  change: []
  removed: []
}>()

const {
  getTemplateById,
  getTypeLabel,
  getTypeColor,
  getValueTypeLabel,
  formatComponentValue,
  removeTemplateFromProduct,
  loading
} = useCostTemplates()

const template = computed<CostTemplate | undefined>(() =>
  props.templateId ? getTemplateById(props.templateId) : undefined
)

const handleRemove = async () => {
  await removeTemplateFromProduct(props.productId)
  emit('removed')
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-rectangle-stack" class="size-4 text-muted" />
          <span class="text-sm font-medium">Template de costo</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="outline"
            color="neutral"
            icon="i-heroicons-arrows-right-left"
            @click="emit('change')"
          >
            Cambiar
          </UButton>
          <UButton
            v-if="template"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-heroicons-x-mark"
            :loading="loading"
            @click="handleRemove"
          />
        </div>
      </div>
    </template>

    <!-- Sin template -->
    <div v-if="!template" class="flex flex-col items-center gap-2 py-4 text-center">
      <UIcon name="i-heroicons-rectangle-stack" class="size-8 text-muted" />
      <p class="text-sm text-muted">Sin template asignado</p>
      <p class="text-xs text-muted">Se usará el template predeterminado o los porcentajes base.</p>
      <UButton size="xs" variant="soft" @click="emit('change')">Asignar template</UButton>
    </div>

    <!-- Con template -->
    <div v-else class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="font-semibold">{{ template.name }}</span>
        <UBadge v-if="template.is_default" label="Default" color="primary" variant="subtle" size="xs" />
      </div>

      <p v-if="template.description" class="text-xs text-muted">
        {{ template.description }}
      </p>

      <!-- Componentes del template -->
      <div class="space-y-1.5">
        <div
          v-for="tc in template.components"
          :key="tc.id"
          class="flex items-center justify-between rounded-md border border-default px-3 py-2"
        >
          <div class="flex items-center gap-2">
            <UBadge
              :label="getTypeLabel(tc.component.type)"
              :color="getTypeColor(tc.component.type)"
              variant="subtle"
              size="xs"
            />
            <span class="text-sm">{{ tc.component.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">
              {{ getValueTypeLabel(tc.component.value_type) }}
            </span>
            <span class="text-sm font-medium tabular-nums">
              {{ formatComponentValue(tc.component.value_type, tc.component.value, tc.value_override) }}
            </span>
            <UBadge v-if="tc.value_override !== null" label="Override" color="warning" variant="subtle" size="xs" />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
