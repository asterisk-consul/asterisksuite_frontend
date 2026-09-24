<script setup lang="ts">
import { settingsCatalog } from '~/data/settingsCatalog'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })

const { hasPermission, init: initRoles } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const search = ref('')
const showAdvanced = ref(false)

const groups = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return settingsCatalog
    .map(group => ({
      ...group,
      entries: group.entries.filter(entry => {
        const allowed = !entry.permission || isOwnerOrAdmin.value || hasPermission(entry.permission)
        const visible = showAdvanced.value || !entry.advanced
        const matches = !term || `${group.label} ${entry.label} ${entry.description}`.toLocaleLowerCase('es').includes(term)
        return allowed && visible && matches
      })
    }))
    .filter(group => group.entries.length)
    .sort((a, b) => a.order - b.order)
})

const recommendedSteps = [
  { label: 'Empresa y fiscal', to: '/settings/company', icon: 'i-lucide-building-2' },
  { label: 'Documentos', to: '/settings/documents', icon: 'i-lucide-files' },
  { label: 'Tesorería', to: '/erp/treasury/cash-boxes', icon: 'i-lucide-wallet' },
  { label: 'Usuarios y permisos', to: '/settings/users', icon: 'i-lucide-users' }
]

onMounted(initRoles)
</script>

<template>
  <UPage class="space-y-6 px-4 pb-10">
    <AppPageHeader title="Centro de configuración" description="Configurá la empresa por módulos y encontrá rápidamente cada parámetro.">
      <template #actions><UButton label="Mi perfil" icon="i-lucide-user" to="/settings/profile" variant="outline" /></template>
    </AppPageHeader>

    <UCard class="overflow-hidden bg-gradient-to-br from-primary/10 via-default to-default">
      <div class="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><p class="text-xs font-semibold uppercase tracking-wide text-primary">Recorrido recomendado</p><h2 class="mt-1 text-xl font-semibold">Prepará la empresa sin perder pasos</h2><p class="mt-1 text-sm text-muted">Empezá por los datos generales y avanzá hacia documentos, tesorería y accesos.</p></div>
        <div class="flex flex-wrap gap-2"><UButton v-for="(step, index) in recommendedSteps" :key="step.to" :label="`${index + 1}. ${step.label}`" :icon="step.icon" :to="step.to" color="neutral" variant="soft" /></div>
      </div>
    </UCard>

    <div class="flex flex-col gap-3 rounded-xl border border-default bg-default p-4 md:flex-row md:items-end">
      <UFormField label="Buscar una configuración" description="Escribí qué necesitás configurar." class="flex-1"><UInput v-model="search" icon="i-lucide-search" placeholder="Ej.: remitos, impuestos, usuarios o cajas" size="lg" class="w-full"><template v-if="search" #trailing><UButton icon="i-lucide-x" variant="link" color="neutral" size="xs" @click="search = ''" /></template></UInput></UFormField>
      <div class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2.5"><div><p class="text-sm font-medium">Opciones avanzadas</p><p class="text-xs text-muted">Configuración técnica y recuperación.</p></div><USwitch v-model="showAdvanced" /></div>
    </div>

    <div v-if="groups.length" class="space-y-8">
      <section v-for="group in groups" :key="group.id" :id="group.id" class="space-y-3 scroll-mt-20">
        <div class="flex items-start gap-3"><div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon :name="group.icon" class="size-5" /></div><div><h2 class="font-semibold">{{ group.label }}</h2><p class="text-sm text-muted">{{ group.description }}</p></div></div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink v-for="entry in group.entries" :key="entry.to" :to="entry.to" class="group rounded-xl border border-default bg-default p-4 transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
            <div class="flex gap-3"><div class="rounded-lg bg-muted p-2 group-hover:bg-primary/10 group-hover:text-primary"><UIcon :name="entry.icon" class="size-5" /></div><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="font-medium">{{ entry.label }}</p><UBadge v-if="entry.advanced" label="Avanzado" color="neutral" variant="subtle" size="xs" /></div><p class="mt-1 text-sm text-muted">{{ entry.description }}</p></div><UIcon name="i-lucide-chevron-right" class="mt-1 size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" /></div>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div v-else class="rounded-xl border border-dashed border-default py-14 text-center"><UIcon name="i-lucide-search-x" class="mx-auto mb-3 size-10 text-muted" /><p class="font-medium">No encontramos esa configuración</p><p class="text-sm text-muted">Probá con otra palabra o activá las opciones avanzadas.</p><UButton label="Limpiar búsqueda" variant="link" @click="search = ''" /></div>
  </UPage>
</template>
