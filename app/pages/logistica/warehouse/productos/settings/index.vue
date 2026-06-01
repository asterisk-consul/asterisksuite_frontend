<script setup lang="ts">
import { useCostTemplates } from '~/modulos/logistica/master-data/product/cost-templates/composables/useCostTemplates'
import CostTemplateForm from '~/modulos/logistica/master-data/product/cost-templates/components/CostTemplateForm.vue'
import CostComponentForm from '~/modulos/logistica/master-data/product/cost-templates/components/CostComponentForm.vue'

const { templates, components, loading, defaultTemplate, init, deleteTemplate, deleteComponent, setDefault } =
  useCostTemplates()

const toast = useToast()

// =========================
// TABS
// =========================

const tabs = [
  { label: 'Templates', icon: 'i-heroicons-rectangle-stack', slot: 'templates' },
  { label: 'Componentes', icon: 'i-heroicons-puzzle-piece', slot: 'components' }
]

const activeTab = ref('templates')

// =========================
// MODALS
// =========================

const showTemplateForm = ref(false)
const showComponentForm = ref(false)
const editingTemplate = ref(null)
const editingComponent = ref(null)

// =========================
// INIT
// =========================

onMounted(async () => {
  await init()
})

// =========================
// HANDLERS TEMPLATES
// =========================

const handleCreateTemplate = () => {
  editingTemplate.value = null
  showTemplateForm.value = true
}

const handleEditTemplate = (template) => {
  editingTemplate.value = template
  showTemplateForm.value = true
}

const handleTemplateSaved = async () => {
  showTemplateForm.value = false
  await init()
}

const handleDeleteTemplate = async (id: string) => {
  try {
    await deleteTemplate(id)
    toast.add({ title: 'Template eliminado', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo eliminar el template.',
      color: 'error'
    })
  }
}

const handleSetDefault = async (id: string) => {
  try {
    await setDefault(id)
    toast.add({ title: 'Template predeterminado actualizado', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Error', color: 'error' })
  }
}

// =========================
// HANDLERS COMPONENTS
// =========================

const handleCreateComponent = () => {
  editingComponent.value = null
  showComponentForm.value = true
}

const handleEditComponent = (component) => {
  editingComponent.value = component
  showComponentForm.value = true
}

const handleComponentSaved = async () => {
  showComponentForm.value = false
  await init()
}

const handleDeleteComponent = async (id: string) => {
  try {
    await deleteComponent(id)
    toast.add({ title: 'Componente eliminado', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'Error',
      description: err?.data?.message ?? 'No se pudo eliminar el componente.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">Configuración de costos</h1>
        <p class="text-sm text-muted">Gestioná templates y componentes de costo</p>
      </div>
    </div>

    <UTabs v-model="activeTab" :items="tabs">
      <!-- ─── TAB TEMPLATES ──────────────────────────────────── -->
      <template #templates>
        <div class="mt-4 space-y-4">
          <div class="flex justify-end">
            <UButton icon="i-heroicons-plus" size="sm" @click="handleCreateTemplate">Nuevo template</UButton>
          </div>

          <div class="space-y-3">
            <UCard v-for="template in templates" :key="template.id">
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">{{ template.name }}</span>
                    <UBadge v-if="template.is_default" label="Default" color="primary" variant="subtle" size="xs" />
                    <UBadge v-if="!template.active" label="Inactivo" color="neutral" variant="subtle" size="xs" />
                  </div>
                  <div class="flex items-center gap-2">
                    <UButton
                      v-if="!template.is_default"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      @click="handleSetDefault(template.id)"
                    >
                      Hacer default
                    </UButton>
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-heroicons-pencil"
                      @click="handleEditTemplate(template)"
                    />
                    <UButton
                      v-if="!template.is_default"
                      size="xs"
                      variant="ghost"
                      color="error"
                      icon="i-heroicons-trash"
                      :loading="loading"
                      @click="handleDeleteTemplate(template.id)"
                    />
                  </div>
                </div>
              </template>

              <p v-if="template.description" class="text-xs text-muted mb-3">
                {{ template.description }}
              </p>

              <div class="space-y-1.5">
                <div
                  v-for="tc in template.components"
                  :key="tc.id"
                  class="flex items-center justify-between rounded-md bg-elevated px-3 py-2"
                >
                  <div class="flex items-center gap-2">
                    <UBadge :label="tc.component.type" color="info" variant="subtle" size="xs" />
                    <span class="text-sm">{{ tc.component.name }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted">
                      {{ tc.component.value_type }}
                    </span>
                    <span v-if="tc.value_override !== null" class="text-sm font-medium">
                      {{ tc.value_override }}
                      <UBadge label="Override" color="warning" variant="subtle" size="xs" />
                    </span>
                    <span v-else-if="tc.component.value !== null" class="text-sm font-medium tabular-nums">
                      {{ tc.component.value }}
                    </span>
                    <span v-else class="text-sm text-muted">—</span>
                  </div>
                </div>
              </div>
            </UCard>

            <div v-if="!loading && !templates.length" class="text-center py-8 text-sm text-muted">
              Sin templates. Creá el primero.
            </div>
          </div>
        </div>
      </template>

      <!-- ─── TAB COMPONENTES ────────────────────────────────── -->
      <template #components>
        <div class="mt-4 space-y-4">
          <div class="flex justify-end">
            <UButton icon="i-heroicons-plus" size="sm" @click="handleCreateComponent">Nuevo componente</UButton>
          </div>

          <UCard>
            <div class="divide-y divide-default">
              <div
                v-for="component in components"
                :key="component.id"
                class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div class="flex items-center gap-3">
                  <UBadge :label="component.type" color="info" variant="subtle" size="xs" />
                  <div>
                    <p class="text-sm font-medium">{{ component.name }}</p>
                    <p class="text-xs text-muted">{{ component.value_type }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span v-if="component.value !== null" class="text-sm tabular-nums font-medium">
                    {{ component.value }}
                  </span>
                  <span v-else class="text-sm text-muted">—</span>
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-pencil"
                    @click="handleEditComponent(component)"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-trash"
                    :loading="loading"
                    @click="handleDeleteComponent(component.id)"
                  />
                </div>
              </div>

              <div v-if="!loading && !components.length" class="text-center py-8 text-sm text-muted">
                Sin componentes. Creá el primero.
              </div>
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <!-- ─── MODAL TEMPLATE FORM ────────────────────────────────── -->
    <UModal v-model:open="showTemplateForm" :title="editingTemplate ? 'Editar template' : 'Nuevo template'">
      <template #body>
        <CostTemplateForm
          :template="editingTemplate ?? undefined"
          @saved="handleTemplateSaved"
          @cancelled="showTemplateForm = false"
        />
      </template>
    </UModal>

    <!-- ─── MODAL COMPONENT FORM ───────────────────────────────── -->
    <UModal v-model:open="showComponentForm" :title="editingComponent ? 'Editar componente' : 'Nuevo componente'">
      <template #body>
        <CostComponentForm
          :component="editingComponent ?? undefined"
          @saved="handleComponentSaved"
          @cancelled="showComponentForm = false"
        />
      </template>
    </UModal>
  </div>
</template>
