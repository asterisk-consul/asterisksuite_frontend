<script setup lang="ts">
import { reactive, watch, computed, onMounted } from 'vue'
import { useDocumentSequencesStore } from '~/modulos/erp/document-sequences/store/document-sequences.store'

export interface DocumentTypeFormData {
  id?: string
  code: string
  description: string
  direction: number
  affects_stock: boolean
  affects_accounting: boolean
  affects_tax_book: boolean
  affects_payment: boolean
  calculates_taxes?: boolean
  active: boolean
  category: string
  letter_type: string
  afip_code: string
  requires_cae: boolean
  is_electronic: boolean
  document_sequence_ids: string[]
  tax_ids?: string[]
}

const props = withDefaults(defineProps<{
  modelValue?: DocumentTypeFormData
  loading?: boolean
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [DocumentTypeFormData]
  submit: [DocumentTypeFormData]
  cancel: []
}>()

const sequencesStore = useDocumentSequencesStore()
const toast = useToast()
const seqCreating = ref(false)
const taxes = ref<any[]>([])

onMounted(async () => {
  await sequencesStore.fetchAll()
  try {
    taxes.value = await $fetch<any[]>('/api/erp/taxes')
  } catch (e) {
    console.error('Error loading taxes:', e)
  }
})

const defaultForm: DocumentTypeFormData = {
  code: '', description: '', direction: 1,
  affects_stock: false, affects_accounting: true, affects_tax_book: false, affects_payment: false,
  calculates_taxes: true,
  active: true, category: '', letter_type: '', afip_code: '',
  requires_cae: false, is_electronic: false, document_sequence_ids: [], tax_ids: []
}

const form = reactive<DocumentTypeFormData>({ ...defaultForm })

watch([() => props.modelValue, () => sequencesStore.items], ([val]) => {
  if (!val) { Object.assign(form, { ...defaultForm }); return }
  const valAny = val as any
  const linkedSequenceIds = valAny.document_type_sequences?.length
    ? valAny.document_type_sequences.map((dts: any) => dts.document_sequences?.id ?? dts.sequence_id)
    : valAny.document_sequence_id
      ? [valAny.document_sequence_id]
      : (val.document_sequence_ids ?? [])
  Object.assign(form, { ...val, document_sequence_ids: linkedSequenceIds })
}, { immediate: true })

watch(form, (val) => { emit('update:modelValue', { ...val }) }, { deep: true })

const handleSubmit = () => {
  const payload: DocumentTypeFormData = {
    code: form.code,
    description: form.description,
    direction: form.direction,
    affects_stock: form.affects_stock,
    affects_accounting: form.affects_accounting,
    affects_tax_book: form.affects_tax_book,
    affects_payment: form.affects_payment,
    calculates_taxes: form.calculates_taxes ?? true,
    active: form.active,
    category: form.category,
    letter_type: form.letter_type,
    afip_code: form.afip_code,
    requires_cae: form.requires_cae,
    is_electronic: form.is_electronic,
    document_sequence_ids: (form.document_sequence_ids ?? []).map((item: any) => typeof item === 'string' ? item : item.value),
    tax_ids: form.tax_ids?.length ? form.tax_ids : undefined,
  }
  emit('submit', payload)
}

// Sequence inline creation
const showSeqCreate = ref(false)
const seqForm = reactive({ name: '', point_of_sale: '0001', prefix: '', range_start: 1, range_end: 999999, automatic: true })

const openSeqCreate = () => {
  Object.assign(seqForm, { name: '', point_of_sale: '0001', prefix: '', range_start: 1, range_end: 999999, automatic: true })
  showSeqCreate.value = true
}

const handleSeqCreate = async () => {
  seqCreating.value = true
  try {
    const created = await sequencesStore.create(seqForm)
    form.document_sequence_ids = [...(form.document_sequence_ids ?? []), created.id]
    showSeqCreate.value = false
    toast.add({ title: 'Secuencia creada', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    seqCreating.value = false
  }
}

// Taxes
const itemTaxes = computed(() => taxes.value.filter(t => t.calculation_level === 'ITEM'))
const documentTaxes = computed(() => taxes.value.filter(t => t.calculation_level === 'DOCUMENT'))

const toggleTax = (taxId: string) => {
  if (!form.tax_ids) form.tax_ids = []
  const idx = form.tax_ids.indexOf(taxId)
  if (idx === -1) {
    form.tax_ids.push(taxId)
  } else {
    form.tax_ids.splice(idx, 1)
  }
}

const isTaxSelected = (taxId: string) => {
  return form.tax_ids?.includes(taxId) ?? false
}

const directionOptions = [
  { label: 'Venta (emisión)', value: 1 },
  { label: 'Compra (recepción)', value: -1 }
]

const categoryOptions = [
  { label: 'Factura', value: 'INVOICE' },
  { label: 'Nota de Crédito', value: 'CREDIT_NOTE' },
  { label: 'Nota de Débito', value: 'DEBIT_NOTE' },
  { label: 'Orden', value: 'ORDER' },
  { label: 'Presupuesto', value: 'QUOTE' },
  { label: 'Recibo', value: 'RECEIPT' },
  { label: 'Remito', value: 'REMITO' }
]

const letterOptions = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'X', value: 'X' }
]

const sequenceOptions = computed(() =>
  sequencesStore.items.map(s => ({
    label: `${s.name} (PV: ${s.point_of_sale}${s.prefix ? ' - ' + s.prefix : ''})`,
    value: s.id
  }))
)

const selectedSequences = computed({
  get: () =>
    (form.document_sequence_ids ?? [])
      .map((id: any) => sequenceOptions.value.find(o => o.value === (typeof id === 'string' ? id : id.value)))
      .filter(Boolean),
  set: (val: any) => {
    form.document_sequence_ids = (val ?? []).map((item: any) => typeof item === 'string' ? item : item.value)
  }
})

const selectedDirection = computed({
  get: () => directionOptions.find(o => o.value === form.direction) ?? directionOptions[0],
  set: (val: any) => { form.direction = val?.value ?? val ?? 1 }
})

const selectedCategory = computed({
  get: () => categoryOptions.find(o => o.value === form.category) ?? categoryOptions[0],
  set: (val: any) => { form.category = val?.value ?? val ?? '' }
})
</script>

<template>
  <form class="space-y-5" @submit.prevent="handleSubmit">
    <!-- DATOS GENERALES -->
    <div class="space-y-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Datos generales</p>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Código" name="code" required>
          <UInput v-model="form.code" placeholder="Ej: FA-A" :disabled="!!form.id" />
        </UFormField>
        <UFormField label="Dirección" name="direction" required>
          <USelectMenu v-model="selectedDirection" :items="directionOptions" />
        </UFormField>
      </div>
      <UFormField label="Descripción" name="description" required>
        <UInput v-model="form.description" placeholder="Ej: Factura A Venta" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Categoría" name="category">
          <USelectMenu v-model="selectedCategory" :items="categoryOptions" placeholder="Seleccionar..." />
        </UFormField>
        <UFormField label="Letra AFIP" name="letter_type">
          <USelectMenu v-model="form.letter_type" :items="letterOptions" placeholder="A, B, C, X" />
        </UFormField>
      </div>
      <UFormField label="Código AFIP" name="afip_code">
        <UInput v-model="form.afip_code" placeholder="Ej: 01, 06, 11" />
      </UFormField>
    </div>

    <USeparator />

    <!-- SECUENCIAS -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide">Secuencias de numeración</p>
          <p class="text-xs text-muted mt-0.5">Define cómo se numeran los comprobantes (punto de venta, prefijo y rango).</p>
        </div>
        <UButton label="Crear secuencia" variant="outline" size="xs" icon="i-lucide-plus" @click="openSeqCreate" />
      </div>
      <UFormField name="document_sequence_ids">
        <USelectMenu
          v-model="selectedSequences"
          :items="sequenceOptions"
          placeholder="Seleccionar secuencias..."
          multiple
          searchable
          class="w-full"
        />
      </UFormField>
    </div>

    <USeparator />

    <!-- FACTURACIÓN ELECTRÓNICA -->
    <div class="space-y-3">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Facturación electrónica</p>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm font-medium">Requiere CAE</p>
            <p class="text-xs text-muted">Solicita CAE a ARCA/AFIP</p>
          </div>
          <USwitch v-model="form.requires_cae" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm font-medium">Electrónico</p>
            <p class="text-xs text-muted">Comprobante electrónico</p>
          </div>
          <USwitch v-model="form.is_electronic" />
        </div>
      </div>
    </div>

    <!-- COMPORTAMIENTO -->
    <div class="space-y-3">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Comportamiento</p>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm font-medium">Afecta stock</p>
            <p class="text-xs text-muted">Movimenta inventario</p>
          </div>
          <USwitch v-model="form.affects_stock" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
          <p class="text-sm font-medium">Afecta cuenta corriente</p>
          <p class="text-xs text-muted">Genera movimientos en la cuenta corriente del tercero al confirmar/anular</p>
          </div>
          <USwitch v-model="form.affects_accounting" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm font-medium">Libro IVA</p>
            <p class="text-xs text-muted">Se informa en libro IVA</p>
          </div>
          <USwitch v-model="form.affects_tax_book" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3">
          <div>
            <p class="text-sm font-medium">Afecta pagos</p>
            <p class="text-xs text-muted">Se aplica en pagos/cobros</p>
          </div>
          <USwitch v-model="form.affects_payment" />
        </div>
        <div class="flex items-center justify-between gap-3 rounded-lg border border-default p-3 col-span-2">
          <div>
            <p class="text-sm font-medium">Calcula impuestos</p>
            <p class="text-xs text-muted">El motor fiscal calcula impuestos para este tipo</p>
          </div>
          <USwitch :model-value="form.calculates_taxes ?? true" @update:model-value="(v: boolean | 'indeterminate') => form.calculates_taxes = v === true" />
        </div>
      </div>
      <UAlert
        v-if="form.calculates_taxes === false"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-triangle"
        class="text-xs"
        title="Comprobante sin desglose de impuestos"
        description="El motor fiscal no calculará impuestos para documentos de este tipo (ej: comprobantes X o internos)."
      />
    </div>

    <USeparator />

    <!-- ESTADO -->
    <div class="flex items-center justify-between gap-3 rounded-lg border p-3"
      :class="form.active ? 'border-success/40 bg-success/5' : 'border-default'"
    >
      <div class="flex items-center gap-2">
        <UIcon :name="form.active ? 'i-lucide-check-circle' : 'i-lucide-circle-off'" class="size-4"
          :class="form.active ? 'text-success' : 'text-muted'" />
        <div>
          <p class="text-sm font-medium">{{ form.active ? 'Tipo de documento activo' : 'Tipo de documento inactivo' }}</p>
          <p class="text-xs text-muted">{{ form.active ? 'Disponible para crear documentos' : 'No aparecerá al crear documentos' }}</p>
        </div>
      </div>
      <USwitch v-model="form.active" color="success" />
    </div>

    <!-- IMPUESTOS -->
    <div class="border border-default rounded-lg p-4 space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="size-4" />
        <h4 class="text-sm font-semibold">Impuestos del tipo de documento</h4>
      </div>
      <p class="text-xs text-muted">
        Estos impuestos se aplican automáticamente al crear documentos de este tipo.
      </p>

      <!-- ITEM-LEVEL TAXES -->
      <div v-if="itemTaxes.length > 0">
        <p class="text-xs font-medium text-muted mb-2">Impuestos por ítem (se calculan por producto)</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tax in itemTaxes"
            :key="tax.id"
            type="button"
            class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
            :class="isTaxSelected(tax.id) ? 'border-primary bg-primary/10 text-primary' : 'border-default hover:border-primary/50'"
            @click="toggleTax(tax.id)"
          >
            {{ tax.name }} ({{ tax.rate }}%)
          </button>
        </div>
      </div>

      <!-- DOCUMENT-LEVEL TAXES -->
      <div v-if="documentTaxes.length > 0">
        <p class="text-xs font-medium text-muted mb-2">Impuestos por documento (se aplican al total)</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tax in documentTaxes"
            :key="tax.id"
            type="button"
            class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
            :class="isTaxSelected(tax.id) ? 'border-primary bg-primary/10 text-primary' : 'border-default hover:border-primary/50'"
            @click="toggleTax(tax.id)"
          >
            {{ tax.name }} ({{ tax.rate }}%)
          </button>
        </div>
      </div>

      <div v-if="itemTaxes.length === 0 && documentTaxes.length === 0" class="text-xs text-muted">
        No hay impuestos configurados en el sistema
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2 border-t border-default">
      <UButton label="Cancelar" variant="ghost" @click="emit('cancel')" />
      <UButton label="Guardar" type="submit" :loading="loading" />
    </div>

    <!-- Inline Sequence Creation -->
    <UModal v-model:open="showSeqCreate" title="Nueva secuencia" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <UForm :state="seqForm" class="space-y-4" @submit="handleSeqCreate">
          <UFormField label="Nombre" required>
            <UInput v-model="seqForm.name" placeholder="Ej: Factura A - PV 0001" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Punto de venta" required>
              <UInput v-model="seqForm.point_of_sale" placeholder="0001" />
            </UFormField>
            <UFormField label="Prefijo">
              <UInput v-model="seqForm.prefix" placeholder="A, B, C..." />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Rango inicio">
              <UInput v-model.number="seqForm.range_start" type="number" />
            </UFormField>
            <UFormField label="Rango fin">
              <UInput v-model.number="seqForm.range_end" type="number" />
            </UFormField>
          </div>
          <USwitch v-model="seqForm.automatic" label="Numeración automática" />
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="showSeqCreate = false" />
            <UButton label="Crear secuencia" color="primary" type="submit" :loading="seqCreating" />
          </div>
        </UForm>
      </template>
    </UModal>
  </form>
</template>
