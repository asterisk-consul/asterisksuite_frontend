<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { SelectItem } from '@nuxt/ui'
import { usePerfiles } from '~/composables/usePerfiles'
import type { PropType } from 'vue'

// --- props ---
const props = defineProps({
  modelValue: {
    type: Number as PropType<number | null>,
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Seleccionar un perfil'
  },
  tipo: {
    type: Number as PropType<number | null>,
    default: null
  },
  categoriaid: {
    type: Number as PropType<number | null>,
    default: null
  }
})

// --- emits ---
const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
}>()

// --- v-model normalizado ---
const model = computed<number | null>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// --- composable perfiles ---
const perfiles = usePerfiles(props.tipo ?? undefined)
const loading = perfiles.loading

// --- cargar perfiles ---
onMounted(async () => {
  await perfiles.load(props.tipo ?? undefined, true)
})

// --- items filtrados ---
const items = computed<SelectItem[]>(() =>
  perfiles.selectOptions(props.categoriaid ?? undefined)
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="block">{{ label }}</label>

    <USelect
      v-model="model"
      :items="items"
      :loading="loading"
      :placeholder="placeholder"
      class="w-full"
      disable-portal
    />
  </div>
</template>
