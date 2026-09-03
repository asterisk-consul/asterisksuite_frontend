<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import ExcelImportDialog from '~/components/documents/ExcelImportDialog.vue'
import { useAccountsService } from '~/modulos/contabilidad/service/accounts.service'
import type { Account, AccountType } from '~/modulos/contabilidad/types/accounts.types'

definePageMeta({ middleware: ['auth'] })

const service = useAccountsService()
const toast = useToast()

const accounts = ref<Account[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showImportDialog = ref(false)

// CRUD state
const modalOpen = ref(false)
const editingAccount = ref<Account | null>(null)
const saving = ref(false)
const deleteModalOpen = ref(false)
const deletingAccount = ref<Account | null>(null)

const form = reactive({
  code: '',
  name: '',
  account_type: 'ASSET' as AccountType,
  parent_id: '' as string
})

onMounted(async () => {
  try {
    accounts.value = await service.findAll()
  } catch (e: any) {
    error.value = e?.data?.message || 'Error al cargar cuentas'
  } finally {
    loading.value = false
  }
})

const accountTypeLabels: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  REVENUE: 'Ingresos',
  EXPENSE: 'Gastos'
}

const accountTypeIcons: Record<AccountType, string> = {
  ASSET: 'i-lucide-trending-up',
  LIABILITY: 'i-lucide-trending-down',
  EQUITY: 'i-lucide-scale',
  REVENUE: 'i-lucide-arrow-up-right',
  EXPENSE: 'i-lucide-arrow-down-right'
}

const accountTypeColors: Record<AccountType, string> = {
  ASSET: 'success',
  LIABILITY: 'error',
  EQUITY: 'primary',
  REVENUE: 'info',
  EXPENSE: 'warning'
}

// Build tree for UTree
const treeItems = computed<TreeItem[]>(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let list = accounts.value
  if (q) {
    list = list.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
  }

  const buildTree = (parentId: string | null): TreeItem[] => {
    return list
      .filter((a) => a.parent_id === parentId)
      .map((a) => ({
        label: `${a.code} - ${a.name}`,
        icon: accountTypeIcons[a.account_type] || 'i-lucide-circle',
        defaultExpanded: !parentId,
        value: a.id,
        account: a,
        children: buildTree(a.id)
      }))
  }

  return buildTree(null)
})

// CRUD functions
const openCreate = (parentId?: string) => {
  editingAccount.value = null
  Object.assign(form, {
    code: '',
    name: '',
    account_type: 'ASSET',
    parent_id: parentId || ''
  })
  modalOpen.value = true
}

const openEdit = (account: Account) => {
  editingAccount.value = account
  Object.assign(form, {
    code: account.code,
    name: account.name,
    account_type: account.account_type,
    parent_id: account.parent_id || ''
  })
  modalOpen.value = true
}

const handleSubmit = async () => {
  saving.value = true
  try {
    if (editingAccount.value) {
      await service.update(editingAccount.value.id, form)
      toast.add({ title: 'Cuenta actualizada', color: 'success' })
    } else {
      await service.create(form)
      toast.add({ title: 'Cuenta creada', color: 'success' })
    }
    modalOpen.value = false
    accounts.value = await service.findAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (account: Account) => {
  deletingAccount.value = account
  deleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!deletingAccount.value) return
  try {
    await service.remove(deletingAccount.value.id)
    toast.add({ title: 'Cuenta eliminada', color: 'success' })
    deleteModalOpen.value = false
    accounts.value = await service.findAll()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

const accountTypeOptions = [
  { label: 'Activo', value: 'ASSET' },
  { label: 'Pasivo', value: 'LIABILITY' },
  { label: 'Patrimonio', value: 'EQUITY' },
  { label: 'Ingresos', value: 'REVENUE' },
  { label: 'Gastos', value: 'EXPENSE' }
]

// Export
const handleExportExcel = () => {
  window.open('/api/contabilidad/accounts/export?format=xlsx', '_blank')
}

const handleExportCSV = () => {
  window.open('/api/contabilidad/accounts/export?format=csv', '_blank')
}

// Import
const importColumns = [
  { key: 'code', label: 'Código', required: true, type: 'string' as const },
  { key: 'name', label: 'Nombre', required: true, type: 'string' as const },
  { key: 'account_type', label: 'Tipo', required: true, type: 'string' as const },
  { key: 'parent_code', label: 'Cuenta padre', required: false, type: 'string' as const }
]

const importEndpoint = '/api/contabilidad/accounts/import'

const onImportSuccess = async () => {
  accounts.value = await service.findAll()
}

const parentOptions = computed(() => [
  { label: 'Sin padre (raíz)', value: '' },
  ...accounts.value.map((a) => ({
    label: `${a.code} - ${a.name}`,
    value: a.id
  }))
])

const selectedParent = computed({
  get: () => parentOptions.value.find((o) => o.value === form.parent_id) ?? parentOptions.value[0],
  set: (val: any) => {
    form.parent_id = val?.value ?? ''
  }
})

const selectedType = computed({
  get: () => accountTypeOptions.find((o) => o.value === form.account_type) ?? accountTypeOptions[0],
  set: (val: any) => {
    form.account_type = val?.value ?? 'ASSET'
  }
})
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader title="Plan de Cuentas" description="Plan contable de la empresa">
      <template #links>
        <UDropdownMenu :items="[
          [{ label: 'Excel (.xlsx)', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }, { label: 'CSV', icon: 'i-lucide-file-text', onSelect: handleExportCSV }]
        ]">
          <UButton label="Exportar" icon="i-lucide-download" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-down" />
        </UDropdownMenu>
        <UButton label="Importar" icon="i-lucide-upload" color="neutral" variant="outline" @click="showImportDialog = true" />
        <UButton label="Nueva cuenta" icon="i-lucide-plus" color="primary" variant="solid" @click="openCreate()" />
      </template>
    </AppPageHeader>

    <UAlert v-if="error" icon="i-lucide-alert-triangle" color="error" variant="subtle" :title="error" />

    <!-- SEARCH -->
    <UInput v-model="searchQuery" placeholder="Buscar por código o nombre..." icon="i-lucide-search" class="max-w-md" />

    <!-- TREE -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Estructura del Plan</h3>
          <div class="flex gap-2">
            <UBadge
              v-for="(label, type) in accountTypeLabels"
              :key="type"
              :label="label"
              :color="accountTypeColors[type as AccountType]"
              variant="soft"
              size="xs"
            />
          </div>
        </div>
      </template>

      <div v-if="loading" class="flex justify-center py-8"><ULoader /></div>
      <div v-else-if="treeItems.length === 0" class="text-center py-8 text-muted text-sm">No hay cuentas</div>
      <UTree v-else :items="treeItems" :default-expand-all="true" :get-key="(item: any) => item.value || item.label">
        <template #item="{ item, expanded, handleToggle }">
          <div class="flex items-center justify-between w-full group">
            <div class="flex items-center gap-2">
              <!-- Chevron solo si tiene hijos -->
              <UIcon
                v-if="item.children?.length"
                :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 text-muted cursor-pointer"
                @click.stop="handleToggle"
              />
              <span v-else class="size-4" />

              <UIcon :name="item.icon || 'i-lucide-circle'" class="size-4 text-muted" />
              <span class="text-sm">{{ item.label }}</span>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                size="xs"
                title="Agregar subcuenta"
                @click.stop="openCreate(item.account?.id)"
              />
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                size="xs"
                title="Editar"
                @click.stop="openEdit(item.account)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                title="Eliminar"
                @click.stop="confirmDelete(item.account)"
              />
            </div>
          </div>
        </template>
      </UTree>
    </UPageCard>

    <!-- CREATE/EDIT MODAL -->
    <UModal
      v-model:open="modalOpen"
      :title="editingAccount ? 'Editar cuenta' : 'Nueva cuenta'"
      :ui="{ width: 'max-w-lg' }"
    >
      <template #body>
        <UForm :state="form" class="space-y-4" @submit="handleSubmit">
          <UFormField label="Código" name="code" required>
            <UInput v-model="form.code" placeholder="Ej: 1.1.1" :disabled="!!editingAccount" />
          </UFormField>
          <UFormField label="Nombre" name="name" required>
            <UInput v-model="form.name" placeholder="Ej: Caja General" />
          </UFormField>
          <UFormField label="Tipo" name="account_type" required>
            <USelectMenu v-model="selectedType" :items="accountTypeOptions" />
          </UFormField>
          <UFormField label="Cuenta padre" name="parent_id">
            <USelectMenu v-model="selectedParent" :items="parentOptions" />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton label="Cancelar" variant="ghost" @click="modalOpen = false" />
            <UButton label="Guardar" type="submit" :loading="saving" />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- DELETE MODAL -->
    <UModal v-model:open="deleteModalOpen" title="Eliminar cuenta">
      <template #body>
        <p>
          ¿Eliminar la cuenta
          <strong>{{ deletingAccount?.code }} - {{ deletingAccount?.name }}</strong>
          ?
        </p>
        <div class="flex justify-end gap-2 pt-4">
          <UButton label="Cancelar" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Eliminar" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>

    <ExcelImportDialog
      v-model:open="showImportDialog"
      title="Importar plan de cuentas"
      description="Importar cuentas contables desde Excel. Las columnas son: Código, Nombre, Tipo, Cuenta padre"
      :columns="importColumns"
      :endpoint="importEndpoint"
      @success="onImportSuccess"
    />
  </UPage>
</template>
