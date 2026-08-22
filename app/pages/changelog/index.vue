<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'changelog'
})

type ChangelogVersion = {
  tag: string
  title: string
  date: string
  body: any
  notes?: string
  changes?: any[]
  modules?: any[]
}

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
    result = result.filter(v => v.tag.includes(selectedStage.value))
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v =>
      v.tag.toLowerCase().includes(query) ||
      v.notes?.toLowerCase().includes(query)
    )
  }

  return result
})

function getBadge(version: string) {
  if (version.includes('alpha')) return { label: 'Alpha', color: 'warning' as const }
  if (version.includes('beta')) return { label: 'Beta', color: 'info' as const }
  if (version.includes('rc')) return { label: 'RC', color: 'primary' as const }
  return { label: 'Stable', color: 'success' as const }
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
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <UInput
            v-model="searchQuery"
            placeholder="Buscar versiones..."
            icon="i-lucide-search"
            :ui="{ root: 'w-64' }"
          />
          <USelectMenu
            v-model="selectedStage"
            :items="stages"
            placeholder="Filtrar por etapa"
            :ui="{ root: 'w-40' }"
          />
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
            <div class="prose prose-sm dark:prose-invert max-w-none">
              <MDCRenderer v-if="version.body" :body="version.body" />
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
