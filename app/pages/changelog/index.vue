<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'changelog'
})

type ChangelogVersion = {
  tag: string
  title: string
  date: string
  notes?: string | null
  message?: string | null
  changes: ChangelogChange[]
  modules: ChangelogModule[]
}

type ChangelogChange = {
  type: string
  scope?: string
  title: string
  description?: string
  id?: string
  url?: string
}

type ChangelogModule = { name: string, version: string }

const { data: versions } = await useFetch<ChangelogVersion[]>('/api/changelog')
const safeVersions = computed(() => versions.value || [])

const searchQuery = ref('')
const selectedStage = ref<string>('all')

const stages = [
  { label: 'Todas', value: 'all' },
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
  { label: 'RC', value: 'rc' },
  { label: 'Stable', value: 'stable' }
]

const filteredVersions = computed(() => {
  let result = safeVersions.value

  if (selectedStage.value !== 'all') {
    result = result.filter(v => v.tag?.includes(selectedStage.value))
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v =>
      v.tag?.toLowerCase().includes(query) ||
      v.notes?.toLowerCase().includes(query)
    )
  }

  return result
})

function getBadge(version = '') {
  if (version.includes('alpha')) return { label: 'Alpha', color: 'warning' as const }
  if (version.includes('beta')) return { label: 'Beta', color: 'info' as const }
  if (version.includes('rc')) return { label: 'RC', color: 'primary' as const }
  return { label: 'Stable', color: 'success' as const }
}

const changeTypes = [
  { value: 'feat', label: 'Novedades', icon: 'i-lucide-sparkles', color: 'text-primary' },
  { value: 'fix', label: 'Correcciones', icon: 'i-lucide-bug', color: 'text-error' },
  { value: 'refactor', label: 'Mejoras internas', icon: 'i-lucide-refresh-cw', color: 'text-info' },
  { value: 'perf', label: 'Rendimiento', icon: 'i-lucide-zap', color: 'text-warning' },
  { value: 'style', label: 'Diseño y experiencia', icon: 'i-lucide-palette', color: 'text-primary' },
  { value: 'compat', label: 'Compatibilidad', icon: 'i-lucide-blocks', color: 'text-info' },
  { value: 'docs', label: 'Documentación', icon: 'i-lucide-file-text', color: 'text-success' },
  { value: 'chore', label: 'Mantenimiento', icon: 'i-lucide-wrench', color: 'text-muted' }
]

function groupedChanges(changes: ChangelogChange[]) {
  return changeTypes
    .map(type => ({ ...type, items: changes.filter(change => change.type === type.value) }))
    .filter(group => group.items.length > 0)
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="border-b border-default bg-muted/30">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 class="text-4xl font-bold tracking-tight">Changelog</h1>
        <p class="mt-2 text-lg text-muted">Historial de cambios del sistema Asterisk Suite</p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UBadge label="Alpha" color="warning" variant="soft" size="sm" />
          <span class="text-sm text-muted">{{ safeVersions.length }} versiones publicadas</span>
        </div>
        <div class="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <UFormField label="Buscar cambios" class="w-full">
            <UInput
              v-model="searchQuery"
              placeholder="Versión o descripción..."
              icon="i-lucide-search"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Etapa" class="w-full">
            <USelect
              v-model="selectedStage"
              :items="stages"
              value-key="value"
              label-key="label"
              icon="i-lucide-list-filter"
              size="lg"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <UChangelogVersions
        :indicator-motion="false"
        :ui="{
          root: 'w-full',
          container: 'flex flex-col gap-y-12'
        }"
      >
        <UChangelogVersion
          v-for="version in filteredVersions"
          :key="version.tag"
          :title="`v${version.tag}`"
          :description="version.notes"
          :date="version.date"
          :badge="getBadge(version.tag)"
          :ui="{
            root: 'py-6',
            container: 'flex-1 w-full pl-12',
            header: 'border-b border-default pb-4 mb-4',
            title: 'text-2xl font-bold',
            date: 'text-sm text-muted',
            indicator: 'sticky top-4'
          }"
        >
          <template #body>
            <div class="space-y-6">
              <section v-for="group in groupedChanges(version.changes)" :key="group.value" class="space-y-3">
                <h3 class="flex items-center gap-2 text-base font-semibold">
                  <UIcon :name="group.icon" :class="['size-4', group.color]" />
                  {{ group.label }}
                </h3>
                <ul class="space-y-3">
                  <li
                    v-for="(change, index) in group.items"
                    :key="`${change.scope || 'general'}-${index}`"
                    class="flex gap-3 text-sm leading-6"
                  >
                    <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <a v-if="change.url" :href="change.url" class="font-medium text-primary hover:underline">
                        {{ change.id ? `${change.id} · ` : '' }}{{ change.title }}
                      </a>
                      <span v-else class="font-medium text-highlighted">{{ change.title }}</span>
                      <p v-if="change.description" class="mt-1 text-muted">{{ change.description }}</p>
                      <UBadge
                        v-if="change.scope"
                        :label="change.scope"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                        class="mt-1.5"
                      />
                    </div>
                  </li>
                </ul>
              </section>

              <section v-if="version.modules.length" class="space-y-3">
                <h3 class="flex items-center gap-2 text-base font-semibold">
                  <UIcon name="i-lucide-package" class="size-4 text-muted" />
                  Módulos
                </h3>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="module in version.modules"
                    :key="module.name"
                    color="neutral"
                    variant="subtle"
                    :label="`${module.name} · ${module.version}`"
                  />
                </div>
              </section>

              <p v-if="!version.changes.length && !version.modules.length" class="text-sm text-muted">
                Sin contenido detallado.
              </p>
            </div>
          </template>
        </UChangelogVersion>
      </UChangelogVersions>

      <!-- Empty state -->
      <div v-if="filteredVersions.length === 0" class="text-center py-16">
        <UIcon name="i-lucide-file-text" class="size-12 mx-auto text-muted mb-4" />
        <p class="text-muted">No hay versiones que coincidan con la búsqueda.</p>
      </div>
    </div>
  </div>
</template>
