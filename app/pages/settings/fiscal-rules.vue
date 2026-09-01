<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { TaxRule, TaxJurisdiction, WithholdingConcept } from '~/modulos/erp/fiscal/types/fiscal.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const fiscalService = useFiscalService()
const toast = useToast()

const rules = ref<TaxRule[]>([])
const jurisdictions = ref<TaxJurisdiction[]>([])
const concepts = ref<WithholdingConcept[]>([])
const loading = ref(false)

const filterTaxType = ref('')

const taxTypeOptions = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']

const columns = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'tax_type', header: 'Impuesto' },
  { accessorKey: 'jurisdiction', header: 'Jurisdicción' },
  { accessorKey: 'calculation_method', header: 'Método' },
  { accessorKey: 'rate', header: 'Alícuota' },
  { accessorKey: 'minimum_amount', header: 'Mínimo' },
  { accessorKey: 'validity', header: 'Vigencia' },
  { accessorKey: 'is_active', header: 'Activa' },
  { id: 'actions', header: '' }
]

// ─── Modal ───────────────────────────────────────────────────
const modalOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const emptyRule = (): Partial<TaxRule> => ({
  name: '',
  tax_type: 'GANANCIAS',
  application_type: 'WITHHOLDING',
  jurisdiction_id: null,
  withholding_concept_id: null,
  operation_type: 'PURCHASE',
  cuit_suffix_group: null,
  base_type: 'PAYMENT_AMOUNT',
  calculation_method: 'RATE_TIMES_BASE',
  rate: null,
  minimum_amount: null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_to: null,
  is_active: true,
  brackets: []
})

const form = ref<Partial<TaxRule>>(emptyRule())

const cuitGroupOptions = [
  { label: 'Personas Jurídicas (30/33/34)', value: 'PJ' },
  { label: 'Personas Físicas (20/23/24/27)', value: 'PF' }
]

const methodOptions = [
  { label: 'Alícuota × Base', value: 'RATE_TIMES_BASE' },
  { label: 'Escala por acumulado', value: 'SCALE' },
  { label: 'Monto fijo', value: 'FIXED' }
]

const operationTypeOptions = [
  { label: 'Compras (pago a proveedor)', value: 'PURCHASE' },
  { label: 'Ventas (cobro a cliente)', value: 'SALE' },
  { label: 'Ambas', value: '' }
]

const jurisdictionOptions = computed(() =>
  jurisdictions.value.map(j => ({ label: j.name, value: j.id }))
)

const conceptOptions = computed(() =>
  concepts.value.map(c => ({ label: c.name, value: c.id }))
)

const isScale = computed(() => form.value.calculation_method === 'SCALE')

const addBracket = () => {
  if (!form.value.brackets) form.value.brackets = []
  const last = form.value.brackets[form.value.brackets.length - 1]
  form.value.brackets.push({
    accumulated_from: last?.accumulated_to ?? 0,
    accumulated_to: null,
    rate: last?.rate ?? 2
  })
}

const removeBracket = (i: number) => {
  form.value.brackets?.splice(i, 1)
}

const openCreate = () => {
  isEditing.value = false
  form.value = emptyRule()
  modalOpen.value = true
}

const openEdit = (rule: TaxRule) => {
  isEditing.value = true
  form.value = {
    id: rule.id,
    name: rule.name,
    tax_type: rule.tax_type,
    application_type: rule.application_type,
    jurisdiction_id: rule.jurisdiction_id,
    withholding_concept_id: rule.withholding_concept_id,
    operation_type: rule.operation_type,
    cuit_suffix_group: rule.cuit_suffix_group,
    base_type: rule.base_type,
    calculation_method: rule.calculation_method,
    rate: rule.rate != null ? Number(rule.rate) : null,
    minimum_amount: rule.minimum_amount != null ? Number(rule.minimum_amount) : null,
    valid_from: rule.valid_from?.slice(0, 10),
    valid_to: rule.valid_to?.slice(0, 10) ?? null,
    is_active: rule.is_active,
    brackets: rule.brackets.map(b => ({
      accumulated_from: Number(b.accumulated_from),
      accumulated_to: b.accumulated_to != null ? Number(b.accumulated_to) : null,
      rate: Number(b.rate)
    }))
  }
  modalOpen.value = true
}

const save = async () => {
  if (!form.value.name || !form.value.tax_type) {
    toast.add({ title: 'Nombre e impuesto son obligatorios', color: 'warning' })
    return
  }
  if (isScale.value && (!form.value.brackets || form.value.brackets.length === 0)) {
    toast.add({ title: 'La escala necesita al menos un tramo', color: 'warning' })
    return
  }

  saving.value = true
  try {
    if (isEditing.value && form.value.id) {
      await fiscalService.updateTaxRule(form.value.id, form.value)
    } else {
      await fiscalService.createTaxRule(form.value)
    }
    toast.add({ title: 'Regla guardada', color: 'success' })
    modalOpen.value = false
    await fetchRules()
  } catch (e: any) {
    console.error('Error guardando regla:', e)
    toast.add({ title: 'Error guardando regla', description: e?.data?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const remove = async (rule: TaxRule) => {
  if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return
  try {
    await fiscalService.removeTaxRule(rule.id)
    toast.add({ title: 'Regla eliminada', color: 'success' })
    await fetchRules()
  } catch (e: any) {
    toast.add({ title: 'Error eliminando regla', description: e?.data?.message, color: 'error' })
  }
}

const formatCurrency = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n))

const fetchRules = async () => {
  loading.value = true
  try {
    const [r, j, c] = await Promise.all([
      fiscalService.getTaxRules(filterTaxType.value || undefined),
      fiscalService.getJurisdictions(),
      fiscalService.getWithholdingConcepts()
    ])
    rules.value = r
    jurisdictions.value = j
    concepts.value = c
  } catch (e: any) {
    console.error('Error cargando reglas:', e)
    toast.add({ title: 'Error cargando reglas', description: e?.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchRules)
</script>

<template>
  <div class="max-w-7xl mx-auto p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Reglas Fiscales</h1>
        <p class="text-sm text-muted">Alícuotas, mínimos y escalas del motor de retenciones</p>
      </div>
      <div class="flex gap-2">
        <USelectMenu v-model="filterTaxType" :items="taxTypeOptions" placeholder="Todos los impuestos" class="w-48" />
        <UButton label="Nueva regla" icon="i-lucide-plus" @click="openCreate" />
      </div>
    </div>

    <UAlert
      color="warning"
      variant="soft"
      title="Valores de referencia"
      description="Las alícuotas y mínimos precargados son de referencia. Verificá siempre la vigencia con tu contador antes de operar."
    />

    <UCard>
      <div v-if="loading" class="text-center py-8 text-muted">Cargando…</div>
      <div v-else-if="rules.length === 0" class="text-center py-8 text-muted text-sm">
        Sin reglas{{ filterTaxType ? ` para ${filterTaxType}` : '' }}. Ejecutá el seed fiscal o creá una nueva.
      </div>
      <UTable v-else :data="rules" :columns="columns">
        <template #tax_type-cell="{ row }">
          <UBadge :label="row.original.tax_type" variant="subtle" size="xs" />
        </template>
        <template #jurisdiction-cell="{ row }">
          {{ row.original.jurisdiction?.name ?? 'Todas' }}
        </template>
        <template #calculation_method-cell="{ row }">
          {{ row.original.calculation_method === 'SCALE' ? 'Escala' : row.original.calculation_method === 'FIXED' ? 'Fijo' : 'Alícuota' }}
        </template>
        <template #rate-cell="{ row }">
          {{ row.original.rate != null ? `${Number(row.original.rate)}%` : '—' }}
        </template>
        <template #minimum_amount-cell="{ row }">
          {{ formatCurrency(row.original.minimum_amount != null ? Number(row.original.minimum_amount) : null) }}
        </template>
        <template #validity-cell="{ row }">
          <span class="text-xs">
            {{ row.original.valid_from?.slice(0, 10) }} → {{ row.original.valid_to?.slice(0, 10) ?? 'vigente' }}
          </span>
        </template>
        <template #is_active-cell="{ row }">
          <UBadge
            :label="row.original.is_active ? 'Activa' : 'Inactiva'"
            :color="row.original.is_active ? 'success' : 'neutral'"
            variant="subtle"
            size="xs"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1 justify-end">
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="openEdit(row.original)" />
            <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" @click="remove(row.original)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Modal de regla -->
    <UModal v-model:open="modalOpen" class="max-w-2xl" :title="isEditing ? 'Editar regla' : 'Nueva regla fiscal'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nombre" required>
            <UInput v-model="form.name" placeholder="Ej: IIBB Córdoba (Inscripto directo)" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Impuesto" required>
              <USelectMenu v-model="form.tax_type" :items="taxTypeOptions" />
            </UFormField>
            <UFormField label="Jurisdicción">
              <USelectMenu v-model="form.jurisdiction_id" :items="jurisdictionOptions" value-key="value" placeholder="Todas" searchable />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Método de cálculo">
              <USelectMenu v-model="form.calculation_method" :items="methodOptions" value-key="value" />
            </UFormField>
            <UFormField label="Grupo CUIT (Ganancias)">
              <USelectMenu v-model="form.cuit_suffix_group" :items="cuitGroupOptions" value-key="value" placeholder="Cualquiera" />
            </UFormField>
          </div>

          <div v-if="!isScale" class="grid grid-cols-2 gap-4">
            <UFormField label="Alícuota %">
              <UInput v-model.number="form.rate" type="number" step="0.01" class="w-full" />
            </UFormField>
            <UFormField label="Monto fijo">
              <UInput v-model.number="form.fixed_amount" type="number" class="w-full" />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Mínimo no sujeto">
              <UInput v-model.number="form.minimum_amount" type="number" class="w-full" />
            </UFormField>
            <UFormField label="Tipo de operación">
              <USelectMenu v-model="form.operation_type" :items="operationTypeOptions" value-key="value" />
            </UFormField>
          </div>

          <!-- Escala -->
          <div v-if="isScale" class="border border-default rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">Escala por pagos acumulados del mes</h4>
              <UButton label="Agregar tramo" size="xs" variant="outline" icon="i-lucide-plus" @click="addBracket" />
            </div>
            <div
              v-for="(b, i) in form.brackets"
              :key="i"
              class="grid grid-cols-12 gap-2 items-center"
            >
              <div class="col-span-4">
                <UInput v-model.number="b.accumulated_from" type="number" size="sm" placeholder="Desde" />
              </div>
              <div class="col-span-4">
                <UInput v-model.number="b.accumulated_to" type="number" size="sm" placeholder="Hasta (vacío = sin tope)" />
              </div>
              <div class="col-span-3">
                <UInput v-model.number="b.rate" type="number" step="0.01" size="sm" placeholder="Alícuota %" />
              </div>
              <div class="col-span-1 flex justify-end">
                <UButton icon="i-lucide-x" size="xs" variant="ghost" color="error" @click="removeBracket(i)" />
              </div>
            </div>
            <p class="text-xs text-muted">
              Tramos sobre el total acumulado del mes. Ej: 0 → 200.000 (0%), 200.000 → sin tope (2%).
            </p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Vigente desde">
              <UInput v-model="form.valid_from" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Vigente hasta">
              <UInput v-model="form.valid_to" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Activa">
              <USwitch v-model="form.is_active" />
            </UFormField>
          </div>

          <UFormField label="Concepto (SUSS / Ganancias)">
            <USelectMenu v-model="form.withholding_concept_id" :items="conceptOptions" value-key="value" placeholder="Cualquiera" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
          <UButton label="Guardar" :loading="saving" @click="save" />
        </div>
      </template>
    </UModal>
  </div>
</template>
