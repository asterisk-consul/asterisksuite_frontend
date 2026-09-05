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

  // Validación: CM sin jurisdicción
  const invalidRows = registrations.value.filter(
    r => r.registration_type !== 'EXENTO' && !r.jurisdiction_id
  )
  if (invalidRows.length > 0) {
    toast.add({
      title: 'Jurisdicción requerida',
      description: 'Completá la jurisdicción en todas las inscripciones IIBB (excepto Exento).',
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
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">Perfil Fiscal — Retenciones</h3>
        <UButton
          label="Guardar perfil fiscal"
          size="sm"
          :loading="saving"
          :disabled="!partyId"
          @click="save"
        />
      </div>
    </template>

    <UAlert
      v-if="!partyId"
      color="info"
      variant="soft"
      title="Guardá el tercero primero"
      description="El perfil fiscal se configura después de crear el registro, cuando ya tenga su identificador."
    />

    <div v-else class="space-y-6">
      <!-- SUJETO PASIBLE -->
      <div>
        <h4 class="text-sm font-medium mb-3">Sujeto pasible de retención</h4>
        <div :class="{ 'opacity-50 pointer-events-none': profilesLoading }" class="space-y-2">
          <div
            v-for="p in profiles"
            :key="p.tax_type"
            class="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-default"
          >
            <div class="col-span-3 font-medium text-sm">{{ TAX_TYPES.find(t => t.type === p.tax_type)?.label ?? p.tax_type }}</div>
            <div class="col-span-3">
              <UCheckbox v-model="p.is_subject" label="Sujeto pasible" />
            </div>
            <div class="col-span-4">
              <USelectMenu
                v-model="p.status"
                :items="statusOptions"
                value-key="value"
                size="sm"
                placeholder="Estado"
              />
            </div>
            <div class="col-span-2">
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

      <!-- INSCRIPCIONES IIBB -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium">Inscripciones Ingresos Brutos</h4>
          <UButton label="Agregar" size="xs" icon="i-lucide-plus" @click="addRegistration" />
        </div>

        <div v-if="registrations.length === 0" class="text-xs text-muted">
          Sin inscripciones. Sin esto, el motor no calculará retenciones de IIBB para este tercero.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(r, i) in registrations"
            :key="i"
            class="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-default"
          >
            <div class="col-span-3">
              <USelectMenu
                v-model="r.registration_type"
                :items="registrationTypeOptions"
                value-key="value"
                size="sm"
                placeholder="Tipo"
              />
            </div>
            <div class="col-span-3">
              <USelectMenu
                v-model="r.jurisdiction_id"
                :items="jurisdictionOptions"
                value-key="value"
                size="sm"
                placeholder="Jurisdicción"
                searchable
                :disabled="r.registration_type === 'EXENTO'"
              />
            </div>
            <div class="col-span-2">
              <UInput
                v-if="r.registration_type === 'CONVENIO_MULTILATERAL'"
                v-model.number="r.prorrate_percentage"
                type="number"
                size="sm"
                placeholder="% prorrateo"
              />
              <UInput
                v-else
                v-model="r.registration_number"
                size="sm"
                placeholder="N° inscripción"
              />
            </div>
            <div class="col-span-3">
              <UInput
                v-if="r.registration_type === 'CONVENIO_MULTILATERAL'"
                v-model="r.registration_number"
                size="sm"
                placeholder="N° inscripción CM"
              />
              <span v-else class="text-xs text-muted">—</span>
            </div>
            <div class="col-span-1 flex justify-end">
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="error"
                @click="removeRegistration(i)"
              />
            </div>
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
