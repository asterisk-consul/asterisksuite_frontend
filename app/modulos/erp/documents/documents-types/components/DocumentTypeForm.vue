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
  active: boolean
  category: string
  letter_type: string
  afip_code: string
  requires_cae: boolean
  is_electronic: boolean
  document_sequence_id: string
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
  affects_stock: false, affects_accounting: true, affects_tax_book: false,
  active: true, category: '', letter_type: '', afip_code: '',
  requires_cae: false, is_electronic: false, document_sequence_id: '', tax_ids: []
}

const form = reactive<DocumentTypeFormData>({ ...defaultForm })

watch(() => props.modelValue, (val) => {
  if (!val) { Object.assign(form, { ...defaultForm }); return }
  Object.assign(form, val)
}, { immediate: true })

watch(form, (val) => { emit('update:modelValue', { ...val }) }, { deep: true })

const handleSubmit = () => { emit('submit', { ...form }) }

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
    form.document_sequence_id = created.id
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

const sequenceOptions = computed(() => [
  { label: 'Sin secuencia', value: '' },
  ...sequencesStore.items.map(s => ({
    label: `${s.name} (PV: ${s.point_of_sale}${s.prefix ? ' - ' + s.prefix : ''})`,
    value: s.id
  }))
])

const selectedDirection = computed({
  get: () => directionOptions.find(o => o.value === form.direction) ?? directionOptions[0],
  set: (val: any) => { form.direction = val?.value ?? val ?? 1 }
})

const selectedCategory = computed({
  get: () => categoryOptions.find(o => o.value === form.category) ?? categoryOptions[0],
  set: (val: any) => { form.category = val?.value ?? val ?? '' }
})

const selectedSequence = computed({
  get: () => sequenceOptions.value.find(o => o.value === form.document_sequence_id) ?? sequenceOptions.value[0],
  set: (val: any) => { form.document_sequence_id = val?.value ?? val ?? '' }
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
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
    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Código AFIP" name="afip_code">
        <UInput v-model="form.afip_code" placeholder="Ej: 01, 06, 11" />
      </UFormField>
      <div>
        <UFormField label="Secuencia de numeración" name="document_sequence_id">
          <USelectMenu v-model="selectedSequence" :items="sequenceOptions" placeholder="Seleccionar..." />
        </UFormField>
        <UButton label="Crear secuencia" variant="ghost" size="xs" icon="i-lucide-plus" class="mt-1" @click="openSeqCreate" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="flex items-end gap-4 pb-1">
        <UCheckbox v-model="form.requires_cae" label="Requiere CAE" />
        <UCheckbox v-model="form.is_electronic" label="Electrónico" />
      </div>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <UCheckbox v-model="form.affects_stock" label="Afecta stock" />
      <UCheckbox v-model="form.affects_accounting" label="Afecta contabilidad" />
      <UCheckbox v-model="form.affects_tax_book" label="Libro IVA" />
    </div>
    <UCheckbox v-model="form.active" label="Activo" />

    <!-- TAXES SECTION -->
    <div class="border border-default rounded-lg p-4 space-y-3">
      <h4 class="text-sm font-semibold flex items-center gap-2">
        <UIcon name="i-lucide-receipt" class="size-4" />
        Impuestos del tipo de documento
      </h4>
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

    <div class="flex justify-end gap-2 pt-4">
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
          <UCheckbox v-model="seqForm.automatic" label="Numeración automática" />
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="showSeqCreate = false" />
            <UButton label="Crear secuencia" color="primary" type="submit" :loading="seqCreating" />
          </div>
        </UForm>
      </template>
    </UModal>
  </form>
</template>
