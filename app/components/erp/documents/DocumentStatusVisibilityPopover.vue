<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { isDocumentStatusHiddenByDefault } from '~/modulos/erp/documents/types/document-statuses'

export type DocumentStatusVisibilityOption = { value: number; label: string }
export type DocumentStatusVisibilityGroup = {
  category: string
  label: string
  direction?: 1 | -1
  options: DocumentStatusVisibilityOption[]
}

const props = defineProps<{ groups: DocumentStatusVisibilityGroup[] }>()
const hiddenStatusKeys = defineModel<string[]>('hiddenStatusKeys', { default: () => [] })
const auth = useAuthStore()
const route = useRoute()
const knownStatusKeys = ref<string[]>([])
const storageReady = ref(false)
const loadedStorageKey = ref<string | null>(null)

const statusEntries = computed(() => props.groups.flatMap(group => group.options.map(option => ({
  key: `${group.category}:${option.value}`,
  defaultHidden: isDocumentStatusHiddenByDefault(group.category, option.value, group.direction ?? 1),
}))))
const allKeys = computed(() => statusEntries.value.map(entry => entry.key))
const allKeysSignature = computed(() => allKeys.value.join('|'))
const preferenceStorageKey = computed(() => {
  const companyId = auth.selectedCompany?.id
  const userId = auth.user?.id
  if (!companyId || !userId) return ''
  return `asterisk:document-status-visibility:${companyId}:${userId}:${route.path}`
})
const hiddenCount = computed(() => hiddenStatusKeys.value.filter(key => allKeys.value.includes(key)).length)

function applyDefaultsToUnknownStatuses() {
  const known = new Set(knownStatusKeys.value)
  const hidden = new Set(hiddenStatusKeys.value)
  for (const entry of statusEntries.value) {
    if (known.has(entry.key)) continue
    known.add(entry.key)
    if (entry.defaultHidden) hidden.add(entry.key)
  }
  knownStatusKeys.value = [...known]
  hiddenStatusKeys.value = [...hidden]
}

function savePreferences() {
  const key = preferenceStorageKey.value
  if (!import.meta.client || !storageReady.value || !key) return
  try {
    localStorage.setItem(key, JSON.stringify({
      version: 1,
      hiddenKeys: hiddenStatusKeys.value,
      knownKeys: knownStatusKeys.value,
    }))
  } catch {
    // La visibilidad sigue funcionando aunque el navegador no permita guardar preferencias.
  }
}

function restorePreferences() {
  if (!import.meta.client) return
  const key = preferenceStorageKey.value
  if (!key) {
    storageReady.value = false
    loadedStorageKey.value = null
    knownStatusKeys.value = []
    hiddenStatusKeys.value = []
    applyDefaultsToUnknownStatuses()
    return
  }
  if (loadedStorageKey.value === key) return

  storageReady.value = false
  let saved: { hiddenKeys?: unknown; knownKeys?: unknown } | null = null
  try {
    const raw = localStorage.getItem(key)
    if (raw) saved = JSON.parse(raw)
  } catch {
    saved = null
  }

  const hiddenKeys = Array.isArray(saved?.hiddenKeys)
    ? saved.hiddenKeys.filter((value): value is string => typeof value === 'string')
    : []
  const knownKeys = Array.isArray(saved?.knownKeys)
    ? saved.knownKeys.filter((value): value is string => typeof value === 'string')
    : []
  hiddenStatusKeys.value = hiddenKeys
  knownStatusKeys.value = knownKeys
  applyDefaultsToUnknownStatuses()
  loadedStorageKey.value = key
  storageReady.value = true
  savePreferences()
}

watch(allKeysSignature, () => {
  applyDefaultsToUnknownStatuses()
  savePreferences()
}, { immediate: true })
watch(preferenceStorageKey, restorePreferences)
watch([hiddenStatusKeys, knownStatusKeys], savePreferences, { deep: true })
onMounted(restorePreferences)

function isVisible(key: string) {
  return !hiddenStatusKeys.value.includes(key)
}

function setVisibility(key: string, visible: boolean) {
  const next = new Set(hiddenStatusKeys.value)
  if (visible === true) next.delete(key)
  else next.add(key)
  hiddenStatusKeys.value = [...next]
}

function setAllVisible(visible: boolean) {
  const current = new Set(hiddenStatusKeys.value)
  for (const key of allKeys.value) {
    if (visible) current.delete(key)
    else current.add(key)
  }
  hiddenStatusKeys.value = [...current]
}
</script>

<template>
  <UPopover v-if="allKeys.length" :content="{ align: 'end', sideOffset: 8 }">
    <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-list-filter" aria-label="Configurar estados visibles">
      <span>Estados</span>
      <UBadge v-if="hiddenCount" :label="`${hiddenCount} oculto${hiddenCount === 1 ? '' : 's'}`" color="warning" variant="soft" size="xs" />
    </UButton>

    <template #content>
      <div class="flex max-h-[min(70vh,36rem)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto overscroll-contain p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">Estados visibles</p>
            <p class="text-xs text-muted">Apagá el interruptor de los estados que querés ocultar.</p>
          </div>
          <div class="flex shrink-0 gap-1">
            <UButton label="Todos" color="neutral" variant="ghost" size="xs" :disabled="hiddenCount === 0" @click="setAllVisible(true)" />
            <UButton label="Ninguno" color="neutral" variant="ghost" size="xs" :disabled="hiddenCount === allKeys.length" @click="setAllVisible(false)" />
          </div>
        </div>

        <section v-for="group in groups" :key="group.category" class="flex flex-col gap-1 border-t border-default pt-2 first:border-0 first:pt-0">
          <p class="text-xs font-semibold text-muted">{{ group.label }}</p>
          <label v-for="option in group.options" :key="`${group.category}:${option.value}`" class="flex cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-2 text-sm hover:bg-elevated">
            <span>{{ option.label }}</span>
            <USwitch
              :model-value="isVisible(`${group.category}:${option.value}`)"
              :aria-label="`Mostrar ${option.label}`"
              @update:model-value="setVisibility(`${group.category}:${option.value}`, $event)"
            />
          </label>
        </section>
      </div>
    </template>
  </UPopover>
</template>
