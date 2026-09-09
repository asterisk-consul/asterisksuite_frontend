<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type {
  BusinessPartyIibbRegistration,
  BusinessPartyWithholdingProfile,
  TaxJurisdiction,
} from '~/modulos/erp/fiscal/types/fiscal.types'

const props = defineProps<{
  partyId?: string
}>()
const vatCondition = defineModel<string>('vatCondition', { default: 'CF' })
const exemptionRate = defineModel<number>('exemptionRate', { default: 0 })
const activeSection = ref<'vat' | 'iibb' | 'withholdings'>('vat')
const sectionTabs = [
  { label: 'IVA', value: 'vat', icon: 'i-lucide-percent' },
  { label: 'Ingresos Brutos', value: 'iibb', icon: 'i-lucide-map-pinned' },
  { label: 'Retenciones y otros', value: 'withholdings', icon: 'i-lucide-receipt-text' }
]
const vatConditionOptions = [
  { label: 'Responsable Inscripto', value: 'RI' },
  { label: 'Monotributista', value: 'MONO' },
  { label: 'Consumidor Final', value: 'CF' },
  { label: 'Exento', value: 'EX' }
]

const toast = useToast()
const fiscalService = useFiscalService()

// ─── Perfiles de sujeto pasible ──────────────────────────────
const profiles = ref<BusinessPartyWithholdingProfile[]>([])
const profilesLoading = ref(false)

const defaultProfile = (taxType: string): BusinessPartyWithholdingProfile => ({
  tax_type: taxType,
  is_subject: true,
  status: 'NORMAL',
  is_pyme: false,
  observations: null
})

const statusOptions = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Exento', value: 'EXENTO' },
  { label: 'No sujeto', value: 'NO_SUJETO' },
  { label: 'Certificado de no retención', value: 'CERTIFICADO_NO_RETENCION' }
]

const TAX_TYPES = [
  { type: 'GANANCIAS', label: 'Ganancias' },
  { type: 'IIBB', label: 'Ingresos Brutos' },
  { type: 'SUSS', label: 'SUSS' }
]

// ─── Inscripciones IIBB ──────────────────────────────────────
const registrations = ref<BusinessPartyIibbRegistration[]>([])
const jurisdictions = ref<TaxJurisdiction[]>([])
const registrationsLoading = ref(false)
const showAdvancedIibb = ref(false)

const registrationTypeOptions = [
  { label: 'Directo', value: 'DIRECTO' },
  { label: 'Convenio Multilateral', value: 'CONVENIO_MULTILATERAL' },
  { label: 'No inscripto', value: 'NO_INSCRIPTO' },
  { label: 'Exento', value: 'EXENTO' }
]

const jurisdictionOptions = computed(() =>
  jurisdictions.value.map(j => ({ label: j.name, value: j.id }))
)

const cmTotal = computed(() =>
  registrations.value
    .filter(r => r.registration_type === 'CONVENIO_MULTILATERAL')
    .reduce((s, r) => s + (Number(r.prorrate_percentage) || 0), 0)
)

const cmRowsCount = computed(() =>
  registrations.value.filter(r => r.registration_type === 'CONVENIO_MULTILATERAL').length
)

const addRegistration = () => {
  registrations.value.push({
    registration_type: 'DIRECTO',
    jurisdiction_id: null,
    registration_number: null,
    prorrate_percentage: null,
    perception_rate: null,
    retention_rate: null,
    valid_from: null,
    valid_to: null,
    source: 'MANUAL',
    is_active: true
  })
}

const removeRegistration = (i: number) => {
  registrations.value.splice(i, 1)
}

// ─── Carga y guardado ────────────────────────────────────────
const loadAll = async () => {
  if (!props.partyId) return
  profilesLoading.value = true
  registrationsLoading.value = true
  try {
    const [loadedProfiles, loadedRegistrations, loadedJurisdictions] = await Promise.all([
      fiscalService.getPartyWithholdingProfiles(props.partyId),
      fiscalService.getPartyIibbRegistrations(props.partyId),
      fiscalService.getJurisdictions()
    ])
    jurisdictions.value = loadedJurisdictions

    // Perfiles: precargar los 3 tipos estándar si no existen
    profiles.value = TAX_TYPES.map(({ type }) => {
      const existing = loadedProfiles.find(p => p.tax_type === type)
      return existing ?? defaultProfile(type)
    })

    registrations.value = loadedRegistrations.map(r => ({
      id: r.id,
      registration_type: r.registration_type,
      jurisdiction_id: r.jurisdiction_id,
      registration_number: r.registration_number,
      prorrate_percentage: r.prorrate_percentage != null ? Number(r.prorrate_percentage) : null,
      perception_rate: r.perception_rate != null ? Number(r.perception_rate) : null,
      retention_rate: r.retention_rate != null ? Number(r.retention_rate) : null,
      valid_from: r.valid_from?.slice(0, 10) ?? null,
      valid_to: r.valid_to?.slice(0, 10) ?? null,
      source: r.source ?? 'MANUAL',
      is_active: r.is_active
    }))
  } catch (e: any) {
    console.error('Error cargando perfil fiscal:', e)
    toast.add({
      title: 'Error cargando perfil fiscal',
      description: e?.data?.message ?? 'Verificá que el backend esté corriendo',
      color: 'error'
    })
  } finally {
    profilesLoading.value = false
    registrationsLoading.value = false
  }
}

const saving = ref(false)

const save = async () => {
  if (!props.partyId) return

  // Validación CM: prorrateo debe sumar ~100%
  const cmRows = registrations.value.filter(r => r.registration_type === 'CONVENIO_MULTILATERAL')
  if (cmRows.length > 0 && Math.abs(cmTotal.value - 100) > 0.5) {
    toast.add({
      title: 'Convenio Multilateral incompleto',
      description: `Los porcentajes de prorrateo suman ${cmTotal.value}%. Deben sumar 100%.`,
      color: 'warning'
    })
    return
  }

  const invalidRows = registrations.value.filter(r => !r.jurisdiction_id)
  if (invalidRows.length > 0) {
    toast.add({
      title: 'Jurisdicción requerida',
      description: 'Completá la jurisdicción en todas las inscripciones IIBB.',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    await fiscalService.putPartyWithholdingProfiles(props.partyId, profiles.value)
    await fiscalService.putPartyIibbRegistrations(props.partyId, registrations.value)
    toast.add({ title: 'Perfil fiscal guardado', color: 'success' })
  } catch (e: any) {
    console.error('Error guardando perfil fiscal:', e)
    toast.add({
      title: 'Error guardando perfil fiscal',
      description: e?.data?.message ?? 'Intentá de nuevo',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

watch(() => props.partyId, loadAll, { immediate: true })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <h3 class="font-semibold">Configuración impositiva</h3>
          <p class="mt-0.5 text-xs text-muted">IVA, Ingresos Brutos y condiciones para retenciones.</p>
        </div>
        <UButton
          v-if="activeSection !== 'vat'"
          label="Guardar perfil fiscal"
          size="sm"
          :loading="saving"
          :disabled="!partyId"
          @click="save"
        />
      </div>
    </template>

    <UTabs v-model="activeSection" :items="sectionTabs" :content="false" variant="link" class="mb-5 w-full" />

    <div v-if="activeSection === 'vat'" class="space-y-5">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField label="Condición frente al IVA" description="Se utiliza para elegir el tipo de comprobante y calcular IVA.">
          <USelectMenu v-model="vatCondition" :items="vatConditionOptions" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Porcentaje de exención" description="Completalo solamente cuando corresponda una exención parcial.">
          <UInput v-model.number="exemptionRate" type="number" min="0" max="100" step="0.01" suffix="%" class="w-full" />
        </UFormField>
      </div>
      <UAlert color="neutral" variant="soft" title="El IVA se guarda con los datos generales del tercero" />
    </div>

    <UAlert
      v-else-if="!partyId"
      color="info"
      variant="soft"
      title="Guardá el tercero primero"
      description="Ingresos Brutos y retenciones se habilitan después de crear el cliente o proveedor."
    />

    <div v-else-if="activeSection === 'withholdings'" class="space-y-6">
      <!-- SUJETO PASIBLE -->
      <div>
        <h4 class="text-sm font-medium mb-3">Sujeto pasible de retención</h4>
        <div :class="{ 'opacity-50 pointer-events-none': profilesLoading }" class="space-y-2">
          <div
            v-for="p in profiles"
            :key="p.tax_type"
            class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-12 md:items-center"
          >
            <div class="text-sm font-medium md:col-span-3">{{ TAX_TYPES.find(t => t.type === p.tax_type)?.label ?? p.tax_type }}</div>
            <div class="md:col-span-3">
              <UCheckbox v-model="p.is_subject" label="Sujeto pasible" />
            </div>
            <div class="md:col-span-4">
              <USelectMenu
                v-model="p.status"
                :items="statusOptions"
                value-key="value"
                size="sm"
                placeholder="Estado"
              />
            </div>
            <div class="md:col-span-2">
              <UCheckbox
                v-if="p.tax_type === 'SUSS'"
                v-model="p.is_pyme"
                label="PyME (1%)"
              />
            </div>
          </div>
        </div>
        <p class="text-xs text-muted mt-2">
          "Normal" = el motor calcula según reglas. Exento / No sujeto / Certificado = el motor nunca retiene a este tercero.
        </p>
      </div>

    </div>

    <div v-else class="space-y-6">
      <!-- INSCRIPCIONES IIBB -->
      <div>
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h4 class="text-sm font-medium">Inscripciones de Ingresos Brutos</h4>
            <p class="text-xs text-muted">Agregá las provincias del tercero. Las alícuotas vacías usan la configuración general.</p>
          </div>
          <div class="flex gap-2">
            <UButton :label="showAdvancedIibb ? 'Ocultar vigencias' : 'Vigencias'" size="xs" variant="ghost" @click="showAdvancedIibb = !showAdvancedIibb" />
            <UButton label="Agregar" size="xs" icon="i-lucide-plus" @click="addRegistration" />
          </div>
        </div>

        <div v-if="registrations.length === 0" class="text-xs text-muted">
          Sin inscripciones. Sin esto, el motor no calculará percepciones ni retenciones de IIBB para este tercero.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(r, i) in registrations"
            :key="i"
            class="rounded-lg border border-default p-4"
          >
            <div class="mb-4 flex items-center justify-between gap-3">
              <div class="text-sm font-medium">
                {{ jurisdictions.find(j => j.id === r.jurisdiction_id)?.name ?? 'Nueva jurisdicción' }}
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted">Activa</span>
                <USwitch v-model="r.is_active" />
                <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="removeRegistration(i)" />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <UFormField label="Condición">
                <USelectMenu v-model="r.registration_type" :items="registrationTypeOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField label="Jurisdicción">
                <USelectMenu v-model="r.jurisdiction_id" :items="jurisdictionOptions" value-key="value" searchable class="w-full" />
              </UFormField>
              <UFormField label="N.º de inscripción">
                <UInput v-model="r.registration_number" placeholder="CUIT o inscripción" class="w-full" />
              </UFormField>
              <UFormField v-if="r.registration_type === 'CONVENIO_MULTILATERAL'" label="% prorrateo">
                <UInput v-model.number="r.prorrate_percentage" type="number" min="0" max="100" step="0.0001" class="w-full" />
              </UFormField>
              <UFormField label="Percepción particular" hint="%">
                <UInput v-model.number="r.perception_rate" type="number" min="0" max="100" step="0.0001" placeholder="Usar general" class="w-full" />
              </UFormField>
              <UFormField label="Retención particular" hint="%">
                <UInput v-model.number="r.retention_rate" type="number" min="0" max="100" step="0.0001" placeholder="Usar general" class="w-full" />
              </UFormField>
              <UFormField v-if="showAdvancedIibb" label="Vigente desde">
                <UInput v-model="r.valid_from" type="date" class="w-full" />
              </UFormField>
              <UFormField v-if="showAdvancedIibb" label="Vigente hasta">
                <UInput v-model="r.valid_to" type="date" class="w-full" />
              </UFormField>
            </div>
            <p class="mt-3 text-xs text-muted">Dejá la alícuota vacía para usar la general de {{ jurisdictions.find(j => j.id === r.jurisdiction_id)?.name ?? 'la provincia' }}. Escribí 0 solamente para forzar importe $0.</p>
          </div>

          <div
            v-if="cmRowsCount > 0"
            class="text-xs"
            :class="Math.abs(cmTotal - 100) > 0.5 ? 'text-warning' : 'text-muted'"
          >
            Convenio Multilateral: prorrateo total {{ cmTotal }}% (debe sumar 100%)
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
