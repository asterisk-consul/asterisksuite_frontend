<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { CompanyTaxJurisdiction, TaxJurisdiction } from '~/modulos/erp/fiscal/types/fiscal.types'

const toast = useToast()
const fiscalService = useFiscalService()
const jurisdictions = ref<TaxJurisdiction[]>([])
const existingRows = ref<CompanyTaxJurisdiction[]>([])
const rows = ref<CompanyTaxJurisdiction[]>([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const selectedJurisdictionId = ref('')
const availableJurisdictionOptions = computed(() => {
  const configuredIds = new Set(rows.value.map(row => row.jurisdiction_id))
  return jurisdictions.value
    .filter(jurisdiction => jurisdiction.is_active && !configuredIds.has(jurisdiction.id))
    .map(jurisdiction => ({
      label: `${jurisdiction.name} · ${jurisdiction.code}`,
      value: jurisdiction.id
    }))
})
const filteredRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('es')
  if (!query) return rows.value
  return rows.value.filter(row =>
    row.jurisdiction?.name.toLocaleLowerCase('es').includes(query) ||
    row.jurisdiction?.code.toLocaleLowerCase('es').includes(query)
  )
})

const load = async () => {
  loading.value = true
  try {
    const [loadedJurisdictions, loadedRows] = await Promise.all([
      fiscalService.getJurisdictions(),
      fiscalService.getCompanyJurisdictions()
    ])
    jurisdictions.value = loadedJurisdictions
    existingRows.value = loadedRows
    rows.value = loadedRows
      .filter(row => row.tax_type === 'IIBB')
      .map((current) => {
      const jurisdiction = loadedJurisdictions.find(item => item.id === current.jurisdiction_id)
      return {
        id: current.id,
        jurisdiction_id: current.jurisdiction_id,
        jurisdiction: current.jurisdiction ?? jurisdiction ?? null,
        tax_type: 'IIBB',
        is_withholding_agent: current.is_withholding_agent,
        is_perception_agent: current.is_perception_agent,
        registration_number: current.registration_number ?? null,
        default_perception_rate: current.default_perception_rate ?? null,
        default_retention_rate: current.default_retention_rate ?? null,
        valid_from: current.valid_from?.slice(0, 10) ?? null,
        valid_to: current.valid_to?.slice(0, 10) ?? null
      }
    })
  } catch (e: any) {
    toast.add({ title: 'Error cargando IIBB', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const addJurisdiction = () => {
  const jurisdiction = jurisdictions.value.find(item => item.id === selectedJurisdictionId.value)
  if (!jurisdiction) return
  rows.value.push({
    jurisdiction_id: jurisdiction.id,
    jurisdiction,
    tax_type: 'IIBB',
    is_withholding_agent: false,
    is_perception_agent: false,
    registration_number: null,
    default_perception_rate: null,
    default_retention_rate: null,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_to: null
  })
  selectedJurisdictionId.value = ''
}

const removeJurisdiction = (jurisdictionId: string) => {
  rows.value = rows.value.filter(row => row.jurisdiction_id !== jurisdictionId)
}

const save = async () => {
  saving.value = true
  try {
    const incomplete = rows.value.find(row => !row.is_perception_agent && !row.is_withholding_agent)
    if (incomplete) {
      toast.add({
        title: 'Seleccioná cómo actúa la empresa',
        description: `Indicá percepción y/o retención para ${incomplete.jurisdiction?.name ?? 'la jurisdicción'}.`,
        color: 'warning'
      })
      return
    }
    const otherTaxes = existingRows.value.filter(r => r.tax_type !== 'IIBB')
    await fiscalService.putCompanyJurisdictions([...otherTaxes, ...rows.value])
    toast.add({ title: 'Configuración de agente guardada', color: 'success' })
    await load()
  } catch (e: any) {
    toast.add({ title: 'Error guardando IIBB', description: e?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">IIBB de la empresa</h2>
          <p class="text-sm text-muted">Definí las jurisdicciones donde está inscripta la empresa y actúa como agente.</p>
        </div>
        <UButton label="Guardar jurisdicciones" icon="i-lucide-save" size="sm" :loading="saving" :disabled="loading" @click="save" />
      </div>
    </template>

    <UAlert
      color="info"
      variant="soft"
      class="mb-4"
      title="Configuración unificada"
      description="Primero habilitá la jurisdicción de la empresa. Debajo podés definir la regla y alícuota que se aplicará a clientes o proveedores inscriptos en la misma provincia."
    />

    <div class="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-dashed border-default p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <UFormField label="Agregar jurisdicción" description="Elegí únicamente las provincias donde la empresa está inscripta como agente.">
        <USelectMenu
          v-model="selectedJurisdictionId"
          :items="availableJurisdictionOptions"
          value-key="value"
          searchable
          placeholder="Buscar y seleccionar provincia..."
          class="w-full"
        />
      </UFormField>
      <UButton
        label="Agregar"
        icon="i-lucide-plus"
        class="justify-center"
        :disabled="!selectedJurisdictionId"
        @click="addJurisdiction"
      />
    </div>

    <div v-if="rows.length > 5" class="mb-3 flex items-center justify-between gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar entre las configuradas..."
        class="w-full"
      />
      <UBadge color="neutral" variant="soft">{{ rows.length }} configuradas</UBadge>
    </div>

    <div v-if="loading" class="py-8 text-center text-sm text-muted">Cargando…</div>
    <div v-else class="max-h-[390px] space-y-2 overflow-y-auto pr-1">
      <div v-if="filteredRows.length === 0" class="py-8 text-center text-sm text-muted">
        Todavía no agregaste jurisdicciones para la empresa.
      </div>
      <div v-for="row in filteredRows" :key="row.jurisdiction_id" class="grid min-h-[70px] grid-cols-1 gap-3 rounded-lg border border-default p-3 lg:grid-cols-12 lg:items-end">
        <div class="lg:col-span-2 lg:self-center">
          <p class="text-sm font-medium">{{ row.jurisdiction?.name }}</p>
          <p class="text-xs text-muted">{{ row.jurisdiction?.code }}</p>
        </div>
        <UFormField label="N.º inscripción" class="lg:col-span-2">
          <UInput v-model="row.registration_number" placeholder="Opcional" class="w-full" />
        </UFormField>
        <UFormField label="Percepción" class="lg:col-span-2"><USwitch v-model="row.is_perception_agent" /></UFormField>
        <UFormField label="Retención" class="lg:col-span-2"><USwitch v-model="row.is_withholding_agent" /></UFormField>
        <div class="grid grid-cols-[1fr_1fr_auto] gap-2 lg:col-span-4">
          <UFormField label="Desde"><UInput v-model="row.valid_from" type="date" class="w-full" /></UFormField>
          <UFormField label="Hasta"><UInput v-model="row.valid_to" type="date" class="w-full" /></UFormField>
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" class="self-end" aria-label="Quitar jurisdicción" @click="removeJurisdiction(row.jurisdiction_id)" />
        </div>
      </div>
    </div>
  </UCard>
</template>
