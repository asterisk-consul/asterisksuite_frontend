<script setup lang="ts">
import { useFiscalService } from '~/modulos/erp/fiscal/service/fiscal.service'
import type { TaxRule, TaxJurisdiction, WithholdingConcept } from '~/modulos/erp/fiscal/types/fiscal.types'
import CompanyAgentConfig from '~/modulos/erp/fiscal/components/CompanyAgentConfig.vue'

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
const search = ref('')
const showHistoricalRules = ref(false)
const activeApplication = ref<'PERCEPTION' | 'WITHHOLDING'>('PERCEPTION')
const applicationTabs = [
  { label: 'Percepciones', value: 'PERCEPTION', icon: 'i-lucide-receipt-text' },
  { label: 'Retenciones', value: 'WITHHOLDING', icon: 'i-lucide-hand-coins' }
]
const getRuleStatus = (rule: TaxRule) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const validFrom = rule.valid_from ? new Date(rule.valid_from) : null
  const validTo = rule.valid_to ? new Date(rule.valid_to) : null

  if (!rule.is_active) return { key: 'disabled', label: 'Desactivada', color: 'neutral' as const }
  if (validFrom && validFrom > today) return { key: 'upcoming', label: 'Próxima', color: 'info' as const }
  if (validTo && validTo < today) return { key: 'historical', label: 'Finalizada', color: 'neutral' as const }
  return { key: 'current', label: 'Vigente', color: 'success' as const }
}

const filteredRules = computed(() =>
  rules.value.filter((rule) => {
    if (rule.application_type !== activeApplication.value) return false
    if (filterTaxType.value && rule.tax_type !== filterTaxType.value) return false
    const query = search.value.trim().toLocaleLowerCase('es')
    if (!query) return true
    return [rule.name, rule.tax_type, rule.jurisdiction?.name, rule.jurisdiction?.code]
      .some(value => value?.toLocaleLowerCase('es').includes(query))
  })
)

const historicalRulesCount = computed(() =>
  filteredRules.value.filter(rule => ['historical', 'disabled'].includes(getRuleStatus(rule).key)).length
)

const visibleRules = computed(() => {
  const statusOrder: Record<string, number> = { current: 0, upcoming: 1, historical: 2, disabled: 3 }
  return filteredRules.value
    .filter(rule => showHistoricalRules.value || !['historical', 'disabled'].includes(getRuleStatus(rule).key))
    .slice()
    .sort((a, b) => {
      const statusDifference = statusOrder[getRuleStatus(a).key]! - statusOrder[getRuleStatus(b).key]!
      if (statusDifference !== 0) return statusDifference
      return (a.jurisdiction?.name ?? '').localeCompare(b.jurisdiction?.name ?? '', 'es')
    })
})

const taxTypeOptions = ['GANANCIAS', 'IIBB', 'SUSS', 'IVA']

const columns = [
  { id: 'actions', header: 'Acciones' },
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'tax_type', header: 'Impuesto' },
  { accessorKey: 'jurisdiction', header: 'Jurisdicción' },
  { accessorKey: 'calculation_method', header: 'Método' },
  { accessorKey: 'rate', header: 'Alícuota' },
  { accessorKey: 'minimum_amount', header: 'Mínimo' },
  { accessorKey: 'validity', header: 'Vigencia' },
  { accessorKey: 'is_active', header: 'Estado' }
]

// ─── Modal ───────────────────────────────────────────────────
const modalOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)

const emptyRule = (): Partial<TaxRule> => ({
  name: '',
  tax_type: 'IIBB',
  application_type: 'PERCEPTION',
  jurisdiction_id: null,
  withholding_concept_id: null,
  operation_type: 'SALE',
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
  { label: 'Compras', value: 'PURCHASE' },
  { label: 'Ventas', value: 'SALE' },
  { label: 'Ambas', value: 'ALL' }
]

const jurisdictionOptions = computed(() => jurisdictions.value.map((j) => ({ label: j.name, value: j.id })))

const conceptOptions = computed(() => concepts.value.map((c) => ({ label: c.name, value: c.id })))

const isScale = computed(() => form.value.calculation_method === 'SCALE')
const isFixedAmount = computed(() => form.value.calculation_method === 'FIXED')
const isWithholding = computed(() => form.value.application_type === 'WITHHOLDING')
const applicationTypeOptions = [
  { label: 'Percepción en comprobante', value: 'PERCEPTION' },
  { label: 'Retención en pago/cobro', value: 'WITHHOLDING' }
]

watch(() => form.value.application_type, (application, previousApplication) => {
  if (!modalOpen.value || application === previousApplication) return
  if (application === 'PERCEPTION' && form.value.operation_type === 'PURCHASE') form.value.operation_type = 'SALE'
  if (application === 'WITHHOLDING' && form.value.operation_type === 'SALE') form.value.operation_type = 'PURCHASE'
})

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
  form.value.application_type = activeApplication.value
  form.value.operation_type = activeApplication.value === 'PERCEPTION' ? 'SALE' : 'PURCHASE'
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
    operation_type: rule.operation_type ?? 'ALL',
    cuit_suffix_group: rule.cuit_suffix_group,
    base_type: rule.base_type,
    calculation_method: rule.calculation_method,
    rate: rule.rate != null ? Number(rule.rate) : null,
    minimum_amount: rule.minimum_amount != null ? Number(rule.minimum_amount) : null,
    valid_from: rule.valid_from?.slice(0, 10),
    valid_to: rule.valid_to?.slice(0, 10) ?? null,
    is_active: rule.is_active,
    brackets: rule.brackets.map((b) => ({
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
    const { id: _id, ...payload } = {
      ...form.value,
      operation_type: form.value.operation_type === 'ALL' ? null : form.value.operation_type
    }
    if (isEditing.value && form.value.id) {
      await fiscalService.updateTaxRule(form.value.id, payload)
    } else {
      await fiscalService.createTaxRule(payload)
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
  n == null
    ? '—'
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n))

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
  <div class="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-hidden p-4 sm:p-6">
    <div class="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold">Reglas Fiscales</h1>
        <p class="text-sm text-muted">Creá y modificá alícuotas generales por impuesto, jurisdicción y vigencia</p>
      </div>
      <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Buscar regla o jurisdicción..." class="w-full sm:w-64" />
        <USelectMenu v-model="filterTaxType" :items="taxTypeOptions" placeholder="Todos los impuestos" class="w-full sm:w-48" />
        <UButton label="Nueva regla" icon="i-lucide-plus" class="justify-center" @click="openCreate" />
      </div>
    </div>

    <UAlert
      color="warning"
      variant="soft"
      title="Valores de referencia"
      description="Las alícuotas y mínimos precargados son de referencia. Verificá siempre la vigencia con tu contador antes de operar."
    />

    <CompanyAgentConfig />

    <UTabs v-model="activeApplication" :items="applicationTabs" :content="false" variant="link" class="w-full" />

    <UAlert
      color="info"
      variant="soft"
      :title="activeApplication === 'PERCEPTION' ? 'Percepciones en facturas' : 'Retenciones al pagar o cobrar'"
      :description="
        activeApplication === 'PERCEPTION'
          ? 'Estas reglas agregan IIBB al comprobante según la jurisdicción seleccionada.'
          : 'Estas reglas se aplican en el circuito de pagos y generan certificados de retención.'
      "
    />

    <UCard class="min-w-0 overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default pb-4">
        <div>
          <p class="text-sm font-medium">Configuración actual</p>
          <p class="text-xs text-muted">Las reglas finalizadas se conservan para consultar comprobantes históricos.</p>
        </div>
        <USwitch
          v-model="showHistoricalRules"
          :label="`Mostrar historial${historicalRulesCount ? ` (${historicalRulesCount})` : ''}`"
          :disabled="historicalRulesCount === 0"
        />
      </div>
      <div v-if="loading" class="text-center py-8 text-muted">Cargando…</div>
      <div v-else-if="visibleRules.length === 0" class="text-center py-8 text-muted text-sm">
        Sin reglas en esta pestaña{{ filterTaxType ? ` para ${filterTaxType}` : '' }}. Creá una nueva.
      </div>
      <div v-else class="max-h-[560px] w-full max-w-full overflow-auto overscroll-contain">
      <UTable
        :data="visibleRules"
        :columns="columns"
        class="min-w-[1050px] [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_thead]:bg-default [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-30 [&_th:first-child]:bg-default [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:bg-default"
      >
        <template #actions-cell="{ row }">
          <div class="flex min-w-20 gap-1">
            <UButton icon="i-lucide-pencil" size="xs" variant="ghost" aria-label="Editar regla" @click="openEdit(row.original)" />
            <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" aria-label="Eliminar regla" @click="remove(row.original)" />
          </div>
        </template>
        <template #tax_type-cell="{ row }">
          <UBadge :label="row.original.tax_type" variant="subtle" size="xs" />
        </template>
        <template #jurisdiction-cell="{ row }">
          {{ row.original.jurisdiction?.name ?? 'Todas' }}
        </template>
        <template #calculation_method-cell="{ row }">
          {{
            row.original.calculation_method === 'SCALE'
              ? 'Escala'
              : row.original.calculation_method === 'FIXED'
                ? 'Fijo'
                : 'Alícuota'
          }}
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
            :label="getRuleStatus(row.original).label"
            :color="getRuleStatus(row.original).color"
            variant="subtle"
            size="xs"
          />
        </template>
      </UTable>
      </div>
    </UCard>

    <!-- Modal de regla -->
    <UModal
      v-model:open="modalOpen"
      :title="isEditing ? 'Editar regla fiscal' : 'Nueva regla fiscal'"
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #body>
        <div class="max-h-[calc(100vh-13rem)] space-y-5 overflow-y-auto overscroll-contain px-1 pb-1">
          <div class="rounded-xl border border-default bg-elevated/40 p-4 sm:p-5">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-file-cog" class="size-5" /></div>
              <div>
                <h3 class="font-semibold">Identificación y alcance</h3>
                <p class="text-sm text-muted">Definí qué impuesto es y en qué operaciones debe aplicarse.</p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Nombre de la regla" description="Usá un nombre que permita reconocerla en el historial." required class="sm:col-span-2">
                <UInput v-model="form.name" placeholder="Ej.: Percepción IIBB Córdoba 2026" class="w-full" />
              </UFormField>
              <UFormField label="Impuesto" required>
                <USelectMenu v-model="form.tax_type" :items="taxTypeOptions" placeholder="Seleccionar impuesto" class="w-full" />
              </UFormField>
              <UFormField label="Aplicación" description="Indica en qué momento se calcula." required>
                <USelectMenu v-model="form.application_type" :items="applicationTypeOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField label="Jurisdicción" description="Provincia a la que corresponde la alícuota.">
                <USelectMenu
                  v-model="form.jurisdiction_id"
                  :items="jurisdictionOptions"
                  value-key="value"
                  placeholder="Todas las jurisdicciones"
                  searchable
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Tipo de operación" description="Venta para percepciones; compra para retenciones.">
                <USelectMenu v-model="form.operation_type" :items="operationTypeOptions" value-key="value" class="w-full" />
              </UFormField>
            </div>
          </div>

          <div class="rounded-xl border border-default p-4 sm:p-5">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-calculator" class="size-5" /></div>
              <div>
                <h3 class="font-semibold">Cálculo</h3>
                <p class="text-sm text-muted">Configurá cómo se obtiene el importe de esta regla.</p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Método de cálculo" required>
                <USelectMenu v-model="form.calculation_method" :items="methodOptions" value-key="value" class="w-full" />
              </UFormField>
              <UFormField v-if="!isScale && !isFixedAmount" label="Alícuota" description="Porcentaje aplicado sobre la base.">
                <UInput v-model.number="form.rate" type="number" min="0" step="0.01" placeholder="0,00" class="w-full">
                  <template #trailing><span class="text-sm text-muted">%</span></template>
                </UInput>
              </UFormField>
              <UFormField v-if="isFixedAmount" label="Monto fijo" description="Importe aplicado en cada cálculo.">
                <UInput v-model.number="form.fixed_amount" type="number" min="0" step="0.01" placeholder="0,00" class="w-full">
                  <template #leading><span class="text-sm text-muted">$</span></template>
                </UInput>
              </UFormField>
              <UFormField label="Mínimo no sujeto" description="No se calcula por debajo de este monto.">
                <UInput v-model.number="form.minimum_amount" type="number" min="0" step="0.01" placeholder="Sin mínimo" class="w-full">
                  <template #leading><span class="text-sm text-muted">$</span></template>
                </UInput>
              </UFormField>
              <UFormField v-if="isWithholding && form.tax_type === 'GANANCIAS'" label="Grupo de CUIT" description="Segmentación opcional para Ganancias.">
                <USelectMenu v-model="form.cuit_suffix_group" :items="cuitGroupOptions" value-key="value" placeholder="Cualquier CUIT" class="w-full" />
              </UFormField>
              <UFormField v-if="isWithholding && ['SUSS', 'GANANCIAS'].includes(form.tax_type || '')" label="Concepto" description="Concepto fiscal al que corresponde.">
                <USelectMenu v-model="form.withholding_concept_id" :items="conceptOptions" value-key="value" placeholder="Cualquier concepto" class="w-full" />
              </UFormField>
            </div>

            <!-- Escala -->
            <div v-if="isScale" class="mt-4 space-y-3 rounded-lg border border-default bg-elevated/40 p-3">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">Escala por pagos acumulados del mes</h4>
                <UButton label="Agregar tramo" size="xs" variant="outline" icon="i-lucide-plus" @click="addBracket" />
              </div>
              <div v-for="(b, i) in form.brackets" :key="i" class="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <UFormField label="Desde">
                  <UInput v-model.number="b.accumulated_from" type="number" size="sm" class="w-full" />
                </UFormField>
                <UFormField label="Hasta">
                  <UInput
                    v-model.number="b.accumulated_to"
                    type="number"
                    size="sm"
                    placeholder="Sin tope"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Alícuota %">
                  <UInput v-model.number="b.rate" type="number" step="0.01" size="sm" class="w-full" />
                </UFormField>
                <UButton icon="i-lucide-trash-2" size="sm" variant="ghost" color="error" aria-label="Eliminar tramo" @click="removeBracket(i)" />
              </div>
              <p class="text-xs text-muted">
                Tramos sobre el total acumulado del mes. Ej: 0 → 200.000 (0%), 200.000 → sin tope (2%).
              </p>
            </div>
          </div>

          <div class="rounded-xl border border-default p-4 sm:p-5">
            <div class="mb-4 flex items-start gap-3">
              <div class="rounded-lg bg-primary/10 p-2 text-primary"><UIcon name="i-lucide-calendar-range" class="size-5" /></div>
              <div>
                <h3 class="font-semibold">Vigencia</h3>
                <p class="text-sm text-muted">Las reglas anteriores quedan disponibles en el historial.</p>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Vigente desde" required>
                <UInput v-model="form.valid_from" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Vigente hasta" description="Dejalo vacío si no tiene fecha de finalización.">
                <UInput v-model="form.valid_to" type="date" class="w-full" />
              </UFormField>
            </div>
            <div class="mt-4 flex items-center justify-between gap-4 rounded-lg bg-elevated/60 p-3">
              <div>
                <p class="text-sm font-medium">Regla activa</p>
                <p class="text-xs text-muted">Puede calcularse dentro del período configurado.</p>
              </div>
              <USwitch v-model="form.is_active" />
            </div>
            <details class="mt-3 text-sm">
              <summary class="cursor-pointer select-none font-medium text-muted">Opciones avanzadas</summary>
              <UFormField class="mt-3" label="Prioridad" description="Si coinciden varias reglas, se evalúa primero la de mayor prioridad.">
                <UInput v-model.number="form.priority" type="number" min="0" class="w-full sm:w-48" />
              </UFormField>
            </details>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-muted">Los cambios solo afectan cálculos nuevos.</p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton :label="isEditing ? 'Guardar cambios' : 'Crear regla'" icon="i-lucide-check" :loading="saving" @click="save" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
