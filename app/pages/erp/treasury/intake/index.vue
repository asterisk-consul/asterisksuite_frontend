<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { h } from 'vue'
import { UBadge, UButton } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { SortingState } from '@tanstack/vue-table'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

type IntakeStatus = 'DRAFT' | 'SENT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
interface IntakeRecord {
  id: string; title: string; notes?: string | null; suggested_type?: string | null
  status: IntakeStatus; created_by?: string | null; assigned_to?: string | null; created_at: string
  creator?: { name: string } | null; assignee?: { name: string } | null
  target_type?: string | null; target_id?: string | null
}

const toast = useToast()
const authStore = useAuthStore()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canCreate = computed(() => isOwnerOrAdmin.value || hasPermission('intake.create'))
const canUpload = computed(() => isOwnerOrAdmin.value || hasPermission('intake.upload'))
const canSend = computed(() => isOwnerOrAdmin.value || hasPermission('intake.send'))
const canDelete = computed(() => isOwnerOrAdmin.value || hasPermission('intake.delete'))
const canProcess = computed(() => isOwnerOrAdmin.value || hasPermission('intake.process'))
const records = ref<IntakeRecord[]>([])
const users = ref<Array<{ id: string; name: string; email: string }>>([])
const loading = ref(false)
const createOpen = ref(false)
const detailOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)
const creating = ref(false)
const newCapture = ref<IntakeRecord | null>(null)
const selected = ref<IntakeRecord | null>(null)
const form = reactive({ title: '', notes: '', suggested_type: 'PAYMENT' })
const assignedTo = ref('')
const sorting = ref<SortingState>([{ id: 'created_at', desc: true }])

const typeOptions = [
  { label: 'Pago o cobro', value: 'PAYMENT' },
  { label: 'Cheque', value: 'CHECK' },
  { label: 'Documento de compra', value: 'PURCHASE_DOCUMENT' },
  { label: 'Documento de venta', value: 'SALES_DOCUMENT' },
  { label: 'Depósito de cheque', value: 'CHECK_DEPOSIT' },
  { label: 'Sin clasificar', value: 'OTHER' },
]
const statusInfo: Record<IntakeStatus, { label: string; color: any }> = {
  DRAFT: { label: 'Borrador', color: 'neutral' }, SENT: { label: 'Enviado', color: 'warning' },
  IN_PROGRESS: { label: 'En proceso', color: 'info' }, COMPLETED: { label: 'Completado', color: 'success' },
  REJECTED: { label: 'Rechazado', color: 'error' },
}

const typeLabels = Object.fromEntries(typeOptions.map(option => [option.value, option.label]))
const columns: TableColumn<IntakeRecord>[] = [
  { accessorKey: 'title', header: 'Comprobante' },
  {
    id: 'direction',
    header: 'Bandeja',
    cell: ({ row }) => {
      const sentByMe = row.original.created_by === authStore.user?.id
      return h(UBadge, {
        label: sentByMe ? 'Enviado por mí' : 'Recibido',
        color: sentByMe ? 'neutral' : 'primary',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'suggested_type',
    header: 'Tipo sugerido',
    cell: ({ row }) => typeLabels[row.original.suggested_type || 'OTHER'] || 'Sin clasificar'
  },
  {
    id: 'participants',
    header: 'De / para',
    cell: ({ row }) => `${row.original.creator?.name || 'Sin identificar'} → ${row.original.assignee?.name || 'Sin asignar'}`
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => h(UBadge, {
      label: statusInfo[row.original.status].label,
      color: statusInfo[row.original.status].color,
      variant: 'subtle'
    })
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString('es-AR')
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h(UButton, {
      label: 'Abrir', icon: 'i-lucide-eye', size: 'xs', variant: 'ghost',
      onClick: () => openRecord(row.original)
    })
  }
]

const load = async () => {
  loading.value = true
  try {
    [records.value, users.value] = await Promise.all([
      $fetch<IntakeRecord[]>('/api/intake-records'),
      $fetch<Array<{ id: string; name: string; email: string }>>('/api/access-control/users/all'),
    ])
  } finally { loading.value = false }
}

onMounted(load)

const createCapture = async () => {
  creating.value = true
  try {
    const created = await $fetch<IntakeRecord>('/api/intake-records', { method: 'POST', body: form })
    Object.assign(form, { title: '', notes: '', suggested_type: 'PAYMENT' })
    records.value.unshift(created)
    selected.value = created
    newCapture.value = created
    toast.add({ title: 'Borrador creado', description: 'Ahora adjuntá la foto o el PDF en este mismo paso.', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudo crear', description: e?.data?.message, color: 'error' })
  } finally {
    creating.value = false
  }
}

const openNewCapture = () => {
  newCapture.value = null
  Object.assign(form, { title: '', notes: '', suggested_type: 'PAYMENT' })
  createOpen.value = true
}

const finishNewCapture = (continueToAssignment = false) => {
  createOpen.value = false
  if (continueToAssignment && newCapture.value) {
    selected.value = newCapture.value
    assignedTo.value = ''
    detailOpen.value = true
  }
  newCapture.value = null
}

const openRecord = (record: IntakeRecord) => {
  selected.value = record
  assignedTo.value = record.assigned_to || ''
  detailOpen.value = true
}

const sendRecord = async () => {
  if (!selected.value) return
  try {
    await $fetch(`/api/intake-records/${selected.value.id}/send`, { method: 'POST', body: { assigned_to: assignedTo.value } })
    toast.add({ title: 'Captura enviada', color: 'success' })
    detailOpen.value = false
    await load()
  } catch (e: any) { toast.add({ title: 'No se pudo enviar', description: e?.data?.message, color: 'error' }) }
}

const startRecord = async () => {
  if (!selected.value) return
  try {
    await $fetch(`/api/intake-records/${selected.value.id}/start`, { method: 'POST' })
    selected.value.status = 'IN_PROGRESS'
    await load()
  } catch (e: any) { toast.add({ title: 'No se pudo iniciar', description: e?.data?.message, color: 'error' }) }
}

const deleteRecord = async () => {
  if (!selected.value) return
  deleting.value = true
  try {
    await $fetch(`/api/intake-records/${selected.value.id}`, { method: 'DELETE' })
    records.value = records.value.filter(record => record.id !== selected.value?.id)
    deleteOpen.value = false
    detailOpen.value = false
    selected.value = null
    toast.add({ title: 'Borrador eliminado', description: 'También se eliminaron sus archivos adjuntos.', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'No se pudo eliminar', description: e?.data?.message || e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}

const targetLink = computed(() => {
  if (!selected.value) return null
  const query = `?intakeId=${selected.value.id}`
  if (selected.value.suggested_type === 'CHECK') return `/erp/treasury/checks/create${query}`
  if (selected.value.suggested_type === 'CHECK_DEPOSIT') return `/erp/treasury/checks${query}`
  if (selected.value.suggested_type === 'PURCHASE_DOCUMENT') return `/erp/purchases/purchases-documents/new${query}`
  if (selected.value.suggested_type === 'SALES_DOCUMENT') return `/erp/sales/new${query}`
  return `/erp/treasury/payments/create${query}`
})
</script>

<template>
  <UPage class="space-y-4">
    <AppPageHeader title="Capturas pendientes" description="Comprobantes enviados para completar y registrar.">
      <template v-if="canCreate" #links><UButton label="Nueva captura" icon="i-lucide-camera" @click="openNewCapture" /></template>
    </AppPageHeader>

    <LogisticaTable
      v-model:sorting="sorting"
      :data="records"
      :columns="columns"
      :loading="loading"
    />
  </UPage>

  <UModal v-model:open="createOpen" :title="newCapture ? 'Adjuntar comprobante' : 'Nueva captura rápida'" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body><div class="space-y-4">
      <template v-if="!newCapture">
        <UAlert color="primary" variant="soft" icon="i-lucide-info" title="Paso 1 de 2" description="Primero identificá brevemente el comprobante. En el siguiente paso podrás subir la foto o PDF sin salir de esta ventana." />
        <UFormField label="Título del documento"><UInput v-model="form.title" placeholder="Ej.: Factura de proveedor recibida" class="w-full" /></UFormField>
        <UFormField label="Tipo de registro"><USelect v-model="form.suggested_type" :items="typeOptions" class="w-full" /></UFormField>
        <UFormField label="Nota (opcional)"><UTextarea v-model="form.notes" placeholder="Información útil para quien complete el registro" :rows="3" class="w-full" /></UFormField>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="createOpen = false" />
          <UButton label="Continuar y subir archivo" icon="i-lucide-arrow-right" :loading="creating" @click="createCapture" />
        </div>
      </template>
      <template v-else>
        <UAlert color="success" variant="soft" icon="i-lucide-circle-check" title="Paso 2 de 2: subir la captura" description="Adjuntá una foto o PDF. El borrador se guarda aunque no lo envíes a otra persona." />
        <UiAttachmentManager entity-type="intake" :entity-id="newCapture.id" :allow-upload="canUpload" default-expanded />
        <UAlert
          v-if="!canUpload"
          color="warning"
          variant="soft"
          icon="i-lucide-lock-keyhole"
          title="No tenés permiso para adjuntar archivos"
          description="Un administrador debe asignarte el permiso “Adjuntar imágenes o PDF a capturas”."
        />
        <div class="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <UButton label="Guardar borrador y cerrar" color="neutral" variant="ghost" @click="finishNewCapture(false)" />
          <UButton label="Continuar para asignar usuario" icon="i-lucide-user-round-plus" @click="finishNewCapture(true)" />
        </div>
      </template>
    </div></template>
  </UModal>

  <UModal v-model:open="detailOpen" :title="selected?.title" :ui="{ content: 'sm:max-w-4xl' }">
    <template #body><div v-if="selected" class="space-y-4">
      <div class="flex items-center justify-between"><UBadge :label="statusInfo[selected.status].label" :color="statusInfo[selected.status].color" /><span class="text-sm text-muted">{{ selected.assignee?.name || 'Sin responsable' }}</span></div>
      <p v-if="selected.notes" class="text-sm">{{ selected.notes }}</p>

      <div class="grid gap-2 sm:grid-cols-3">
        <div class="rounded-lg border p-3" :class="selected.status === 'DRAFT' ? 'border-primary bg-primary/5' : 'border-default'">
          <p class="text-xs font-semibold text-primary">PASO 1</p>
          <p class="mt-1 text-sm font-medium">Adjuntar comprobante</p>
          <p class="mt-1 text-xs text-muted">Subí una foto o un PDF y verificá que se vea.</p>
        </div>
        <div class="rounded-lg border p-3" :class="selected.status === 'SENT' ? 'border-primary bg-primary/5' : 'border-default'">
          <p class="text-xs font-semibold text-primary">PASO 2</p>
          <p class="mt-1 text-sm font-medium">Enviar al responsable</p>
          <p class="mt-1 text-xs text-muted">Es opcional mientras el registro sea borrador.</p>
        </div>
        <div class="rounded-lg border p-3" :class="selected.status === 'IN_PROGRESS' ? 'border-primary bg-primary/5' : 'border-default'">
          <p class="text-xs font-semibold text-primary">PASO 3</p>
          <p class="mt-1 text-sm font-medium">Completar los datos</p>
          <p class="mt-1 text-xs text-muted">El responsable crea el registro definitivo.</p>
        </div>
      </div>

      <UiAttachmentManager
        entity-type="intake"
        :entity-id="selected.id"
        :readonly="selected.status !== 'DRAFT'"
        :allow-upload="selected.status === 'DRAFT' && canUpload"
      />
      <div v-if="selected.status === 'DRAFT'" class="border-t border-default pt-4 space-y-3">
        <div v-if="canSend">
          <p class="font-medium">Enviar para que otra persona lo complete</p>
          <p class="text-sm text-muted">Este paso es opcional. El comprobante queda guardado aunque no lo envíes.</p>
        </div>
        <UFormField v-if="canSend" label="Usuario responsable"><USelect v-model="assignedTo" :items="users.map(u => ({ label: `${u.name} · ${u.email}`, value: u.id }))" placeholder="Seleccionar usuario" class="w-full" /></UFormField>
        <div class="flex justify-between gap-2">
          <UButton
            v-if="canDelete && !selected.assigned_to && selected.created_by === authStore.user?.id"
            label="Eliminar borrador"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            @click="deleteOpen = true"
          />
          <span v-else />
          <UButton v-if="canSend" label="Enviar para completar" icon="i-lucide-send" :disabled="!assignedTo" @click="sendRecord" />
        </div>
      </div>
      <div v-else-if="selected.status === 'SENT' && canProcess" class="flex justify-end"><UButton label="Comenzar carga" icon="i-lucide-play" @click="startRecord" /></div>
      <div v-else-if="selected.status === 'IN_PROGRESS' && canProcess" class="flex justify-end">
        <UButton
          :to="targetLink || undefined"
          :label="selected.suggested_type === 'CHECK_DEPOSIT' ? 'Seleccionar cheque a depositar' : 'Crear registro definitivo'"
          icon="i-lucide-arrow-right"
        />
      </div>
      <div v-else-if="selected.status === 'COMPLETED'" class="text-sm text-success">Procesado correctamente.</div>
    </div></template>
  </UModal>

  <UModal v-model:open="deleteOpen" title="Eliminar captura en borrador">
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Se eliminará esta captura"
          description="También dejarán de estar disponibles todas las imágenes y documentos adjuntos a este borrador."
        />
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="ghost" @click="deleteOpen = false" />
          <UButton label="Eliminar borrador" icon="i-lucide-trash-2" color="error" :loading="deleting" @click="deleteRecord" />
        </div>
      </div>
    </template>
  </UModal>
</template>
