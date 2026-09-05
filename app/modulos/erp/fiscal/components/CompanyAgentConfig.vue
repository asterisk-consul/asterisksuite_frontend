<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { CompanyTaxJurisdiction, TaxJurisdiction } from '~/modulos/erp/fiscal/types/fiscal.types'

const toast = useToast()
const fiscalService = useFiscalService()

const jurisdictions = ref<TaxJurisdiction[]>([])
const rows = ref<CompanyTaxJurisdiction[]>([])
const loading = ref(false)
const saving = ref(false)

const TAX_TYPES = [
  { type: 'GANANCIAS', label: 'Ganancias' },
  { type: 'IIBB', label: 'Ingresos Brutos' },
  { type: 'SUSS', label: 'SUSS' },
  { type: 'IVA', label: 'IVA' }
]

const jurisdictionOptions = computed(() =>
  jurisdictions.value.map(j => ({ label: j.name, value: j.id }))
)

const rowFor = (taxType: string): CompanyTaxJurisdiction => {
  let row = rows.value.find(r => r.tax_type === taxType)
  if (!row) {
    row = {
      jurisdiction_id: '',
      tax_type: taxType,
      is_withholding_agent: false,
      is_perception_agent: false,
      registration_number: null
    }
    rows.value.push(row)
  }
  return row
}

const load = async () => {
  loading.value = true
  try {
    const [loadedJurisdictions, loadedRows] = await Promise.all([
      fiscalService.getJurisdictions(),
      fiscalService.getCompanyJurisdictions()
    ])
    jurisdictions.value = loadedJurisdictions
    rows.value = loadedRows.map(r => ({
      id: r.id,
      jurisdiction_id: r.jurisdiction_id,
      tax_type: r.tax_type,
      is_withholding_agent: r.is_withholding_agent,
      is_perception_agent: r.is_perception_agent,
      registration_number: r.registration_number
    }))
  } catch (e: any) {
    console.error('Error cargando config de agente:', e)
    toast.add({
      title: 'Error cargando configuración de agente',
      description: e?.data?.message ?? 'Verificá que la migración fiscal esté aplicada',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const save = async () => {
  // Solo enviar filas con jurisdicción o agente activo
  const toSave = rows.value.filter(
    r => r.jurisdiction_id && (r.is_withholding_agent || r.is_perception_agent)
  )
  if (toSave.length === 0) {
    toast.add({
      title: 'Nada para guardar',
      description: 'Activá al menos un impuesto y seleccioná jurisdicción.',
      color: 'warning'
    })
    return
  }

  const missingJurisdiction = rows.value.filter(
    r => (r.is_withholding_agent || r.is_perception_agent) && !r.jurisdiction_id
  )
  if (missingJurisdiction.length > 0) {
    toast.add({
      title: 'Jurisdicción requerida',
      description: 'Seleccioná la jurisdicción de inscripción para cada impuesto activado.',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    rows.value = await fiscalService.putCompanyJurisdictions(toSave)
    toast.add({
      title: 'Configuración de agente guardada',
      description: `${toSave.length} impuesto(s) configurado(s)`,
      color: 'success'
    })
  } catch (e: any) {
    console.error('Error guardando agente:', e)
    toast.add({
      title: 'Error guardando configuración',
      description: e?.data?.message ?? 'Intentá de nuevo',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">Agente de Retención</h2>
          <p class="text-sm text-muted">
            Impuestos por los que tu empresa retiene a proveedores al pagarles.
          </p>
        </div>
        <UButton
          label="Guardar"
          size="sm"
          :loading="saving"
          :disabled="loading"
          @click="save"
        />
      </div>
    </template>

    <div v-if="loading" class="text-center py-6 text-muted text-sm">Cargando…</div>

    <div v-else class="space-y-2">
      <div
        v-for="t in TAX_TYPES"
        :key="t.type"
        class="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-default"
      >
        <div class="col-span-3 font-medium text-sm">{{ t.label }}</div>
        <div class="col-span-3">
          <UCheckbox
            v-model="rowFor(t.type).is_withholding_agent"
            label="Retengo (agente)"
          />
        </div>
        <div class="col-span-3">
          <USelectMenu
            v-model="rowFor(t.type).jurisdiction_id"
            :items="jurisdictionOptions"
            value-key="value"
            size="sm"
            placeholder="Jurisdicción inscripción"
            searchable
            :disabled="!(rowFor(t.type).is_withholding_agent || rowFor(t.type).is_perception_agent)"
          />
        </div>
        <div class="col-span-3">
          <UInput
            v-model="rowFor(t.type).registration_number"
            size="sm"
            placeholder="N° inscripción (opcional)"
            :disabled="!(rowFor(t.type).is_withholding_agent || rowFor(t.type).is_perception_agent)"
          />
        </div>
      </div>

      <UAlert
        color="info"
        variant="soft"
        class="mt-3"
        title="Sin esto el motor no retiene"
        description="Si un impuesto no está activado acá, el motor de retenciones lo salta con el motivo 'no está configurada como agente'."
      />
    </div>
  </UCard>
</template>
