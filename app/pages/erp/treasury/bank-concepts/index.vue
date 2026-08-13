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
  accounting_account: '',
  calculates_iva: false,
  iva_rate: 21,
  generates_credit: false,
  impacts_iva_book: false,
  default_percentage: null as number | null,
  is_active: true
})

const openCreate = () => {
  editingConcept.value = null
  Object.assign(form, {
    code: '', name: '', description: '', concept_type: 'COMMISSION',
    accounting_account: '', calculates_iva: false, iva_rate: 21,
    generates_credit: false, impacts_iva_book: false, default_percentage: null, is_active: true
  })
  modalOpen.value = true
}

const openEdit = (concept: any) => {
  editingConcept.value = concept
  Object.assign(form, {
    code: concept.code, name: concept.name, description: concept.description || '',
    concept_type: concept.concept_type, accounting_account: concept.accounting_account || '',
    calculates_iva: concept.calculates_iva || false,
    iva_rate: concept.iva_rate || 21,
    generates_credit: concept.generates_credit || false,
    impacts_iva_book: concept.impacts_iva_book || false,
    default_percentage: concept.default_percentage,
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
      <USelectMenu v-model="filterType" :items="[{ label: 'Todos', value: '' }, ...conceptTypeOptions]" placeholder="Tipo" class="w-48" />
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
          <UBadge :label="concept.concept_type" :color="conceptTypeBadge(concept.concept_type)" variant="soft" size="xs" />
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
    <UModal v-model:open="modalOpen" :title="editingConcept ? 'Editar concepto' : 'Nuevo concepto bancario'" :ui="{ width: 'max-w-lg' }">
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleSubmit">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Código" name="code" required>
              <UInput v-model="form.code" placeholder="Ej: COMISION" :disabled="!!editingConcept" />
            </UFormField>
            <UFormField label="Tipo" name="concept_type" required>
              <USelectMenu v-model="form.concept_type" :items="conceptTypeOptions" />
            </UFormField>
          </div>
          <UFormField label="Nombre" name="name" required>
            <UInput v-model="form.name" placeholder="Ej: Comisión bancaria" />
          </UFormField>
          <UFormField label="Descripción" name="description">
            <UInput v-model="form.description" placeholder="Descripción del concepto" />
          </UFormField>
          <UFormField label="Cuenta contable" name="accounting_account">
            <UInput v-model="form.accounting_account" placeholder="Ej: 6201" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UCheckbox v-model="form.calculates_iva" label="Calcula IVA" />
            <div v-if="form.calculates_iva">
              <UFormField label="Alícuota IVA %" name="iva_rate">
                <UInput v-model.number="form.iva_rate" type="number" step="0.1" />
              </UFormField>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UCheckbox v-model="form.generates_credit" label="Genera crédito fiscal" />
            <UCheckbox v-model="form.impacts_iva_book" label="Impacta Libro IVA" />
          </div>
          <UFormField label="Porcentaje por defecto %" name="default_percentage">
            <UInput v-model.number="form.default_percentage" type="number" step="0.01" placeholder="Ej: 0.8" />
          </UFormField>
          <UCheckbox v-model="form.is_active" label="Activo" />
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton label="Guardar" type="submit" :loading="saving" />
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
