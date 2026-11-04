<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useDocumentAssignmentService } from './document-assignment.service'
import { useDocumentAuditorService, type DocumentAuditor } from './document-auditor.service'

const props = defineProps<{ documentId: string; auditorUserId?: string | null }>()
const { hasPermission } = useRoles()
const { isOwner } = useCompanyRole()
const canAssign = computed(() => isOwner.value || hasPermission('documents.update'))
const toast = useToast()
const usersService = useDocumentAssignmentService()
const auditorService = useDocumentAuditorService()
const current = ref<DocumentAuditor | null>(null)
const users = ref<DocumentAuditor[]>([])
const selected = ref('__NO_AUDITOR__')
const open = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref(false)
const noAuditorId = '__NO_AUDITOR__'
const options = computed(() => [{ id: noAuditorId, name: 'Sin auditor' }, ...users.value])

watch([() => props.documentId, () => props.auditorUserId], async ([id], _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  current.value = null
  open.value = false
  error.value = false
  loading.value = true
  try {
    const result = await auditorService.findOne(id)
    if (!stale) current.value = result
  } catch {
    if (!stale) error.value = true
  } finally {
    if (!stale) loading.value = false
  }
}, { immediate: true })

async function choose() {
  loading.value = true
  try {
    users.value = await usersService.findUsers()
    selected.value = current.value?.id ?? noAuditorId
    open.value = true
  } catch {
    toast.add({ title: 'No se pudieron cargar los usuarios', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  const userId = selected.value === noAuditorId ? null : selected.value
  if ((current.value?.id ?? null) === userId) return
  saving.value = true
  try {
    current.value = await auditorService.assign(props.documentId, userId)
    error.value = false
    open.value = false
    toast.add({ title: userId ? 'Auditor de seguimiento actualizado' : 'Auditor de seguimiento quitado', color: 'success' })
  } catch {
    toast.add({ title: 'No se pudo actualizar el auditor', color: 'error' })
  } finally {
    saving.value = false
  }
}

function closeModal() {
  open.value = false
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 print:hidden">
    <span class="text-sm text-muted">Auditor: {{ loading ? 'Cargando…' : error ? 'No se pudo cargar' : current?.name || 'Sin asignar' }}</span>
    <UButton v-if="canAssign" icon="i-lucide-eye" variant="soft" color="info" size="sm" :loading="loading" @click="choose">
      {{ current ? 'Cambiar auditor' : 'Asignar auditor' }}
    </UButton>
    <UModal v-model:open="open" title="Auditor de seguimiento" description="Elegí quién recibirá avisos y podrá revisar el historial de este documento.">
      <template #body>
        <UFormField label="Usuario de la empresa">
          <USelectMenu v-model="selected" :items="options" label-key="name" value-key="id" placeholder="Seleccionar usuario" class="w-full" :disabled="saving" />
        </UFormField>
      </template>
      <template #footer>
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="closeModal">Cancelar</UButton>
        <UButton color="info" :loading="saving" :disabled="(current?.id ?? noAuditorId) === selected" @click="save">Guardar</UButton>
      </template>
    </UModal>
  </div>
</template>
