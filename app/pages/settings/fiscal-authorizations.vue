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
const sequenceOptions = computed(() => sequences.value
  .filter(sequence => sequence.active !== false)
  .map(sequence => ({ label: `PV ${sequence.point_of_sale} · ${sequence.name}`, value: sequence.id })))
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
      <div v-else class="overflow-x-auto max-h-[62vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-default z-10 border-b border-default"><tr>
            <th class="p-3 text-left">Autorización</th><th class="p-3 text-left">Documento / PV</th>
            <th class="p-3 text-left">Vigencia</th><th class="p-3 text-right">Numeración</th>
            <th class="p-3 text-center">Estado</th><th class="p-3 text-right">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-default">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-muted/20">
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

    <UModal v-model:open="modalOpen" :title="editingId ? 'Editar autorización fiscal' : 'Nueva autorización fiscal'" description="La autorización se seleccionará automáticamente al confirmar un remito.">
      <template #body><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Tipo"><USelect v-model="form.authorization_type" :items="[{label:'CAI',value:'CAI'},{label:'CAE',value:'CAE'},{label:'CAEA',value:'CAEA'}]" value-key="value" class="w-full" /></UFormField>
        <UFormField label="Código" required><UInput v-model="form.code" placeholder="Código de autorización" class="w-full" /></UFormField>
        <UFormField label="Tipo de remito" required><USelectMenu v-model="form.document_type_id" :items="remitoTypes" value-key="value" searchable class="w-full" /></UFormField>
        <UFormField label="Punto de venta" required><USelectMenu v-model="form.document_sequence_id" :items="sequenceOptions" value-key="value" searchable class="w-full" /></UFormField>
        <UFormField label="Vigente desde" required><UInput v-model="form.valid_from" type="date" class="w-full" /></UFormField>
        <UFormField label="Vence el" required><UInput v-model="form.valid_to" type="date" class="w-full" /></UFormField>
        <UFormField label="Número desde" required><UInput v-model.number="form.range_from" type="number" min="1" class="w-full" /></UFormField>
        <UFormField label="Número hasta" required><UInput v-model.number="form.range_to" type="number" min="1" class="w-full" /></UFormField>
        <UFormField v-if="editingId" label="Estado"><USelect v-model="form.status" :items="[{label:'Activa',value:'ACTIVE'},{label:'Reemplazada',value:'REPLACED'},{label:'Anulada',value:'ANNULLED'}]" value-key="value" class="w-full" /></UFormField>
        <UFormField label="Reemplazar desde"><UInput v-model="form.replacement_date" type="date" class="w-full" /></UFormField>
        <UFormField label="Observaciones" class="sm:col-span-2"><UTextarea v-model="form.observations" :rows="3" class="w-full" /></UFormField>
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
