<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCommercialAdjustmentConceptsService } from '~/modulos/erp/commercial-adjustment-concepts/commercial-adjustment-concepts.service'
import type {
  CommercialAdjustmentBasis,
  CommercialAdjustmentConcept,
  CommercialAdjustmentConceptInput,
  CommercialAdjustmentScope,
  CommercialAdjustmentValueType
} from '~/modulos/erp/commercial-adjustment-concepts/commercial-adjustment-concepts.types'

const auth = useAuthStore()
const { isOwnerOrAdmin } = useCompanyRole()
const roles = useRoles()
const service = useCommercialAdjustmentConceptsService()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const modalOpen = ref(false)
const editing = ref<CommercialAdjustmentConcept | null>(null)
const search = ref('')
const concepts = ref<CommercialAdjustmentConcept[]>([])

const canManage = computed(
  () =>
    isOwnerOrAdmin.value ||
    roles.hasPermission('commercial_adjustment_concepts.create') ||
    roles.hasPermission('commercial_adjustment_concepts.update')
)
const permissionState = roles.myPermissions
const visibleConcepts = computed(() => {
  void permissionState.value
  const term = search.value.trim().toLocaleLowerCase('es')
  if (!term) return concepts.value
  return concepts.value.filter((concept) =>
    [concept.name, concept.description ?? '', concept.applies_to].some((value) =>
      value.toLocaleLowerCase('es').includes(term)
    )
  )
})

const scopeOptions = [
  { label: 'Ventas', value: 'SALES' },
  { label: 'Compras', value: 'PURCHASES' },
  { label: 'Ventas y compras', value: 'BOTH' }
]
const valueTypeOptions = [
  { label: 'Porcentaje', value: 'PERCENTAGE' },
  { label: 'Importe fijo', value: 'AMOUNT' }
]
const basisOptions = [
  { label: 'Neto antes de impuestos', value: 'NET' },
  { label: 'Total con impuestos', value: 'GROSS' }
]

const emptyForm = () => ({
  name: '',
  description: '',
  applies_to: 'BOTH' as CommercialAdjustmentScope,
  value_type: 'PERCENTAGE' as CommercialAdjustmentValueType,
  basis: 'NET' as CommercialAdjustmentBasis,
  default_value: null as number | null,
  is_active: true,
  sort_order: 0
})
const form = reactive(emptyForm())

function scopeLabel(scope: CommercialAdjustmentScope) {
  return scopeOptions.find((option) => option.value === scope)?.label ?? scope
}
function valueLabel(concept: CommercialAdjustmentConcept) {
  const value = concept.default_value == null ? null : Number(concept.default_value)
  if (value == null) return 'Valor a definir al cargar'
  return concept.value_type === 'PERCENTAGE'
    ? `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}%`
    : `${new Intl.NumberFormat('es-AR').format(value)} (moneda del comprobante)`
}
function basisLabel(basis: CommercialAdjustmentBasis) {
  return basis === 'NET' ? 'sobre neto' : 'sobre total con impuestos'
}

async function load() {
  loading.value = true
  try {
    concepts.value = await service.findAll({ includeInactive: true })
  } catch (error: any) {
    toast.add({
      title: 'No se pudo cargar el catálogo',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, emptyForm())
  modalOpen.value = true
}
function openEdit(concept: CommercialAdjustmentConcept) {
  editing.value = concept
  Object.assign(form, {
    name: concept.name,
    description: concept.description ?? '',
    applies_to: concept.applies_to,
    value_type: concept.value_type,
    basis: concept.basis,
    default_value: concept.default_value == null ? null : Number(concept.default_value),
    is_active: concept.is_active,
    sort_order: concept.sort_order
  })
  modalOpen.value = true
}

async function save() {
  const name = form.name.trim()
  if (!name) {
    toast.add({ title: 'Ingresá el nombre del concepto', color: 'warning' })
    return
  }
  if (
    form.default_value != null &&
    (form.default_value <= 0 || (form.value_type === 'PERCENTAGE' && form.default_value > 100))
  ) {
    toast.add({
      title:
        form.value_type === 'PERCENTAGE'
          ? 'El porcentaje debe ser mayor a 0 y no superar 100'
          : 'El importe debe ser mayor a 0',
      color: 'warning'
    })
    return
  }

  saving.value = true
  const payload: CommercialAdjustmentConceptInput = {
    name,
    description: form.description.trim() || null,
    applies_to: form.applies_to,
    value_type: form.value_type,
    basis: form.basis,
    default_value: form.default_value,
    is_active: form.is_active,
    sort_order: Math.max(0, Math.trunc(Number(form.sort_order) || 0))
  }
  try {
    if (editing.value) await service.update(editing.value.id, payload)
    else await service.create(payload)
    toast.add({ title: editing.value ? 'Concepto actualizado' : 'Concepto creado', color: 'success' })
    modalOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(concept: CommercialAdjustmentConcept) {
  try {
    await service.update(concept.id, { is_active: !concept.is_active })
    toast.add({ title: concept.is_active ? 'Concepto desactivado' : 'Concepto activado', color: 'success' })
    await load()
  } catch (error: any) {
    toast.add({
      title: 'No se pudo cambiar el estado',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  }
}

onMounted(async () => {
  await roles.fetchMyPermissionsIfNeeded(auth.selectedCompany?.id, auth.user?.id)
  await load()
})
</script>

<template>
  <UPage class="flex flex-col gap-5 px-4 pb-10">
    <AppPageHeader
      title="Conceptos comerciales"
      description="Plantillas reutilizables para descuentos y bonificaciones de facturas."
    >
      <template #links>
        <UButton v-if="canManage" label="Nuevo concepto" icon="i-lucide-plus" @click="openCreate" />
      </template>
    </AppPageHeader>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="El catálogo propone; la factura confirma"
      description="Al aplicar una plantilla podés revisar y cambiar sus datos. Cada factura conserva una copia propia; editar o desactivar una plantilla no modifica comprobantes anteriores."
    />

    <UCard>
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-semibold">Plantillas configuradas</h2>
          <p class="text-sm text-muted">Configurá si aplica a ventas, compras o ambas, y el valor inicial sugerido.</p>
        </div>
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Buscar concepto..."
          class="w-full sm:max-w-xs"
          clearable
        />
      </div>

      <div v-if="loading" class="py-10 text-center"><ULoader /></div>
      <div
        v-else-if="!visibleConcepts.length"
        class="rounded-lg border border-dashed border-default px-4 py-10 text-center"
      >
        <UIcon name="i-lucide-tags" class="mx-auto mb-2 size-7 text-muted" />
        <p class="font-medium">
          {{
            concepts.length
              ? 'No hay conceptos que coincidan con la búsqueda'
              : 'Todavía no hay conceptos reutilizables'
          }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{
            concepts.length
              ? 'Probá con otro nombre o alcance.'
              : 'Creá plantillas como “Bonificación comercial” o “Descuento por volumen”.'
          }}
        </p>
        <UButton
          v-if="canManage && !concepts.length"
          class="mt-4"
          label="Crear primer concepto"
          icon="i-lucide-plus"
          @click="openCreate"
        />
      </div>
      <div v-else class="grid gap-3 lg:grid-cols-2">
        <article
          v-for="concept in visibleConcepts"
          :key="concept.id"
          class="min-w-0 rounded-xl border border-default p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold">{{ concept.name }}</h3>
                <UBadge
                  :label="concept.is_active ? 'Activa' : 'Inactiva'"
                  :color="concept.is_active ? 'success' : 'neutral'"
                  variant="subtle"
                />
              </div>
              <p v-if="concept.description" class="mt-1 text-sm text-muted">{{ concept.description }}</p>
            </div>
            <UDropdownMenu
              v-if="canManage"
              :items="[
                [
                  { label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => openEdit(concept) },
                  {
                    label: concept.is_active ? 'Desactivar' : 'Activar',
                    icon: concept.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye',
                    onSelect: () => toggleActive(concept)
                  }
                ]
              ]"
            >
              <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" aria-label="Acciones del concepto" />
            </UDropdownMenu>
          </div>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <UBadge :label="scopeLabel(concept.applies_to)" color="neutral" variant="outline" />
            <UBadge :label="valueLabel(concept)" color="primary" variant="subtle" />
            <UBadge :label="basisLabel(concept.basis)" color="neutral" variant="subtle" />
          </div>
        </article>
      </div>
    </UCard>

    <UModal
      v-model:open="modalOpen"
      :title="editing ? 'Editar concepto comercial' : 'Nuevo concepto comercial'"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Nombre del concepto" required class="sm:col-span-2">
            <UInput v-model="form.name" maxlength="120" placeholder="Ej.: Bonificación por volumen" class="w-full" />
          </UFormField>
          <UFormField label="Descripción" class="sm:col-span-2">
            <UTextarea
              v-model="form.description"
              :rows="2"
              placeholder="Opcional: cuándo o por qué se utiliza"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Disponible para" required>
            <USelect v-model="form.applies_to" :items="scopeOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField label="Tipo de valor" required>
            <USelect v-model="form.value_type" :items="valueTypeOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField
            :label="form.value_type === 'PERCENTAGE' ? 'Porcentaje sugerido (opcional)' : 'Importe sugerido (opcional)'"
            :description="
              form.value_type === 'PERCENTAGE'
                ? 'Entre 0,01 y 100. Se puede modificar al cargar cada factura.'
                : 'En la moneda del comprobante. Se puede modificar al cargar cada factura.'
            "
          >
            <UInput
              v-model.number="form.default_value"
              type="number"
              min="0.01"
              :max="form.value_type === 'PERCENTAGE' ? 100 : undefined"
              step="0.01"
              placeholder="A definir al cargar"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Calcular sobre" required>
            <USelect v-model="form.basis" :items="basisOptions" value-key="value" class="w-full" />
          </UFormField>
          <UFormField label="Orden" description="Los conceptos se sugieren en este orden.">
            <UInput v-model.number="form.sort_order" type="number" min="0" step="1" class="w-full" />
          </UFormField>
          <UFormField v-if="editing" label="Estado">
            <USwitch v-model="form.is_active" label="Activa para nuevas facturas" />
          </UFormField>
        </div>
        <UAlert
          class="mt-4"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="No configures acá un pronto pago condicional"
          description="El descuento debe estar concedido al emitir. Si depende de que el cliente pague antes, no se aplica hasta diseñar ese flujo."
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="outline" :disabled="saving" @click="modalOpen = false" />
          <UButton :label="editing ? 'Guardar cambios' : 'Crear concepto'" :loading="saving" @click="save" />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
