<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const router = useRouter()
const partners = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const selectedPartyId = ref('')
const search = ref('')

onMounted(async () => {
  try {
    partners.value = await $fetch<any[]>('/api/backend/hr/partner-report-options')
  } catch (error: any) {
    loadError.value = error?.data?.message || error?.message || 'No se pudo cargar la lista de socios.'
  } finally {
    loading.value = false
  }
})

const partnerOptions = computed(() => partners.value
  .map((partner: any) => ({
    label: partner.name,
    value: partner.party_id,
    description: partner.document_number ? `${partner.document_type ?? 'Documento'} ${partner.document_number}` : undefined
  })))

const filteredPartners = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  if (!term) return partnerOptions.value
  return partnerOptions.value.filter(partner =>
    `${partner.label} ${partner.description ?? ''}`.toLocaleLowerCase('es').includes(term)
  )
})

function openReport(partyId = selectedPartyId.value) {
  if (partyId) router.push(`/erp/rrhh/reports/socio/${partyId}`)
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Reporte de socios"
      description="ElegÃ­ un socio para consultar sus aportes, retiros y evoluciÃ³n por moneda."
    />

    <UPageCard variant="subtle" class="max-w-3xl">
      <div class="space-y-4">
        <div>
          <h2 class="font-semibold">Seleccionar socio</h2>
          <p class="text-sm text-muted mt-1">El reporte mantiene separados los movimientos en pesos y dÃ³lares.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <USelectMenu
            v-model="selectedPartyId"
            :items="partnerOptions"
            value-key="value"
            label-key="label"
            placeholder="Buscar por nombre o documento..."
            :loading="loading"
            class="flex-1"
          />
          <UButton
            label="Ver reporte"
            icon="i-lucide-bar-chart-3"
            :disabled="!selectedPartyId"
            @click="openReport()"
          />
        </div>
      </div>
    </UPageCard>

    <UPageCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p class="font-medium">Socios activos</p>
            <p class="text-sm text-muted">TambiÃ©n podÃ©s abrir el reporte directamente desde esta lista.</p>
          </div>
          <UInput v-model="search" icon="i-lucide-search" placeholder="Filtrar socios..." class="sm:w-72" />
        </div>
      </template>

      <UAlert v-if="loadError" color="error" variant="subtle" title="No se pudieron cargar los socios" :description="loadError" />
      <div v-else-if="loading" class="py-10 text-center text-muted">Cargando socios...</div>
      <div v-else-if="!filteredPartners.length" class="py-10 text-center text-muted">No se encontraron socios activos.</div>
      <div v-else class="divide-y divide-default">
        <button
          v-for="partner in filteredPartners"
          :key="partner.value"
          type="button"
          class="w-full flex items-center justify-between gap-4 px-2 py-3 text-left hover:bg-muted/40 rounded-md transition-colors"
          @click="openReport(partner.value)"
        >
          <div class="min-w-0">
            <p class="font-medium truncate">{{ partner.label }}</p>
            <p v-if="partner.description" class="text-sm text-muted truncate">{{ partner.description }}</p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
        </button>
      </div>
    </UPageCard>
  </UPage>
</template>
