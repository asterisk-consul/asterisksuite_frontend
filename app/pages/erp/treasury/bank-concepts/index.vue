<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCompanyRole } from '~/composables/useCompanyRole'
import { useBankConcepts } from '~/modulos/erp/bank-concepts/composable/useBankConcepts'

const { isOwnerOrAdmin } = useCompanyRole()
const bankConcepts = useBankConcepts()
const toast = useToast()

if (!isOwnerOrAdmin.value) {
  navigateTo('/erp/treasury/dashboard')
}

const modalOpen = ref(false)
const editingConcept = ref<any>(null)
const deleteModalOpen = ref(false)
const deletingConcept = ref<any>(null)
const saving = ref(false)

const searchQuery = ref('')
const filterType = ref('')

onMounted(() => bankConcepts.init())

const filteredConcepts = computed(() => {
  let list = bankConcepts.concepts.value
  if (filterType.value) {
    list = list.filter(c => c.concept_type === filterType.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  }
  return list
})

const form = reactive({
  code: '',
  name: '',
  description: '',
  concept_type: 'COMMISSION',
  nature: 'DEBIT' as 'DEBIT' | 'CREDIT',
  accounting_account: '',
  calculates_iva: false,
  iva_rate: 21,
  generates_credit: false,
  impacts_iva_book: false,
  default_percentage: null as number | null,
  affects_balance: true,
  requires_receipt: false,
  available_manual: true,
  available_payments: false,
  available_settlements: false,
  is_active: true
})

const openCreate = () => {
  editingConcept.value = null
  Object.assign(form, {
    code: '', name: '', description: '', concept_type: 'COMMISSION', nature: 'DEBIT',
    accounting_account: '', calculates_iva: false, iva_rate: 21,
    generates_credit: false, impacts_iva_book: false, default_percentage: null,
    affects_balance: true, requires_receipt: false,
    available_manual: true, available_payments: false, available_settlements: false, is_active: true
  })
  modalOpen.value = true
}

const openEdit = (concept: any) => {
  editingConcept.value = concept
  Object.assign(form, {
    code: concept.code, name: concept.name, description: concept.description || '',
    concept_type: concept.concept_type, nature: concept.nature || 'DEBIT',
    accounting_account: concept.accounting_account || '',
    calculates_iva: concept.calculates_iva || false,
    iva_rate: concept.iva_rate || 21,
    generates_credit: concept.generates_credit || false,
    impacts_iva_book: concept.impacts_iva_book || false,
    default_percentage: concept.default_percentage,
    affects_balance: concept.affects_balance ?? true,
    requires_receipt: concept.requires_receipt ?? false,
    available_manual: concept.available_manual ?? true,
    available_payments: concept.available_payments ?? false,
    available_settlements: concept.available_settlements ?? false,
    is_active: concept.is_active ?? true
  })
  modalOpen.value = true
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (editingConcept.value) {
      await bankConcepts.update(editingConcept.value.id, form)
      toast.add({ title: 'Concepto actualizado', color: 'success' })
    } else {
      await bankConcepts.create(form)
      toast.add({ title: 'Concepto creado', color: 'success' })
    }
    modalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message || e?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (concept: any) => {
  deletingConcept.value = concept
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingConcept.value) return
  try {
    await bankConcepts.remove(deletingConcept.value.id)
    toast.add({ title: 'Concepto eliminado', color: 'success' })
    deleteModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

const conceptTypeOptions = [
  { label: 'Comisión', value: 'COMMISSION' },
  { label: 'Impuesto', value: 'TAX' },
  { label: 'Gasto', value: 'EXPENSE' },
  { label: 'Interés', value: 'INTEREST' },
  { label: 'Ajuste', value: 'ADJUSTMENT' },
  { label: 'Otro', value: 'OTHER' }
]

const natureOptions = [
  { label: 'Débito (resta saldo)', value: 'DEBIT' },
  { label: 'Crédito (suma saldo)', value: 'CREDIT' }
]

const conceptTypeLabel = (type: string) => conceptTypeOptions.find(option => option.value === type)?.label ?? type

const conceptTypeBadge = (type: string) => ({
  COMMISSION: 'warning', TAX: 'error', EXPENSE: 'neutral',
  INTEREST: 'info', ADJUSTMENT: 'secondary', OTHER: 'primary'
}[type] || 'neutral')

const conceptTypeIcon = (type: string) => ({
  COMMISSION: 'i-lucide-percent', TAX: 'i-lucide-receipt', EXPENSE: 'i-lucide-trending-down',
  INTEREST: 'i-lucide-clock', ADJUSTMENT: 'i-lucide-settings', OTHER: 'i-lucide-circle-dot'
}[type] || 'i-lucide-circle-dot')
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Conceptos Bancarios"
      description="Configurar comisiones, impuestos, gastos e intereses bancarios"
    >
      <template #links>
        <UButton label="Nuevo concepto" icon="i-lucide-plus" color="primary" variant="solid" @click="openCreate" />
      </template>
    </AppPageHeader>

    <div class="flex items-center gap-3">
      <UInput v-model="searchQuery" placeholder="Buscar por código o nombre..." icon="i-lucide-search" class="flex-1 max-w-md" />
      <USelectMenu v-model="filterType" :items="[{ label: 'Todos', value: '' }, ...conceptTypeOptions]" value-key="value" placeholder="Tipo" class="w-48" />
    </div>

    <div v-if="bankConcepts.loading.value" class="flex justify-center py-8"><ULoader /></div>

    <div v-else-if="filteredConcepts.length === 0" class="text-center py-12 text-muted">
      <UIcon name="i-lucide-receipt" class="size-12 mx-auto mb-3 opacity-30" />
      <p>No hay conceptos configurados</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="concept in filteredConcepts"
        :key="concept.id"
        class="p-4 rounded-xl border border-default bg-default hover:border-primary/50 transition-colors cursor-pointer"
        @click="openEdit(concept)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-lg flex items-center justify-center" :class="`bg-${conceptTypeBadge(concept.concept_type)}/10`">
              <UIcon :name="conceptTypeIcon(concept.concept_type)" class="size-5" :class="`text-${conceptTypeBadge(concept.concept_type)}`" />
            </div>
            <div>
              <p class="text-sm font-semibold">{{ concept.name }}</p>
              <p class="text-xs text-muted">{{ concept.code }}</p>
            </div>
          </div>
          <UBadge :label="conceptTypeLabel(concept.concept_type)" :color="conceptTypeBadge(concept.concept_type)" variant="soft" size="xs" />
        </div>

        <div class="space-y-1.5 text-xs text-muted">
          <div v-if="concept.accounting_account" class="flex items-center gap-1">
            <UIcon name="i-lucide-book" class="size-3" />
            <span>Cuenta: {{ concept.accounting_account }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="concept.calculates_iva" class="text-success">✓ IVA {{ concept.iva_rate }}%</span>
            <span v-if="concept.generates_credit" class="text-primary">✓ Crédito fiscal</span>
            <span v-if="concept.impacts_iva_book" class="text-info">✓ Libro IVA</span>
          </div>
          <div v-if="concept.default_percentage" class="text-muted">
            % por defecto: {{ concept.default_percentage }}%
          </div>
        </div>

        <div class="flex items-center gap-1 mt-3 pt-2 border-t border-default">
          <UButton icon="i-lucide-pencil" variant="ghost" size="xs" @click.stop="openEdit(concept)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click.stop="confirmDelete(concept)" />
        </div>
      </div>
    </div>

    <!-- CREATE/EDIT MODAL -->
    <UModal
      v-model:open="modalOpen"
      :title="editingConcept ? 'Editar concepto bancario' : 'Nuevo concepto bancario'"
      description="Definí cómo se clasifica el concepto y en qué operaciones puede utilizarse."
      :ui="{ content: 'w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto' }"
    >
      <template #body>
        <UForm :state="form" class="space-y-5" @submit="handleSubmit">
          <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
            <div>
              <h3 class="font-semibold">Identificación</h3>
              <p class="text-sm text-muted">Datos que permiten reconocer el concepto en movimientos y reportes.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Código" name="code" required hint="No se puede cambiar luego de crearlo.">
                <UInput v-model="form.code" placeholder="Ej.: COMISION_TRANSF" :disabled="!!editingConcept" class="w-full" />
              </UFormField>
              <UFormField label="Tipo de concepto" name="concept_type" required>
                <USelectMenu v-model="form.concept_type" :items="conceptTypeOptions" value-key="value" placeholder="Seleccionar tipo" class="w-full" />
              </UFormField>
              <UFormField label="Nombre" name="name" required class="sm:col-span-2">
                <UInput v-model="form.name" placeholder="Ej.: Comisión por transferencia" class="w-full" />
              </UFormField>
              <UFormField label="Descripción" name="description" class="sm:col-span-2">
                <UTextarea v-model="form.description" placeholder="Explicá cuándo corresponde utilizar este concepto" :rows="2" class="w-full" />
              </UFormField>
            </div>
          </section>

          <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
            <div>
              <h3 class="font-semibold">Impacto bancario y contable</h3>
              <p class="text-sm text-muted">Indicá si el movimiento descuenta o acredita dinero y su configuración impositiva.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Impacto en el banco" name="nature" required>
                <USelectMenu v-model="form.nature" :items="natureOptions" value-key="value" placeholder="Seleccionar impacto" class="w-full" />
              </UFormField>
              <UFormField label="Cuenta contable" name="accounting_account" hint="Opcional">
                <UInput v-model="form.accounting_account" placeholder="Ej.: 6.2.01" class="w-full" />
              </UFormField>
              <UFormField label="Porcentaje predeterminado" name="default_percentage" hint="Se usará como valor inicial al cargarlo.">
                <UInput v-model.number="form.default_percentage" type="number" min="0" max="100" step="0.01" placeholder="Ej.: 0,80" class="w-full">
                  <template #trailing>%</template>
                </UInput>
              </UFormField>
              <UFormField v-if="form.calculates_iva" label="Alícuota de IVA" name="iva_rate">
                <UInput v-model.number="form.iva_rate" type="number" min="0" max="100" step="0.1" class="w-full">
                  <template #trailing>%</template>
                </UInput>
              </UFormField>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Calcula IVA</p><p class="text-xs text-muted">Agrega IVA sobre el importe base.</p></div>
                <USwitch v-model="form.calculates_iva" aria-label="Calcula IVA" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Genera crédito fiscal</p><p class="text-xs text-muted">El IVA puede computarse como crédito fiscal.</p></div>
                <USwitch v-model="form.generates_credit" aria-label="Genera crédito fiscal" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Impacta en el Libro IVA</p><p class="text-xs text-muted">Incluye el concepto en la registración fiscal.</p></div>
                <USwitch v-model="form.impacts_iva_book" aria-label="Impacta en el Libro IVA" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Afecta el saldo bancario</p><p class="text-xs text-muted">Suma o resta el importe del saldo de la cuenta.</p></div>
                <USwitch v-model="form.affects_balance" aria-label="Afecta el saldo bancario" />
              </div>
            </div>
          </section>

          <section class="space-y-4 rounded-xl border border-default p-4 sm:p-5">
            <div>
              <h3 class="font-semibold">Disponibilidad</h3>
              <p class="text-sm text-muted">Elegí en qué circuitos se podrá seleccionar este concepto.</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Carga manual</p><p class="text-xs text-muted">Disponible al registrar movimientos manuales.</p></div>
                <USwitch v-model="form.available_manual" aria-label="Disponible para carga manual" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Pagos y cobros</p><p class="text-xs text-muted">Disponible en transferencias bancarias.</p></div>
                <USwitch v-model="form.available_payments" aria-label="Disponible en pagos y cobros" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Liquidaciones</p><p class="text-xs text-muted">Disponible en inversiones y liquidaciones.</p></div>
                <USwitch v-model="form.available_settlements" aria-label="Disponible en liquidaciones" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3">
                <div><p class="text-sm font-medium">Requiere comprobante</p><p class="text-xs text-muted">Solicita documentación respaldatoria.</p></div>
                <USwitch v-model="form.requires_receipt" aria-label="Requiere comprobante" />
              </div>
              <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3 sm:col-span-2">
                <div><p class="text-sm font-medium">Concepto activo</p><p class="text-xs text-muted">Los conceptos inactivos dejan de estar disponibles para nuevas operaciones.</p></div>
                <USwitch v-model="form.is_active" color="success" aria-label="Concepto activo" />
              </div>
            </div>
          </section>

          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton :label="editingConcept ? 'Guardar cambios' : 'Crear concepto'" type="submit" icon="i-lucide-save" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar concepto">
      <template #body>
        <p>¿Eliminar el concepto <strong>{{ deletingConcept?.name }}</strong>?</p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
