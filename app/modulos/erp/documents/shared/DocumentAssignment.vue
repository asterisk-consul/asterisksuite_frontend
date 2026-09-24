<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

const props = defineProps<{ documentId: string }>()
type User = { id: string; name: string }
const { hasPermission } = useRoles()
const { isOwner } = useCompanyRole()
const canAssign = computed(() => isOwner.value || hasPermission('documents.update'))
const toast = useToast()
const current = ref<User | null>(null)
const users = ref<User[]>([])
const selected = ref<string>()
const open = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref(false)

watch(() => props.documentId, async (id, _, onCleanup) => {
  let stale = false
  onCleanup(() => { stale = true })
  current.value = null
  open.value = false
  error.value = false
  loading.value = true
  try {
    const result = await $fetch<User | null>(`/api/backend/documents/assignment/${id}`)
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
    users.value = await $fetch<User[]>('/api/backend/documents/assignment/users')
    selected.value = current.value?.id
    open.value = true
  } catch {
    toast.add({ title: 'No se pudieron cargar los usuarios', color: 'error' })
  } finally { loading.value = false }
}

async function save() {
  if (!selected.value || saving.value) return
  saving.value = true
  try {
    current.value = await $fetch<User>(`/api/backend/documents/assignment/${props.documentId}`, {
      method: 'PATCH', body: { user_id: selected.value }
    })
    error.value = false
    open.value = false
    toast.add({ title: 'Responsable actualizado', color: 'success' })
  } catch {
    toast.add({ title: 'No se pudo asignar el documento', color: 'error' })
  } finally { saving.value = false }
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 print:hidden">
    <span class="text-sm text-muted">Responsable: {{ loading ? 'Cargandoâ€¦' : error ? 'No se pudo cargar' : current?.name || 'Sin asignar' }}</span>
    <UButton v-if="canAssign" icon="i-lucide-user-round-pen" variant="soft" size="sm" :loading="loading" @click="choose">
      {{ current ? 'Cambiar responsable' : 'Asignar responsable' }}
    </UButton>
    <UModal v-model:open="open" title="Asignar responsable" description="Elegí quién debe ocuparse de este documento.">
      <template #body>
        <UFormField label="Usuario de la empresa">
          <USelectMenu v-model="selected" :items="users" label-key="name" value-key="id" placeholder="Seleccionar usuario" class="w-full" :disabled="saving" />
        </UFormField>
      </template>
      <template #footer>
        <UButton variant="ghost" color="neutral" :disabled="saving" @click="open = false">Cancelar</UButton>
        <UButton :loading="saving" :disabled="!selected || selected === current?.id" @click="save">Asignar</UButton>
      </template>
    </UModal>
  </div>
</template>
