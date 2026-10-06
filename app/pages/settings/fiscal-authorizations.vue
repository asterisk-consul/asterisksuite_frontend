<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['auth'] })

const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const modalOpen = ref(false)
const settingsOpen = ref(false)
const editingId = ref<string | null>(null)
const rows = ref<any[]>([])
const documentTypes = ref<any[]>([])
const sequences = ref<any[]>([])
const search = ref('')
const activeDocumentType = ref('all')
const settings = ref<any>({
  alerts_enabled: true,
  day_thresholds: [30, 15, 7, 3, 1],
  number_thresholds: [100, 50, 20, 10],
  expired_policy: 'BLOCK',
  missing_policy: 'BLOCK',
  daily_after_expiration: false,
  notify_roles: []
})

const emptyForm = () => ({
  authorization_type: 'CAI', code: '', document_type_id: '', document_sequence_id: '',
  valid_from: new Date().toISOString().slice(0, 10), valid_to: '', range_from: 1, range_to: 99999999,
  replacement_date: '', observations: '', status: 'ACTIVE'
})
const form = ref(emptyForm())

const remitoTypes = computed(() => documentTypes.value
  .filter(type => type.category === 'REMITO')
  .map(type => ({ label: `${type.code} · ${type.description}`, value: type.id })))
const documentTypeTabs = computed(() => [
  { label: `Todas (${rows.value.length})`, value: 'all', icon: 'i-lucide-layers-3' },
  ...remitoTypes.value
    .map(type => ({
      label: `${type.label.split(' · ')[0]} (${rows.value.filter(row => row.document_type_id === type.value).length})`,
      value: type.value,
      icon: 'i-lucide-file-text'
    }))
    .filter(type => !type.label.endsWith('(0)'))
])
const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('es')
  return rows.value.filter(row => {
    if (activeDocumentType.value !== 'all' && row.document_type_id !== activeDocumentType.value) return false
    if (!term) return true
    return [
      row.authorization_type,
      row.code,
      row.document_type?.code,
      row.document_type?.description,
      row.document_sequence?.point_of_sale,
      row.document_sequence?.name,
      row.observations,
      statusLabels[row.derived_status]
    ].some(value => String(value ?? '').toLocaleLowerCase('es').includes(term))
  })
})
const selectedDocumentType = computed(() => documentTypes.value.find(type => type.id === form.value.document_type_id))
const compatibleSequences = computed(() => {
  if (!form.value.document_type_id) return []
  return sequences.value.filter(sequence =>
    sequence.active !== false
    && sequence.document_type_sequences?.some((link: any) => link.document_type_id === form.value.document_type_id)
  )
})
const sequenceOptions = computed(() => compatibleSequences.value.map(sequence => ({
  label: `PV ${sequence.point_of_sale} · ${sequence.name} · próximo ${Number(sequence.current_number ?? 0) + 1}`,
  value: sequence.id
})))
const policyOptions = [
  { label: 'Bloquear confirmación', value: 'BLOCK' },
  { label: 'Advertir y permitir', value: 'WARN' },
  { label: 'Sin control', value: 'OFF' }
]
const statusLabels: Record<string, string> = { CURRENT: 'Vigente', EXPIRING: 'Próxima a vencer', FUTURE: 'Futura', EXPIRED: 'Vencida', REPLACED: 'Reemplazada', ANNULLED: 'Anulada' }
const statusColors: Record<string, any> = { CURRENT: 'success', EXPIRING: 'warning', FUTURE: 'info', EXPIRED: 'error', REPLACED: 'neutral', ANNULLED: 'neutral' }

async function load() {
  loading.value = true
  try {
    const [authorizations, types, sequenceRows, currentSettings] = await Promise.all([
      $fetch<any[]>('/api/backend/fiscal-authorizations'),
      $fetch<any[]>('/api/backend/documents/documents-types'),
      $fetch<any[]>('/api/backend/document-sequences'),
      $fetch<any>('/api/backend/fiscal-authorizations/settings/current')
    ])
    rows.value = authorizations
    documentTypes.value = types
    sequences.value = sequenceRows
    settings.value = currentSettings
  } catch (error: any) {
    toast.add({ title: 'No se pudo cargar la configuración', description: error?.data?.message, color: 'error' })
  } finally { loading.value = false }
}

function createNew() { editingId.value = null; form.value = emptyForm(); modalOpen.value = true }

watch(() => form.value.document_type_id, (next, previous) => {
  if (next === previous || !form.value.document_sequence_id) return
  const remainsCompatible = compatibleSequences.value.some(sequence => sequence.id === form.value.document_sequence_id)
  if (!remainsCompatible) form.value.document_sequence_id = ''
})
function edit(row: any) {
  editingId.value = row.id
  form.value = {
    authorization_type: row.authorization_type, code: row.code, document_type_id: row.document_type_id,
    document_sequence_id: row.document_sequence_id, valid_from: String(row.valid_from).slice(0, 10),
    valid_to: String(row.valid_to).slice(0, 10), range_from: row.range_from, range_to: row.range_to,
    replacement_date: row.replacement_date ? String(row.replacement_date).slice(0, 10) : '',
    observations: row.observations ?? '', status: row.status
  }
  modalOpen.value = true
}
function renew(row: any) {
  const nextDay = new Date(row.valid_to)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  editingId.value = null
  form.value = {
    authorization_type: row.authorization_type,
    code: '',
    document_type_id: row.document_type_id,
    document_sequence_id: row.document_sequence_id,
    valid_from: nextDay.toISOString().slice(0, 10),
    valid_to: '',
    range_from: row.range_to + 1,
    range_to: row.range_to + 99999999,
    replacement_date: '',
    observations: `Renovación de ${row.authorization_type} ${row.code}`,
    status: 'ACTIVE'
  }
  modalOpen.value = true
}
async function save() {
  saving.value = true
  try {
    const body: any = { ...form.value, replacement_date: form.value.replacement_date || undefined }
    if (!editingId.value) delete body.status
    await $fetch(editingId.value ? `/api/backend/fiscal-authorizations/${editingId.value}` : '/api/backend/fiscal-authorizations', {
      method: editingId.value ? 'PUT' : 'POST', body
    })
    toast.add({ title: editingId.value ? 'Autorización actualizada' : 'Autorización creada', color: 'success' })
    modalOpen.value = false
    await load()
  } catch (error: any) { toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' }) }
  finally { saving.value = false }
}
async function remove(row: any) {
  if (!confirm(`¿Eliminar la autorización ${row.code}?`)) return
  try { await $fetch(`/api/backend/fiscal-authorizations/${row.id}`, { method: 'DELETE' }); await load() }
  catch (error: any) { toast.add({ title: 'No se puede eliminar', description: error?.data?.message, color: 'error' }) }
}
async function saveSettings() {
  saving.value = true
  try {
    await $fetch('/api/backend/fiscal-authorizations/settings/current', {
      method: 'PUT',
      body: {
        alerts_enabled: settings.value.alerts_enabled,
        day_thresholds: settings.value.day_thresholds,
        number_thresholds: settings.value.number_thresholds,
        expired_policy: settings.value.expired_policy,
        missing_policy: settings.value.missing_policy,
        daily_after_expiration: settings.value.daily_after_expiration,
        notify_roles: settings.value.notify_roles ?? []
      }
    })
    toast.add({ title: 'Alertas actualizadas', color: 'success' }); settingsOpen.value = false
  } catch (error: any) { toast.add({ title: 'No se pudo guardar', description: error?.data?.message, color: 'error' }) }
  finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <UPage>
    <AppPageHeader title="Autorizaciones fiscales" description="Administrá CAI por tipo de remito, punto de venta, vigencia y rango de numeración.">
      <template #actions>
        <UButton label="Configurar alertas" icon="i-lucide-bell-ring" variant="outline" @click="settingsOpen = true" />
        <UButton label="Nueva autorización" icon="i-lucide-plus" @click="createNew" />
      </template>
    </AppPageHeader>

    <div v-if="loading" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-16 w-full" /></div>
    <div v-else class="rounded-xl border border-default overflow-hidden">
      <div v-if="!rows.length" class="py-14 text-center">
        <UIcon name="i-lucide-badge-check" class="size-10 text-muted mx-auto mb-3" />
        <p class="font-medium">Todavía no hay autorizaciones fiscales</p>
        <p class="text-sm text-muted mb-4">Registrá el CAI antes de confirmar remitos fiscales.</p>
        <UButton label="Registrar CAI" @click="createNew" />
      </div>
      <div v-else>
        <div class="space-y-4 border-b border-default p-4">
          <UFormField label="Buscar autorizaciones" description="Buscá por CAI, remito, punto de venta, serie o estado.">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Ej.: CAI, 0003 o Remito R" size="lg" class="w-full">
              <template v-if="search" #trailing><UButton icon="i-lucide-x" color="neutral" variant="link" size="xs" aria-label="Limpiar búsqueda" @click="search = ''" /></template>
            </UInput>
          </UFormField>
          <div class="overflow-x-auto"><UTabs v-model="activeDocumentType" :items="documentTypeTabs" :content="false" variant="link" class="min-w-max" /></div>
          <p class="text-xs text-muted">{{ filteredRows.length }} de {{ rows.length }} autorizaciones</p>
        </div>
        <div v-if="!filteredRows.length" class="py-12 text-center">
          <UIcon name="i-lucide-search-x" class="size-10 text-muted mx-auto mb-3" />
          <p class="font-medium">No encontramos autorizaciones</p>
          <p class="text-sm text-muted">Probá con otra búsqueda o tipo de remito.</p>
          <UButton label="Limpiar filtros" variant="link" class="mt-2" @click="search = ''; activeDocumentType = 'all'" />
        </div>
      <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-default z-10 border-b border-default"><tr>
            <th class="p-3 text-left">Autorización</th><th class="p-3 text-left">Documento / PV</th>
            <th class="p-3 text-left">Vigencia</th><th class="p-3 text-right">Numeración</th>
            <th class="p-3 text-center">Estado</th><th class="p-3 text-right">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-default">
            <tr v-for="row in filteredRows" :key="row.id" class="hover:bg-muted/20">
              <td class="p-3"><p class="font-semibold">{{ row.authorization_type }} {{ row.code }}</p><p class="text-xs text-muted">{{ row.observations || 'Sin observaciones' }}</p></td>
              <td class="p-3"><p>{{ row.document_type?.code }} · {{ row.document_type?.description }}</p><p class="text-xs text-muted">PV {{ row.document_sequence?.point_of_sale }} · {{ row.document_sequence?.name }}</p></td>
              <td class="p-3 whitespace-nowrap">{{ String(row.valid_from).slice(0, 10) }} → {{ String(row.valid_to).slice(0, 10) }}</td>
              <td class="p-3 text-right"><p>{{ row.range_from.toLocaleString('es-AR') }} → {{ row.range_to.toLocaleString('es-AR') }}</p><p class="text-xs text-muted">{{ row.remaining_numbers.toLocaleString('es-AR') }} disponibles</p></td>
              <td class="p-3 text-center"><UBadge :label="statusLabels[row.derived_status] ?? row.derived_status" :color="statusColors[row.derived_status]" variant="subtle" /></td>
              <td class="p-3"><div class="flex justify-end gap-1"><UButton icon="i-lucide-refresh-cw" label="Renovar" size="xs" variant="ghost" @click="renew(row)" /><UButton icon="i-lucide-pencil" size="xs" variant="ghost" @click="edit(row)" /><UButton v-if="!row._count?.documents" icon="i-lucide-trash-2" color="error" size="xs" variant="ghost" @click="remove(row)" /></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>

    <UModal v-model:open="modalOpen" :title="editingId ? 'Editar autorización fiscal' : 'Nueva autorización fiscal'" description="La autorización se aplicará automáticamente a los remitos de la serie seleccionada." :ui="{ content: 'sm:max-w-2xl' }">
      <template #body><div class="space-y-6">
        <section class="space-y-4"><div><h3 class="font-medium">Autorización</h3><p class="text-sm text-muted">Ingresá el código y las fechas otorgadas por ARCA.</p></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Tipo"><USelect v-model="form.authorization_type" :items="[{label:'CAI',value:'CAI'},{label:'CAE',value:'CAE'},{label:'CAEA',value:'CAEA'}]" value-key="value" class="w-full" /></UFormField>
          <UFormField label="Código" required><UInput v-model="form.code" placeholder="Código de autorización" class="w-full" /></UFormField>
          <UFormField label="Vigente desde" required><UInput v-model="form.valid_from" type="date" class="w-full" /></UFormField>
          <UFormField label="Vence el" required><UInput v-model="form.valid_to" type="date" class="w-full" /></UFormField>
        </div></section>

        <section class="space-y-4 border-t border-default pt-5"><div><h3 class="font-medium">Aplicación</h3><p class="text-sm text-muted">La serie determina el punto de venta y mantiene una numeración independiente.</p></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Tipo de remito" required><USelectMenu v-model="form.document_type_id" :items="remitoTypes" value-key="value" searchable placeholder="Seleccionar tipo de remito" class="w-full" /></UFormField>
          <UFormField label="Serie / punto de venta" required description="Sólo se muestran series habilitadas para el remito elegido."><USelectMenu v-model="form.document_sequence_id" :items="sequenceOptions" value-key="value" searchable :disabled="!form.document_type_id" :placeholder="form.document_type_id ? 'Seleccionar serie' : 'Primero seleccioná el remito'" class="w-full" /></UFormField>
        </div>
        <UAlert v-if="form.document_type_id && !sequenceOptions.length" color="warning" variant="subtle" icon="i-lucide-triangle-alert" title="Este remito no tiene una serie configurada" description="Creá o vinculá una secuencia antes de registrar la autorización.">
          <template #actions><UButton label="Configurar secuencias" to="/erp/settings/document-sequences" size="xs" variant="outline" /></template>
        </UAlert>
        <p v-else-if="selectedDocumentType && form.document_sequence_id" class="text-xs text-muted">La autorización quedará vinculada únicamente a {{ selectedDocumentType.code }} · {{ selectedDocumentType.description }}.</p>
        </section>

        <section class="space-y-4 border-t border-default pt-5"><div><h3 class="font-medium">Numeración autorizada</h3><p class="text-sm text-muted">Este rango corresponde al CAI; no reinicia ni modifica el próximo número de la serie.</p></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Primer número autorizado" required><UInput v-model.number="form.range_from" type="number" min="1" class="w-full" /></UFormField>
        <UFormField label="Último número autorizado" required><UInput v-model.number="form.range_to" type="number" min="1" class="w-full" /></UFormField>
        </div></section>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-default pt-5">
        <UFormField v-if="editingId" label="Estado"><USelect v-model="form.status" :items="[{label:'Activa',value:'ACTIVE'},{label:'Reemplazada',value:'REPLACED'},{label:'Anulada',value:'ANNULLED'}]" value-key="value" class="w-full" /></UFormField>
        <UFormField v-if="editingId" label="Fecha de reemplazo" description="Usala sólo cuando otra autorización sustituya a ésta."><UInput v-model="form.replacement_date" type="date" class="w-full" /></UFormField>
        <UFormField label="Observaciones" class="sm:col-span-2"><UTextarea v-model="form.observations" :rows="3" class="w-full" /></UFormField>
        </div>
      </div></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton label="Cancelar" variant="ghost" @click="modalOpen=false" /><UButton label="Guardar" :loading="saving" :disabled="!form.code || !form.document_type_id || !form.document_sequence_id || !form.valid_to" @click="save" /></div></template>
    </UModal>

    <UModal v-model:open="settingsOpen" title="Alertas y control al confirmar" description="Definí cuándo avisar y qué hacer si falta una autorización válida.">
      <template #body><div class="space-y-5">
        <div class="flex items-center justify-between gap-4 rounded-lg border border-default p-3"><div><p class="font-medium">Alertas activas</p><p class="text-sm text-muted">Genera avisos por vencimiento y numeración.</p></div><USwitch v-model="settings.alerts_enabled" /></div>
        <UFormField label="Avisar estos días antes" description="Separados por coma"><UInput :model-value="(settings.day_thresholds ?? []).join(', ')" @update:model-value="settings.day_thresholds = String($event).split(',').map(Number).filter(Number.isFinite)" class="w-full" /></UFormField>
        <UFormField label="Avisar cuando queden estos números" description="Separados por coma"><UInput :model-value="(settings.number_thresholds ?? []).join(', ')" @update:model-value="settings.number_thresholds = String($event).split(',').map(Number).filter(Number.isFinite)" class="w-full" /></UFormField>
        <div class="grid sm:grid-cols-2 gap-4"><UFormField label="Si está vencida"><USelect v-model="settings.expired_policy" :items="policyOptions" value-key="value" class="w-full" /></UFormField><UFormField label="Si no existe"><USelect v-model="settings.missing_policy" :items="policyOptions" value-key="value" class="w-full" /></UFormField></div>
        <div class="flex items-center justify-between gap-4"><div><p class="font-medium">Recordatorio diario vencido</p><p class="text-sm text-muted">Continúa avisando hasta registrar la renovación.</p></div><USwitch v-model="settings.daily_after_expiration" /></div>
      </div></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton label="Cancelar" variant="ghost" @click="settingsOpen=false" /><UButton label="Guardar configuración" :loading="saving" @click="saveSettings" /></div></template>
    </UModal>
  </UPage>
</template>
