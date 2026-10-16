<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'

// Alerta fiscal de CAI para remitos de venta.
// Evalúa la autorización contra la fecha de emisión del remito (no contra hoy)
// y ofrece reemplazarla cuando existe una autorización compatible.
const props = defineProps<{ document: any }>()
const emit = defineEmits<{ (e: 'replaced'): void, (e: 'evaluated', status: any): void }>()

const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const toast = useToast()

const status = ref<any>(null)
const loading = ref(false)
const replacing = ref(false)
const forcedConfirm = ref<any>(null)

const canReplace = computed(() => isOwnerOrAdmin.value || hasPermission('delivery_notes.replace_authorization'))
const isSalesRemito = computed(() =>
  props.document?.document_types?.category === 'REMITO' && props.document?.document_types?.direction === 1,
)
const isEditable = computed(() => [0, 1].includes(Number(props.document?.status)))
const INVALID = ['MISSING', 'REPLACEMENT_AVAILABLE', 'EXPIRED_BEFORE_ISSUE', 'OUT_OF_RANGE']
const isInvalid = computed(() => status.value && INVALID.includes(status.value.status))
const compatible = computed(() => status.value?.compatibleAuthorization)
const current = computed(() => status.value?.currentAuthorization)
const candidates = computed(() => status.value?.candidates ?? [])
const compatibleLabel = computed(() => authorizationLabel(compatible.value))

function authorizationLabel(a: any) {
  if (!a) return ''
  return `${a.authorization_type} ${a.code}`
}
function rangeLabel(a: any) {
  return `${String(a.range_from).padStart(8, '0')}–${String(a.range_to).padStart(8, '0')}`
}
function validityLabel(a: any) {
  return `Vigencia: ${formatDate(a.valid_from)} al ${formatDate(a.valid_to)} · Rango: ${rangeLabel(a)}`
}

async function fetchStatus() {
  if (!props.document?.id || !isSalesRemito.value) return
  loading.value = true
  status.value = await $fetch(`/api/backend/fiscal-authorizations/documents/${props.document.id}/status`).catch(() => null)
  if (status.value) emit('evaluated', status.value)
  loading.value = false
}

async function doReplace(body: Record<string, any>) {
  replacing.value = true
  try {
    const res: any = await $fetch(`/api/backend/fiscal-authorizations/documents/${props.document.id}/replace`, {
      method: 'PATCH',
      body,
    })
    toast.add({
      title: 'Autorización actualizada',
      description: res?.warning || res?.message,
      color: res?.warning ? 'warning' : 'success',
    })
    forcedConfirm.value = null
    await fetchStatus()
    emit('replaced')
  } catch (e: any) {
    toast.add({ title: 'No se pudo reemplazar la autorización', description: e?.data?.message, color: 'error' })
  } finally {
    replacing.value = false
  }
}

async function replaceAuthorization() {
  if (!props.document?.id) return
  await doReplace({})
}

// Asociación manual fuera de rango: pide confirmación explícita.
function askForceAssign(candidate: any) {
  forcedConfirm.value = candidate
}
async function confirmForceAssign() {
  if (!forcedConfirm.value) return
  await doReplace({ authorizationId: forcedConfirm.value.id, allowOutOfRange: true })
}
function cancelForceAssign() {
  if (!replacing.value) forcedConfirm.value = null
}

const forcedModalOpen = computed({
  get: () => !!forcedConfirm.value,
  set: (open: boolean) => { if (!open && !replacing.value) forcedConfirm.value = null },
})

onMounted(() => {
  fetchMyPermissionsIfNeeded()
  fetchStatus()
})
watch(() => props.document?.id, fetchStatus)
</script>

<template>
  <!-- Remito histórico válido: CAI vencido hoy, pero vigente al emitirse -->
  <UAlert
    v-if="status?.status === 'VALID_AT_ISSUE' && current"
    color="info"
    variant="soft"
    icon="i-lucide-archive"
    title="El CAI está vencido actualmente, pero era válido en la fecha de emisión."
    description="No es necesario modificar el remito."
  />

  <!-- Remito con CAI inválido -->
  <UAlert
    v-else-if="isInvalid"
    :color="isEditable ? 'warning' : 'error'"
    variant="soft"
    :icon="isEditable ? 'i-lucide-badge-alert' : 'i-lucide-file-warning'"
    :title="isEditable ? 'El CAI asociado no es válido para este remito.' : 'Este remito debe anularse y reemitirse.'"
  >
    <template #description>
      <div class="space-y-2">
        <p v-if="status.status === 'MISSING'">
          El remito no tiene una autorización fiscal asociada{{ compatible ? ', pero encontramos una autorización compatible:' : ' y no encontramos una autorización compatible para su fecha y numeración.' }}
        </p>
        <p v-else-if="status.status === 'EXPIRED_BEFORE_ISSUE'">
          La autorización {{ current ? `${current.authorization_type} ${current.code}` : 'asociada' }} no era válida en la fecha de emisión del remito{{ compatible ? ', pero encontramos una autorización compatible:' : ' y no encontramos una autorización compatible para su fecha y numeración.' }}
        </p>
        <p v-else-if="status.status === 'OUT_OF_RANGE'">
          El número del remito está fuera del rango autorizado{{ compatible ? ', pero encontramos una autorización compatible:' : ' y no encontramos una autorización compatible para su fecha y numeración.' }}
        </p>
        <p v-else>
          Encontramos una autorización compatible:
        </p>
        <p v-if="compatible" class="font-medium">
          {{ compatibleLabel }}<br>
          {{ validityLabel(compatible) }}
        </p>
        <div v-if="!compatible && isEditable && candidates.length">
          <p class="mb-1">
            Autorizaciones que cubren la fecha del remito pero no su numeración:
          </p>
          <ul class="space-y-1">
            <li v-for="candidate in candidates" :key="candidate.id" class="flex flex-wrap items-center gap-2 text-sm">
              <span class="font-medium">
                {{ authorizationLabel(candidate) }} · {{ validityLabel(candidate) }} · número {{ document.number }} fuera del rango
              </span>
              <UButton
                v-if="canReplace"
                label="Asociar de todos modos"
                icon="i-lucide-alert-triangle"
                color="warning"
                variant="outline"
                size="xs"
                :disabled="replacing"
                @click="askForceAssign(candidate)"
              />
            </li>
          </ul>
        </div>
        <p v-if="!isEditable" class="text-xs">
          Los remitos confirmados no cambian de CAI: usá "Anular y reemitir" para generar un remito nuevo con autorización válida.
        </p>
      </div>
    </template>
    <template v-if="isEditable && compatible && canReplace" #actions>
      <UButton
        label="Usar nueva autorización"
        icon="i-lucide-refresh-cw"
        color="warning"
        variant="outline"
        :loading="replacing"
        @click="replaceAuthorization"
      />
    </template>
  </UAlert>

  <!-- Confirmación de asociación fuera de rango -->
  <UModal v-model:open="forcedModalOpen" :dismissible="!replacing">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-alert-triangle" class="text-warning text-2xl mt-0.5" />
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">
              Asociar CAI fuera de rango
            </h2>
            <p class="text-sm text-muted">
              El número <strong>{{ document?.number }}</strong> del remito no está dentro del rango autorizado del
              <strong>{{ authorizationLabel(forcedConfirm) }}</strong>
              ({{ forcedConfirm ? rangeLabel(forcedConfirm) : '' }}, vigente hasta el
              {{ forcedConfirm ? formatDate(forcedConfirm.valid_to) : '' }}).
            </p>
            <p class="text-sm text-muted">
              Podés asociarlo de todos modos, pero quedaría un remito con un CAI que su rango no respalda. Verificá si el rango cargado es el correcto en
              <NuxtLink to="/settings/fiscal-authorizations" class="underline">
                Configuración de autorizaciones fiscales
              </NuxtLink>.
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" :disabled="replacing" @click="cancelForceAssign" />
          <UButton
            label="Asociar de todos modos"
            color="warning"
            :loading="replacing"
            @click="confirmForceAssign"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
