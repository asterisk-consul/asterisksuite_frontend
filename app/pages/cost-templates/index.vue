<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  breadcrumb: [{ label: 'Fabricación', to: '/fabricacion' }, { label: 'Templates de Costos' }]
})

import { storeToRefs } from 'pinia'
import { useCostTemplatesStore } from '~/modulos/logistica/master-data/product/cost-templates/store/cost-templates.store'
import { useCostTemplates } from '~/modulos/logistica/master-data/product/cost-templates/composables/useCostTemplates'
import {
  costTemplateColumns,
  costComponentColumns
} from '~/modulos/logistica/master-data/product/cost-templates/columns/cost-template.columns'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import CostComponentForm from '~/modulos/logistica/master-data/product/cost-templates/components/CostComponentForm.vue'
import type {
  CostTemplate,
  CostComponent
} from '~/modulos/logistica/master-data/product/cost-templates/types/cost-template.types'
import type { SortingState } from '@tanstack/vue-table'

useHead({ title: 'Templates de costo' })

const router = useRouter()
const toast = useToast()

const store = useCostTemplatesStore()
const { templates, components, loading } = storeToRefs(store)
const { init, deleteTemplate, deleteComponent } = useCostTemplates()

onMounted(() => init())

// =========================
// TABS
// =========================

const activeTab = ref('templates')

const tabs = [
  { label: 'Templates', slot: 'templates', icon: 'i-lucide-layout-template', value: 'templates' },
  { label: 'Componentes', slot: 'components', icon: 'i-lucide-puzzle', value: 'components' }
]

// =========================
// SORTING
// =========================

const templateSorting = ref<SortingState>([])
const componentSorting = ref<SortingState>([])

// =========================
// TEMPLATE ACTIONS
// =========================

const templateColumns = costTemplateColumns({
  onEdit: (row: CostTemplate) => router.push(`/cost-templates/${row.id}/edit`),
  onSortFieldSelect: (col) => {
    const cur = templateSorting.value[0]
    templateSorting.value = [{ id: col, desc: cur?.id === col ? !cur.desc : false }]
  }
})

// =========================
// COMPONENT MODAL (create/edit)
// =========================

const componentModalOpen = ref(false)
const editingComponent = ref<CostComponent | null>(null)

const openCreateComponent = () => {
  editingComponent.value = null
  componentModalOpen.value = true
}

const openEditComponent = (row: CostComponent) => {
  editingComponent.value = row
  componentModalOpen.value = true
}

const componentColumns = costComponentColumns({
  onEdit: openEditComponent,
  onSortFieldSelect: (col) => {
    const cur = componentSorting.value[0]
    componentSorting.value = [{ id: col, desc: cur?.id === col ? !cur.desc : false }]
  }
})

const handleComponentSaved = () => {
  componentModalOpen.value = false
  editingComponent.value = null
}

// =========================
// LINKS POR TAB
// =========================

const links = computed(() => {
  if (activeTab.value === 'templates') {
    return [
      {
        label: 'Nuevo template',
        icon: 'i-lucide-plus',
        onClick: () => router.push('/cost-templates/create'),
        color: 'primary' as const,
        variant: 'solid' as const
      }
    ]
  }
  return [
    {
      label: 'Nuevo componente',
      icon: 'i-lucide-plus',
      onClick: openCreateComponent,
      color: 'primary' as const,
      variant: 'solid' as const
    }
  ]
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader
      title="Templates de costo"
      description="Gestioná los templates y componentes de costo"
      :links="links"
    />

    <UTabs v-model="activeTab" :items="tabs" variant="link" class="w-full">
      <!-- TEMPLATES -->
      <template #templates>
        <LogisticaTable
          :loading="loading"
          :data="templates"
          :columns="templateColumns"
          v-model:sorting="templateSorting"
        />
      </template>

      <!-- COMPONENTES -->
      <template #components>
        <LogisticaTable
          :loading="loading"
          :data="components"
          :columns="componentColumns"
          v-model:sorting="componentSorting"
        />
      </template>
    </UTabs>

    <!-- MODAL COMPONENTE -->
    <UModal v-model:open="componentModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ editingComponent ? 'Editar componente' : 'Nuevo componente' }}
            </h3>
          </template>
          <CostComponentForm
            :component="editingComponent ?? undefined"
            @saved="handleComponentSaved"
            @cancelled="componentModalOpen = false"
          />
        </UCard>
      </template>
    </UModal>
  </UPage>
</template>
