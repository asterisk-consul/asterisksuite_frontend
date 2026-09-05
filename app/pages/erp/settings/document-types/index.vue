<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCompanyRole } from '~/composables/useCompanyRole'
import { useDocumentTypes } from '~/modulos/erp/documents/documents-types/composable/useDocumentTypes'
import DocumentTypeModal from '~/modulos/erp/documents/documents-types/components/DocumentTypeModal.vue'
import type { DocumentTypeFormData } from '~/modulos/erp/documents/documents-types/components/DocumentTypeForm.vue'
import type {
  DocumentsType,
  CustomFieldConfig
} from '~/modulos/erp/documents/documents-types/types/documents-types.types'
import type { DropdownMenuItem } from '@nuxt/ui'

const { isOwnerOrAdmin } = useCompanyRole()
const docTypes = useDocumentTypes()
const toast = useToast()
const router = useRouter()

if (!isOwnerOrAdmin.value) router.push('/erp/treasury/dashboard')

const activeTab = ref('todos')
const modalOpen = ref(false)
const editingType = ref<any>(null)
const deleteModalOpen = ref(false)
const deletingType = ref<DocumentsType | null>(null)
const customFieldsModalOpen = ref(false)
const editingCustomFields = ref<CustomFieldConfig[]>([])
const searchQuery = ref('')
const filterCategory = ref<string | null>(null)
const saving = ref(false)

const selectedCategory = computed({
  get: () => categoryOptions.find(o => o.value === filterCategory.value) ?? categoryOptions[0],
  set: (val) => { filterCategory.value = val?.value ?? '' }
})

onMounted(() => docTypes.init())

// Static counts for badges
const saleCount = computed(() => docTypes.items.value.filter((t) => t.direction === 1).length)
const purchaseCount = computed(() => docTypes.items.value.filter((t) => t.direction === -1).length)
const totalCount = computed(() => docTypes.items.value.length)

// Filtered lists
const filteredSaleTypes = computed(() => {
  let list = docTypes.items.value.filter((t) => t.direction === 1)
  if (filterCategory.value) list = list.filter((t) => t.category === filterCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }
  return list
})

const filteredPurchaseTypes = computed(() => {
  let list = docTypes.items.value.filter((t) => t.direction === -1)
  if (filterCategory.value) list = list.filter((t) => t.category === filterCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }
  return list
})

const filteredAllTypes = computed(() => {
  let list = [...docTypes.items.value]
  if (filterCategory.value) list = list.filter((t) => t.category === filterCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => t.code.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }
  return list
})

const openCreate = () => {
  editingType.value = null
  modalOpen.value = true
}
const openEdit = (type: DocumentsType) => {
  editingType.value = { ...type }
  modalOpen.value = true
}

const handleSubmit = async (formData: DocumentTypeFormData) => {
  try {
    saving.value = true
    if (editingType.value) {
      await docTypes.update(editingType.value.id, { ...formData })
      toast.add({ title: 'Tipo actualizado', color: 'success' })
    } else {
      await docTypes.create({ ...formData })
      toast.add({ title: 'Tipo creado', color: 'success' })
    }
    modalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e?.data?.message || e?.message,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (type: DocumentsType) => {
  deletingType.value = type
  deleteModalOpen.value = true
}
const handleDelete = async () => {
  if (!deletingType.value) return
  try {
    await docTypes.remove(deletingType.value.id)
    toast.add({ title: 'Eliminado', color: 'success' })
    deleteModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', color: 'error' })
  }
}

const openCustomFields = (type: DocumentsType) => {
  editingType.value = type
  editingCustomFields.value = JSON.parse(JSON.stringify(type.custom_fields_config || []))
  customFieldsModalOpen.value = true
}
const addCustomField = () => {
  editingCustomFields.value.push({ key: '', label: '', type: 'text', required: false, placeholder: '' })
}
const removeCustomField = (i: number) => {
  editingCustomFields.value.splice(i, 1)
}
const saveCustomFields = async () => {
  if (!editingType.value) return
  try {
    await docTypes.update(editingType.value.id, { custom_fields_config: editingCustomFields.value })
    toast.add({ title: 'Guardado', color: 'success' })
    customFieldsModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Error', color: 'error' })
  }
}

const handleExportExcel = () => {
  const { exportToExcel } = useExcelExport()
  exportToExcel({
    filename: 'tipos_documento',
    sheetName: 'Tipos',
    columns: [
      { key: 'code', label: 'Código', width: 15 },
      { key: 'description', label: 'Descripción', width: 30 },
      { key: 'direction', label: 'Dirección', width: 15, format: (v) => (v === 1 ? 'Venta' : 'Compra') },
      { key: 'category', label: 'Categoría', width: 20 },
      { key: 'letter_type', label: 'Letra', width: 8 },
      { key: 'afip_code', label: 'AFIP', width: 12 },
      { key: 'active', label: 'Activo', width: 10, format: (v) => (v ? 'Sí' : 'No') },
      { key: 'affects_payment', label: 'Afecta Pagos', width: 12, format: (v) => (v ? 'Sí' : 'No') }
    ],
    data: docTypes.items.value
  })
}

const dataActions: DropdownMenuItem[] = [
  { label: 'Exportar Excel', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }
]

const categoryBadgeColor = (cat: string | null | undefined) =>
  ({
    INVOICE: 'primary',
    CREDIT_NOTE: 'success',
    DEBIT_NOTE: 'error',
    ORDER: 'info',
    QUOTE: 'warning',
    RECEIPT: 'secondary',
    REMITO: 'info'
  })[cat ?? ''] ?? 'neutral'

const categoryOptions = [
  { label: 'Todas', value: '' },
  { label: 'Factura', value: 'INVOICE' },
  { label: 'Nota Crédito', value: 'CREDIT_NOTE' },
  { label: 'Nota Débito', value: 'DEBIT_NOTE' },
  { label: 'Orden', value: 'ORDER' },
  { label: 'Presupuesto', value: 'QUOTE' },
  { label: 'Recibo', value: 'RECEIPT' },
  { label: 'Remito', value: 'REMITO' }
]

const fieldTypeOptions = [
  { label: 'Texto', value: 'text' },
  { label: 'Número', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Selección', value: 'select' },
  { label: 'Largo', value: 'textarea' },
  { label: 'Sí/No', value: 'checkbox' }
]

const tabs = [
  { label: 'Venta', icon: 'i-lucide-trending-up', value: 'venta', slot: 'venta' },
  { label: 'Compra', icon: 'i-lucide-trending-down', value: 'compra', slot: 'compra' },
  { label: 'Todos', icon: 'i-lucide-list', value: 'todos', slot: 'todos' }
]

const badgeForTab = (index: number) => {
  if (index === 0) return saleCount.value
  if (index === 1) return purchaseCount.value
  return totalCount.value
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Tipos de Documento" description="Configurar facturas, notas, órdenes y comprobantes">
      <template #links>
        <UFieldGroup>
          <UButton color="neutral" variant="subtle" label="Datos" icon="i-lucide-database" />
          <UDropdownMenu :items="dataActions">
            <UButton color="neutral" variant="outline" icon="i-lucide-chevron-down" />
          </UDropdownMenu>
        </UFieldGroup>
        <UButton label="Nuevo tipo" icon="i-lucide-plus" color="primary" variant="solid" @click="openCreate" />
      </template>
    </AppPageHeader>

    <!-- SEARCH + FILTER -->
    <div class="flex items-center gap-3">
      <UInput
        v-model="searchQuery"
        placeholder="Buscar por código o nombre..."
        icon="i-lucide-search"
        class="flex-1 max-w-md"
      />
      <USelectMenu v-model="selectedCategory" :items="categoryOptions" placeholder="Categoría" class="w-48" />
    </div>

    <!-- TABS -->
    <UTabs v-model="activeTab" :items="tabs" variant="link">
      <!-- TAB: VENTA (index 0) -->
      <template #venta>
        <div v-if="filteredSaleTypes.length === 0" class="text-center py-8 text-muted text-sm">
          No hay tipos de venta
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <div
            v-for="type in filteredSaleTypes"
            :key="type.id"
            class="p-4 rounded-lg border border-default bg-default hover:border-primary/50 transition-colors cursor-pointer"
            @click="openEdit(type)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <UBadge :label="type.code" color="success" variant="soft" size="sm" />
                <UBadge v-if="type.letter_type" :label="type.letter_type" color="primary" variant="outline" size="xs" />
              </div>
              <UBadge
                v-if="type.category"
                :label="type.category"
                :color="categoryBadgeColor(type.category)"
                variant="soft"
                size="xs"
              />
            </div>
            <p class="text-sm font-medium">{{ type.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-xs text-muted flex-wrap">
               <span v-if="type.affects_stock">📦 Stock</span>
               <span v-if="type.affects_accounting">📊 Cta. Cte.</span>
               <span v-if="type.affects_tax_book">📋 IVA</span>
               <span v-if="type.affects_payment">💰 Pagos</span>
              <span v-if="type.requires_cae">🔐 CAE</span>
              <span v-if="type.is_electronic">⚡ Electrónico</span>
               <span v-if="type.afip_code">🏷️ {{ type.afip_code }}</span>
               <template v-if="type.document_type_sequences?.length">
                 <span v-for="dts in type.document_type_sequences" :key="dts.id" class="text-primary font-medium">
                   🔢 {{ dts.document_sequences?.point_of_sale }}{{ dts.document_sequences?.prefix ? `-${dts.document_sequences.prefix}` : '' }}
                 </span>
               </template>
               <span v-else-if="type.document_sequences" class="text-primary">
                 🔢 Seq: {{ type.document_sequences.point_of_sale }}
               </span>
            </div>
            <div class="flex items-center gap-1 mt-3">
              <UButton icon="i-lucide-settings" variant="ghost" size="xs" @click.stop="openCustomFields(type)" />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click.stop="confirmDelete(type)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- TAB: COMPRA (index 1) -->
      <template #compra>
        <div v-if="filteredPurchaseTypes.length === 0" class="text-center py-8 text-muted text-sm">
          No hay tipos de compra
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <div
            v-for="type in filteredPurchaseTypes"
            :key="type.id"
            class="p-4 rounded-lg border border-default bg-default hover:border-primary/50 transition-colors cursor-pointer"
            @click="openEdit(type)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <UBadge :label="type.code" color="error" variant="soft" size="sm" />
                <UBadge v-if="type.letter_type" :label="type.letter_type" color="primary" variant="outline" size="xs" />
              </div>
              <UBadge
                v-if="type.category"
                :label="type.category"
                :color="categoryBadgeColor(type.category)"
                variant="soft"
                size="xs"
              />
            </div>
            <p class="text-sm font-medium">{{ type.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-xs text-muted flex-wrap">
               <span v-if="type.affects_stock">📦 Stock</span>
               <span v-if="type.affects_accounting">📊 Cta. Cte.</span>
               <span v-if="type.affects_tax_book">📋 IVA</span>
               <span v-if="type.affects_payment">💰 Pagos</span>
              <span v-if="type.requires_cae">🔐 CAE</span>
              <span v-if="type.is_electronic">⚡ Electrónico</span>
               <span v-if="type.afip_code">🏷️ {{ type.afip_code }}</span>
               <template v-if="type.document_type_sequences?.length">
                 <span v-for="dts in type.document_type_sequences" :key="dts.id" class="text-primary font-medium">
                   🔢 {{ dts.document_sequences?.point_of_sale }}{{ dts.document_sequences?.prefix ? `-${dts.document_sequences.prefix}` : '' }}
                 </span>
               </template>
               <span v-else-if="type.document_sequences" class="text-primary">
                 🔢 Seq: {{ type.document_sequences.point_of_sale }}
               </span>
            </div>
            <div class="flex items-center gap-1 mt-3">
              <UButton icon="i-lucide-settings" variant="ghost" size="xs" @click.stop="openCustomFields(type)" />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click.stop="confirmDelete(type)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- TAB: TODOS (index 2) -->
      <template #todos>
        <div v-if="filteredAllTypes.length === 0" class="text-center py-8 text-muted text-sm">No hay tipos</div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          <div
            v-for="type in filteredAllTypes"
            :key="type.id"
            class="p-4 rounded-lg border border-default bg-default hover:border-primary/50 transition-colors cursor-pointer"
            @click="openEdit(type)"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <UBadge
                  :label="type.code"
                  :color="type.direction === 1 ? 'success' : 'error'"
                  variant="soft"
                  size="sm"
                />
                <UBadge v-if="type.letter_type" :label="type.letter_type" color="primary" variant="outline" size="xs" />
              </div>
              <UBadge
                v-if="type.category"
                :label="type.category"
                :color="categoryBadgeColor(type.category)"
                variant="soft"
                size="xs"
              />
            </div>
            <p class="text-sm font-medium">{{ type.description }}</p>
            <div class="flex items-center gap-2 mt-2 text-xs text-muted flex-wrap">
               <span v-if="type.affects_stock">📦 Stock</span>
               <span v-if="type.affects_accounting">📊 Cta. Cte.</span>
               <span v-if="type.affects_tax_book">📋 IVA</span>
               <span v-if="type.affects_payment">💰 Pagos</span>
              <span v-if="type.requires_cae">🔐 CAE</span>
              <span v-if="type.is_electronic">⚡ Electrónico</span>
               <span v-if="type.afip_code">🏷️ {{ type.afip_code }}</span>
               <template v-if="type.document_type_sequences?.length">
                 <span v-for="dts in type.document_type_sequences" :key="dts.id" class="text-primary font-medium">
                   🔢 {{ dts.document_sequences?.point_of_sale }}{{ dts.document_sequences?.prefix ? `-${dts.document_sequences.prefix}` : '' }}
                 </span>
               </template>
               <span v-else-if="type.document_sequences" class="text-primary">
                 🔢 Seq: {{ type.document_sequences.point_of_sale }}
               </span>
            </div>
            <div class="flex items-center gap-1 mt-3">
              <UButton icon="i-lucide-settings" variant="ghost" size="xs" @click.stop="openCustomFields(type)" />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click.stop="confirmDelete(type)"
              />
            </div>
          </div>
        </div>
      </template>
    </UTabs>

    <DocumentTypeModal
      v-model:open="modalOpen"
      :document-type="editingType"
      :loading="saving"
      @success="handleSubmit"
    />

    <UModal v-model:open="customFieldsModalOpen" title="Campos personalizados" :ui="{ width: 'max-w-2xl' }">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-muted">
            Campos para
            <strong>{{ editingType?.code }}</strong>
          </p>
          <div v-for="(field, i) in editingCustomFields" :key="i" class="p-3 border border-default rounded-lg">
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Clave"><UInput v-model="field.key" /></UFormField>
              <UFormField label="Etiqueta"><UInput v-model="field.label" /></UFormField>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-2">
              <UFormField label="Tipo"><USelectMenu v-model="field.type" :items="fieldTypeOptions" /></UFormField>
              <UFormField label="Placeholder"><UInput v-model="field.placeholder" /></UFormField>
            </div>
            <div class="flex items-center gap-4 mt-2">
              <UCheckbox v-model="field.required" label="Obligatorio" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" @click="removeCustomField(i)" />
            </div>
          </div>
          <UButton label="Agregar" icon="i-lucide-plus" variant="outline" size="sm" @click="addCustomField" />
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="customFieldsModalOpen = false" />
            <UButton label="Guardar" color="primary" @click="saveCustomFields" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteModalOpen" title="Eliminar tipo">
      <template #body>
        <p>
          ¿Eliminar
          <strong>{{ deletingType?.code }}</strong>
          ?
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
