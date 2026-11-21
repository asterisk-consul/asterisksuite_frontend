<script setup lang="ts">
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useFiscalAuthorizationsService } from '~/modulos/erp/fiscal/service/fiscal-authorizations.service'

// Alerta fiscal de CAI para remitos de venta.
// Evalúa la autorización contra la fecha de emisión del remito (no contra hoy)
// y ofrece reemplazarla cuando existe una autorización compatible.
const props = defineProps<{ document: any }>()
const emit = defineEmits<{ (e: 'replaced'): void, (e: 'evaluated', status: any): void }>()

const { hasPermission, fetchMyPermissionsIfNeeded } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const toast = useToast()
const authorizationsService = useFiscalAuthorizationsService()

const status = ref<any>(null)
const loading = ref(false)
const replacing = ref(false)
const forcedConfirm = ref<any>(null)
const associationModalOpen = ref(false)
const authorizationsLoading = ref(false)
const authorizationsError = ref(false)
const authorizations = ref<any[]>([])
const selectedAuthorizationId = ref<string | null>(null)

const canReplace = computed(() => isOwnerOrAdmin.value || hasPermission('delivery_notes.replace_authorization'))
const canCreateAuthorization = computed(() => isOwnerOrAdmin.value || hasPermission('fiscal-authorizations.create'))
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
const eligibleAuthorizations = computed(() => {
  const documentDate = String(props.document?.date ?? '').slice(0, 10)
  const documentNumber = Number(props.document?.number)
  if (!documentDate || !Number.isFinite(documentNumber)) return []

  return authorizations.value
    .filter((authorization: any) => {
      const replacementDate = authorization.replacement_date
        ? String(authorization.replacement_date).slice(0, 10)
        : null
      return authorization.status === 'ACTIVE'
        && authorization.document_type_id === props.document?.document_type_id
        && authorization.document_sequence_id === props.document?.document_sequence_id
        && String(authorization.valid_from).slice(0, 10) <= documentDate
        && String(authorization.valid_to).slice(0, 10) >= documentDate
        && (!replacementDate || replacementDate > documentDate)
        && authorization.id !== current.value?.id
    })
    .sort((left: any, right: any) => {
      const leftInRange = documentNumber >= Number(left.range_from) && documentNumber <= Number(left.range_to)
      const rightInRange = documentNumber >= Number(right.range_from) && documentNumber <= Number(right.range_to)
      return Number(rightInRange) - Number(leftInRange)
        || String(right.valid_to).localeCompare(String(left.valid_to))
    })
})
const authorizationOptions = computed(() => eligibleAuthorizations.value.map((authorization: any) => {
  const number = Number(props.document?.number)
  const inRange = number >= Number(authorization.range_from) && number <= Number(authorization.range_to)
  return {
    value: authorization.id,
    label: `${authorizationLabel(authorization)} · ${formatDate(authorization.valid_from)} al ${formatDate(authorization.valid_to)} · números ${rangeLabel(authorization)}${inRange ? '' : ' · fuera de rango'}`,
  }
}))
const daysRemaining = computed(() => {
  if (!current.value?.valid_to) return null
  const expiration = new Date(`${String(current.value.valid_to).slice(0, 10)}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000)
})
const isExpiringSoon = computed(() => status.value?.status === 'VALID' && daysRemaining.value != null && daysRemaining.value >= 0 && daysRemaining.value <= 5)
const renewalLink = computed(() => ({
  path: '/settings/fiscal-authorizations',
  query: {
    new: '1',
    authorization_id: current.value?.id,
    document_type_id: props.document?.document_type_id,
    document_sequence_id: props.document?.document_sequence_id,
    return_to: `/erp/remitos/${props.document?.id}`,
  },
}))

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
  status.value = await authorizationsService.getDocumentStatus(props.document.id).catch(() => null)
  if (status.value) emit('evaluated', { ...status.value, expiringSoon: isExpiringSoon.value })
  loading.value = false
}

async function doReplace(body: Record<string, any>) {
  replacing.value = true
  try {
    const res: any = await authorizationsService.replaceForDocument(props.document.id, body)
    toast.add({
      title: 'Autorización actualizada',
      description: res?.warning || res?.message,
      color: res?.warning ? 'warning' : 'success',
    })
    forcedConfirm.value = null
    associationModalOpen.value = false
    await fetchStatus()
    emit('replaced')
    return true
  } catch (e: any) {
    toast.add({ title: 'No se pudo reemplazar la autorización', description: e?.data?.message, color: 'error' })
    return false
  } finally {
    replacing.value = false
  }
}

async function replaceAuthorization() {
  if (!props.document?.id) return
  await doReplace({})
}

async function fetchAuthorizations() {
  if (!canReplace.value || !isSalesRemito.value) return
  authorizationsLoading.value = true
  authorizationsError.value = false
  try {
    authorizations.value = await authorizationsService.findAll()
  } catch {
    authorizations.value = []
    authorizationsError.value = true
  } finally {
    authorizationsLoading.value = false
  }
}

function openAssociationModal() {
  selectedAuthorizationId.value = null
  associationModalOpen.value = true
  if (!authorizations.value.length && !authorizationsLoading.value) fetchAuthorizations()
}

function closeAssociationModal() {
  associationModalOpen.value = false
}

async function associateSelectedAuthorization() {
  const authorization = eligibleAuthorizations.value.find((item: any) => item.id === selectedAuthorizationId.value)
  if (!authorization) return
  const number = Number(props.document?.number)
  const outOfRange = number < Number(authorization.range_from) || number > Number(authorization.range_to)
  if (outOfRange) {
    associationModalOpen.value = false
    askForceAssign(authorization)
    return
  }
  await doReplace({ authorizationId: authorization.id })
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

onMounted(async () => {
  await fetchMyPermissionsIfNeeded()
  await fetchStatus()
})
watch(() => props.document?.id, () => {
  fetchStatus()
  authorizations.value = []
  authorizationsError.value = false
})
</script>

<template>
  <UAlert
    v-if="status?.status === 'NOT_REQUIRED_BY_TYPE'"
    color="info"
    variant="soft"
    icon="i-lucide-badge-minus"
    title="Este tipo de documento no requiere CAI"
    description="La regla se configura en Ajustes → Tipos de documentos."
  />

  <UAlert
    v-if="isExpiringSoon && current"
    color="warning"
    variant="soft"
    icon="i-lucide-calendar-clock"
    :title="daysRemaining === 0 ? 'El CAI vence hoy' : `El CAI vence en ${daysRemaining} día(s)`"
    :description="`${authorizationLabel(current)} vence el ${formatDate(current.valid_to)}. Podés cargar ahora la próxima autorización; el remito conserva el CAI que corresponde a su fecha.`"
  >
    <template v-if="canCreateAuthorization" #actions>
      <UButton
        label="Cargar nuevo CAI"
        icon="i-lucide-badge-plus"
        color="warning"
        variant="solid"
        :to="renewalLink"
      />
    </template>
  </UAlert>

  <UAlert
    v-if="status?.status === 'VALID' && isEditable && !isExpiringSoon && current"
    color="success"
    variant="soft"
    icon="i-lucide-badge-check"
    :title="`${authorizationLabel(current)} está asociado a este remito`"
    :description="validityLabel(current)"
  >
  </UAlert>

  <!-- Remito histórico válido: CAI vencido hoy, pero vigente al emitirse -->
  <UAlert
    v-if="status?.status === 'VALID_AT_ISSUE' && current"
    color="info"
    variant="soft"
    icon="i-lucide-archive"
    title="El CAI está vencido actualmente, pero era válido en la fecha de emisión."
    description="El CAI era válido en la fecha del remito."
  >
  </UAlert>

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
    <template v-if="isEditable && canReplace" #actions>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="compatible"
          label="Usar autorización compatible"
          icon="i-lucide-refresh-cw"
          color="warning"
          variant="outline"
          :loading="replacing"
          @click="replaceAuthorization"
        />
        <UButton
          label="Elegir CAI"
          icon="i-lucide-list-checks"
          color="warning"
          variant="outline"
          :disabled="replacing"
          @click="openAssociationModal"
        />
      </div>
    </template>
  </UAlert>

  <!-- Selección manual para remitos ya creados que siguen en borrador o pendientes. -->
  <UModal v-model:open="associationModalOpen" title="Asociar CAI al remito">
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          Elegí una autorización activa del mismo tipo y punto de venta, vigente en la fecha del remito.
        </p>
        <UAlert
          v-if="authorizationsError"
          color="error"
          variant="soft"
          title="No se pudieron cargar las autorizaciones"
          description="Revisá que tengas permiso para ver autorizaciones fiscales y volvé a intentarlo."
        />
        <UFormField label="Autorización fiscal">
          <USelectMenu
            v-model="selectedAuthorizationId"
            :items="authorizationOptions"
            value-key="value"
            label-key="label"
            searchable
            :loading="authorizationsLoading"
            :disabled="authorizationsLoading || !authorizationOptions.length"
            placeholder="Seleccionar CAI"
            class="w-full"
          />
        </UFormField>
        <p v-if="!authorizationsLoading && !authorizationsError && !eligibleAuthorizations.length" class="text-sm text-muted">
          No hay CAI activo para este tipo, punto de venta y fecha. Revisá la configuración de autorizaciones fiscales.
        </p>
      </div>
      <div class="flex justify-end gap-2 pt-4">
        <UButton label="Cancelar" variant="ghost" @click="closeAssociationModal" />
        <UButton
          label="Asociar CAI"
          color="warning"
          :loading="replacing"
          :disabled="!selectedAuthorizationId || authorizationsLoading || !canReplace"
          @click="associateSelectedAuthorization"
        />
      </div>
    </template>
  </UModal>

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
