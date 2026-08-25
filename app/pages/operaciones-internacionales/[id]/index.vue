<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AssociateDocumentModal from '~/components/international-operations/AssociateDocumentModal.vue'
import AssociatePaymentModal from '~/components/international-operations/AssociatePaymentModal.vue'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type {
  OperationStatus,
  InternationalExpenseType,
  ContainerStatus,
  ContainerType
} from '~/modulos/international-operations/types/international-operations.types'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const route = useRoute()
const id = route.params.id as string

const {
  current: operation,
  summary,
  loading,
  fetchOne,
  fetchSummary,
  updateStatus,
  updateContainer,
  associateDocument,
  disassociateDocument,
  associatePayment,
  disassociatePayment,
  statusColor,
  statusLabel,
  containerStatusColor,
  containerStatusLabel,
  containerStatusOptions,
  containerTypeLabel,
  expenseTypeOptions,
  expenseTypeLabel,
  formatCurrency,
  formatDate,
  removeContainer,
  removeEvent
} = useInternationalOperations()

const showDocumentModal = ref(false)
const showPaymentModal = ref(false)

onMounted(async () => {
  await fetchOne(id)
  await fetchSummary(id)
})

const statusTransitions: Record<OperationStatus, { label: string; value: OperationStatus }[]> = {
  PLANNED: [{ label: 'En Preparación', value: 'IN_PREPARATION' }],
  IN_PREPARATION: [{ label: 'Embarcada', value: 'SHIPPED' }],
  SHIPPED: [{ label: 'En Tránsito', value: 'IN_TRANSIT' }],
  IN_TRANSIT: [{ label: 'Arribada', value: 'ARRIVED' }],
  ARRIVED: [{ label: 'Aduana', value: 'CUSTOMS' }],
  CUSTOMS: [{ label: 'Liberada', value: 'RELEASED' }],
  RELEASED: [{ label: 'Entregada', value: 'DELIVERED' }],
  DELIVERED: [{ label: 'Cerrada', value: 'CLOSED' }],
  CLOSED: [],
  CANCELLED: []
}

const containerStatusTransitions: Record<ContainerStatus, { label: string; value: ContainerStatus }[]> = {
  PREPARING: [{ label: 'Cargado', value: 'LOADED' }],
  LOADED: [{ label: 'Embarcado', value: 'SHIPPED' }],
  SHIPPED: [{ label: 'En Tránsito', value: 'IN_TRANSIT' }],
  IN_TRANSIT: [{ label: 'Arribado', value: 'ARRIVED' }],
  ARRIVED: [{ label: 'Aduana', value: 'CUSTOMS' }],
  CUSTOMS: [{ label: 'Liberado', value: 'RELEASED' }],
  RELEASED: [{ label: 'Entregado', value: 'DELIVERED' }],
  DELIVERED: [{ label: 'Cerrado', value: 'CLOSED' }],
  CLOSED: []
}

const nextStatuses = computed(() => {
  if (!operation.value) return []
  return statusTransitions[operation.value.status] ?? []
})

const handleStatusChange = async (status: OperationStatus) => {
  if (confirm(`¿Cambiar estado a "${statusLabel(status)}"?`)) {
    await updateStatus(id, status)
    await fetchSummary(id)
  }
}

const getNextContainerStatuses = (status: ContainerStatus) => {
  return containerStatusTransitions[status] ?? []
}

const handleContainerStatusChange = async (containerId: string, status: ContainerStatus) => {
  if (confirm(`¿Cambiar estado del contenedor a "${containerStatusLabel(status)}"?`)) {
    await updateContainer(containerId, { status })
    await fetchOne(id)
    await fetchSummary(id)
  }
}

const handleRemoveContainer = async (containerId: string) => {
  if (confirm('¿Eliminar este contenedor?')) {
    await removeContainer(containerId)
    await fetchSummary(id)
  }
}

const handleRemoveEvent = async (eventId: string) => {
  if (confirm('¿Eliminar este evento?')) {
    await removeEvent(eventId)
    await fetchOne(id)
  }
}

const handleAssociateDocument = async () => {
  showDocumentModal.value = true
}

const handleAssociatePayment = async () => {
  showPaymentModal.value = true
}

const handleDisassociateDocument = async (documentId: string) => {
  if (confirm('¿Desasociar este documento de la operación?')) {
    await disassociateDocument(id, documentId)
    await fetchOne(id)
    await fetchSummary(id)
  }
}

const handleDisassociatePayment = async (paymentId: string) => {
  if (confirm('¿Desasociar este pago de la operación?')) {
    await disassociatePayment(id, paymentId)
    await fetchOne(id)
    await fetchSummary(id)
  }
}

const getPaymentStatus = (doc: any): { label: string; color: string } => {
  const paid = doc.paid_amount ?? 0
  const total = doc.total ?? 0
  if (paid >= total) return { label: 'Pagado', color: 'success' }
  if (paid > 0) return { label: 'Parcial', color: 'warning' }
  return { label: 'Pendiente', color: 'error' }
}

const documentAssociatedIds = computed(() => operation.value?.operation_documents?.map((d) => d.document_id) ?? [])
const paymentAssociatedIds = computed(() => operation.value?.operation_payments?.map((p) => p.payment_id) ?? [])
</script>

<template>
  <UPage class="space-y-8 pb-8">
    <AppPageHeader
      v-if="operation"
      :title="operation.number"
      :description="operation.name ?? 'Operación Internacional'"
    >
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" to="/operaciones-internacionales" />
        <UButton
          label="Editar"
          variant="outline"
          icon="i-lucide-pencil"
          :to="`/operaciones-internacionales/${id}/edit`"
        />
      </template>
    </AppPageHeader>

    <div v-if="loading && !operation" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-32 w-full" />
    </div>

    <template v-if="operation">
      <!-- BADGES SECTION -->
      <div class="bg-white dark:bg-slate-900 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
        <div class="flex flex-wrap gap-3 items-center">
          <UBadge :label="statusLabel(operation.status)" :color="statusColor(operation.status)" size="lg" />
          <UBadge v-if="operation.incoterm" :label="operation.incoterm" color="neutral" variant="outline" />
          <UBadge :label="operation.transport_type" color="neutral" variant="outline" />
          <span v-if="operation.primary_supplier" class="text-muted text-sm ml-2">
            {{ operation.primary_supplier.name }}
          </span>
        </div>
      </div>

      <!-- STATUS TRANSITIONS -->
      <div
        v-if="nextStatuses.length"
        class="bg-white dark:bg-slate-900 rounded-lg p-5 border border-gray-200 dark:border-slate-700"
      >
        <p class="text-xs text-muted font-medium mb-3">Cambiar estado:</p>
        <div class="flex gap-2 flex-wrap">
          <UButton
            v-for="ns in nextStatuses"
            :key="ns.value"
            :label="`→ ${ns.label}`"
            color="primary"
            variant="outline"
            size="sm"
            @click="handleStatusChange(ns.value)"
          />
        </div>
      </div>

      <!-- STATS CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UPageCard variant="subtle" class="p-5">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium">Contenedores</p>
            <p class="text-3xl font-bold">{{ summary?.stats.containerCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" class="p-5">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium">Órdenes de Compra</p>
            <p class="text-3xl font-bold">{{ summary?.stats.purchaseOrderCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" class="p-5">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium">Facturas</p>
            <p class="text-3xl font-bold">{{ summary?.stats.documentCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle" class="p-5">
          <div class="space-y-2">
            <p class="text-xs text-muted font-medium">Pagos</p>
            <p class="text-3xl font-bold">{{ summary?.stats.paymentCount ?? 0 }}</p>
          </div>
        </UPageCard>
      </div>

      <!-- FINANCIAL & INFO SECTION -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UPageCard class="lg:col-span-2 p-6" title="Situación Financiera">
          <div v-if="summary" class="space-y-4">
            <div v-if="summary.financialByCurrency?.length" class="space-y-4">
              <div
                v-for="fc in summary.financialByCurrency"
                :key="fc.currency"
                class="border rounded-lg p-4 bg-gradient-to-br from-muted/20 to-muted/5"
              >
                <div class="flex items-center justify-between mb-4">
                  <span class="font-semibold text-base">{{ fc.currency }}</span>
                  <UBadge
                    :label="fc.currency === 'USD' ? 'Moneda de operación' : 'Moneda extranjera'"
                    color="neutral"
                    variant="outline"
                    size="xs"
                  />
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p class="text-xs text-muted mb-1 font-medium">Total</p>
                    <p class="font-bold text-lg">{{ formatCurrency(fc.total, fc.currency) }}</p>
                  </div>
                  <div class="text-center p-3 bg-success/10 rounded-lg border border-success/20">
                    <p class="text-xs text-muted mb-1 font-medium">Pagado</p>
                    <p class="font-bold text-lg text-success-500">{{ formatCurrency(fc.paid, fc.currency) }}</p>
                  </div>
                  <div class="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <p class="text-xs text-muted mb-1 font-medium">Pendiente</p>
                    <p class="font-bold text-lg text-warning-500">{{ formatCurrency(fc.pending, fc.currency) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div class="flex justify-between items-center p-4 bg-muted/20 rounded-lg">
                <span class="text-muted font-medium">Total</span>
                <span class="font-bold text-lg">{{ formatCurrency(summary.financial.total.amount) }}</span>
              </div>
              <div class="flex justify-between items-center p-4 bg-success/10 rounded-lg">
                <span class="text-muted font-medium">Pagado</span>
                <span class="font-bold text-lg text-success-500">
                  {{ formatCurrency(summary.financial.paid.amount) }}
                </span>
              </div>
              <div class="flex justify-between items-center p-4 bg-warning/10 rounded-lg">
                <span class="text-muted font-medium">Pendiente</span>
                <span
                  class="font-bold text-lg"
                  :class="summary.financial.pending.amount > 0 ? 'text-warning-500' : 'text-success-500'"
                >
                  {{ formatCurrency(summary.financial.pending.amount) }}
                </span>
              </div>
            </div>
          </div>
        </UPageCard>

        <UPageCard title="Información" class="p-6">
          <div class="space-y-4">
            <div class="pb-4 border-b border-gray-200 dark:border-slate-700">
              <p class="text-xs text-muted font-medium mb-1">Origen</p>
              <p class="font-medium text-base">{{ operation.origin_country ?? '—' }}</p>
            </div>
            <div class="pb-4 border-b border-gray-200 dark:border-slate-700">
              <p class="text-xs text-muted font-medium mb-1">Destino</p>
              <p class="font-medium text-base">{{ operation.destination_country ?? '—' }}</p>
            </div>
            <div class="pb-4 border-b border-gray-200 dark:border-slate-700">
              <p class="text-xs text-muted font-medium mb-1">ETA</p>
              <p class="font-medium text-base">{{ formatDate(operation.estimated_arrival_date) }}</p>
            </div>
            <div v-if="operation.actual_arrival_date">
              <p class="text-xs text-muted font-medium mb-1">Llegada real</p>
              <p class="font-medium text-base">{{ formatDate(operation.actual_arrival_date) }}</p>
            </div>
          </div>
        </UPageCard>
      </div>

      <!-- ALERTS -->
      <div
        v-if="summary?.alerts.etaOverdue"
        class="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg p-5"
      >
        <p class="text-error-600 dark:text-error-400 font-medium">
          ⚠️ ETA vencida — La fecha estimada de arribo ya pasó.
        </p>
      </div>
      <div
        v-else-if="summary?.alerts.etaApproaching"
        class="bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg p-5"
      >
        <p class="text-warning-600 dark:text-warning-400 font-medium">
          📅 ETA próxima — El arribo estimado es en menos de 3 días.
        </p>
      </div>

      <!-- CONTAINERS SECTION -->
      <UPageCard title="Contenedores" class="p-6">
        <template #header>
          <div class="flex items-center justify-between w-full px-6 pt-6">
            <span class="font-bold text-lg">Contenedores</span>
            <NuxtLink :to="`/operaciones-internacionales/${id}/containers/create`">
              <UButton label="Nuevo contenedor" icon="i-lucide-plus" size="sm" variant="outline" />
            </NuxtLink>
          </div>
        </template>
        <div v-if="operation.containers?.length" class="space-y-4 pt-4">
          <div
            v-for="container in operation.containers"
            :key="container.id"
            class="border rounded-xl p-5 bg-gradient-to-br from-white to-muted/5 dark:from-slate-900 dark:to-slate-800 hover:shadow-md transition-shadow"
          >
            <!-- Container Header -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5 pb-5 border-b border-gray-200 dark:border-slate-700"
            >
              <div>
                <p class="text-xs text-muted font-medium mb-1">Número</p>
                <p class="font-bold text-base">{{ container.container_number }}</p>
              </div>
              <div>
                <p class="text-xs text-muted font-medium mb-1">Estado</p>
                <UBadge
                  :label="containerStatusLabel(container.status)"
                  :color="containerStatusColor(container.status)"
                  size="sm"
                  variant="subtle"
                />
              </div>
              <div>
                <p class="text-xs text-muted font-medium mb-1">Tipo</p>
                <p class="font-bold text-base">{{ containerTypeLabel(container.container_type as ContainerType) }}</p>
              </div>
            </div>

            <!-- Container Details Grid 1 -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5 pb-5 border-b border-gray-200 dark:border-slate-700"
            >
              <div v-if="container.vessel_name">
                <p class="text-xs text-muted font-medium mb-1">Buque</p>
                <p class="font-medium">{{ container.vessel_name }}</p>
              </div>
              <div v-if="container.voyage_number">
                <p class="text-xs text-muted font-medium mb-1">Viaje</p>
                <p class="font-medium">{{ container.voyage_number }}</p>
              </div>
              <div v-if="container.seal_number">
                <p class="text-xs text-muted font-medium mb-1">Sello</p>
                <p class="font-medium">{{ container.seal_number }}</p>
              </div>
            </div>

            <!-- Container Details Grid 2 -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5 pb-5 border-b border-gray-200 dark:border-slate-700"
            >
              <div v-if="container.origin_port || container.destination_port">
                <p class="text-xs text-muted font-medium mb-1">Ruta</p>
                <p class="font-medium">{{ container.origin_port ?? '—' }} → {{ container.destination_port ?? '—' }}</p>
              </div>
              <div v-if="container.estimated_departure_date">
                <p class="text-xs text-muted font-medium mb-1">Salida estimada</p>
                <p class="font-medium">{{ formatDate(container.estimated_departure_date) }}</p>
              </div>
              <div v-if="container.estimated_arrival_date">
                <p class="text-xs text-muted font-medium mb-1">Arribo estimado (ETA)</p>
                <p class="font-medium">{{ formatDate(container.estimated_arrival_date) }}</p>
              </div>
            </div>

            <!-- Container Details Grid 3 -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5"
              v-if="
                container.actual_departure_date || container.actual_arrival_date || container.weight || container.volume
              "
            >
              <div v-if="container.actual_departure_date">
                <p class="text-xs text-muted font-medium mb-1">Salida real</p>
                <p class="font-medium">{{ formatDate(container.actual_departure_date) }}</p>
              </div>
              <div v-if="container.actual_arrival_date">
                <p class="text-xs text-muted font-medium mb-1">Arribo real</p>
                <p class="font-medium">{{ formatDate(container.actual_arrival_date) }}</p>
              </div>
              <div v-if="container.weight">
                <p class="text-xs text-muted font-medium mb-1">Peso</p>
                <p class="font-medium">{{ container.weight }} kg</p>
              </div>
              <div v-if="container.volume">
                <p class="text-xs text-muted font-medium mb-1">Volumen</p>
                <p class="font-medium">{{ container.volume }} m³</p>
              </div>
            </div>

            <!-- Container Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <NuxtLink :to="`/operaciones-internacionales/${id}/containers/${container.id}`">
                <UButton label="Ver detalle" icon="i-lucide-eye" size="xs" variant="outline" />
              </NuxtLink>

              <UDropdownMenu
                :items="[
                  containerStatusOptions
                    .filter((s) => s.value !== container.status && s.value !== 'CLOSED')
                    .map((ns) => ({
                      label: ns.label,
                      icon: 'i-lucide-arrow-right',
                      onSelect: () => handleContainerStatusChange(container.id, ns.value)
                    }))
                ]"
              >
                <UButton label="Cambiar estado" icon="i-lucide-refresh-cw" size="xs" variant="outline" />
              </UDropdownMenu>

              <UButton
                label="Eliminar"
                icon="i-lucide-trash"
                color="error"
                size="xs"
                variant="ghost"
                @click="handleRemoveContainer(container.id)"
              />
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm text-center py-10">No hay contenedores asociados.</p>
      </UPageCard>

      <!-- DOCUMENTS SECTION -->
      <UPageCard title="Documentos Asociados" class="p-6">
        <template #header>
          <div class="flex items-center justify-between w-full px-6 pt-6">
            <span class="font-bold text-lg">Documentos</span>
            <UButton
              label="Asociar documento"
              icon="i-lucide-plus"
              size="sm"
              variant="outline"
              @click="handleAssociateDocument"
            />
          </div>
        </template>

        <div v-if="summary?.expenseGroups?.length" class="space-y-5 pt-4">
          <div v-for="group in summary.expenseGroups" :key="group.type" class="border rounded-xl overflow-hidden">
            <div
              class="bg-gradient-to-r from-muted/40 to-muted/20 px-5 py-4 flex items-center justify-between border-b"
            >
              <div class="flex items-center gap-3">
                <span class="font-bold">{{ group.label }}</span>
                <UBadge :label="group.type" color="neutral" variant="outline" size="xs" />
              </div>
              <div class="flex items-center gap-5 text-sm">
                <span class="font-bold">{{ formatCurrency(group.total) }}</span>
                <span v-if="group.paid > 0" class="text-success-500 font-medium">
                  Pagado: {{ formatCurrency(group.paid) }}
                </span>
                <span v-if="group.pending > 0" class="text-warning-500 font-medium">
                  Pendiente: {{ formatCurrency(group.pending) }}
                </span>
                <UBadge :label="`${group.documentCount} docs`" color="neutral" variant="outline" size="xs" />
              </div>
            </div>

            <div
              v-for="rel in group.documents"
              :key="rel.document_id"
              class="p-5 border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div class="flex items-start justify-between gap-4 mb-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 flex-wrap mb-3">
                    <span class="font-bold">
                      {{ rel.document?.document_types?.code }} Nº {{ rel.document?.number }}
                    </span>
                    <span class="text-muted text-sm">{{ rel.document?.document_types?.description }}</span>
                    <UBadge
                      :label="expenseTypeLabel(rel.expense_type as InternationalExpenseType)"
                      color="neutral"
                      variant="outline"
                      size="xs"
                    />
                    <span
                      v-if="rel.container_id"
                      class="text-xs px-3 py-1 bg-primary/20 text-primary-700 dark:text-primary-300 rounded-full font-medium"
                    >
                      📦 Contenedor:
                      {{
                        operation.containers?.find((c) => c.id === rel.container_id)?.container_number ??
                        rel.container_id
                      }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-muted flex-wrap">
                    <span class="font-medium">
                      {{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}
                    </span>
                    <span>{{ formatDate(rel.document?.date) }}</span>
                    <span v-if="rel.document?.business_parties">
                      {{ rel.document.business_parties.name }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted font-medium">Estado:</span>
                    <UBadge
                      :label="getPaymentStatus(rel.document).label"
                      :color="getPaymentStatus(rel.document).color"
                      size="xs"
                      variant="subtle"
                    />
                  </div>
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-x"
                    size="xs"
                    @click="handleDisassociateDocument(rel.document_id)"
                  />
                </div>
              </div>

              <!-- Payment history for this document -->
              <div
                v-if="rel.document?.payment_documents?.length"
                class="mt-4 ml-4 pl-4 border-l-2 border-primary/40 space-y-3"
              >
                <div class="text-xs font-bold text-primary mb-2">💳 Pagos asociados:</div>
                <div
                  v-for="pd in rel.document.payment_documents"
                  :key="pd.payment_id"
                  class="flex items-center gap-3 text-sm bg-muted/20 rounded-lg p-3"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium">Pago Nº {{ pd.payment?.number }}</span>
                      <UBadge
                        :label="pd.payment?.status"
                        :color="pd.payment?.status === 'PAID' ? 'success' : 'warning'"
                        size="xs"
                        variant="subtle"
                      />
                    </div>
                    <div class="flex items-center gap-2 text-xs text-muted">
                      <span>{{ formatDate(pd.payment?.date) }}</span>
                      <span v-if="pd.payment?.payment_method">{{ pd.payment.payment_method }}</span>
                    </div>
                  </div>
                  <div class="text-right text-sm font-medium">
                    {{ formatCurrency(Number(pd.amount_applied ?? 0), pd.payment?.currency_code) }}
                  </div>
                </div>
              </div>

              <div v-else class="mt-4 ml-4 pl-4 border-l-2 border-muted/40 text-xs text-muted py-2">
                Sin pagos asociados a esta factura.
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm text-center py-10">
          No hay documentos asociados.
          <UButton label="Asociar" variant="ghost" size="xs" class="ml-2" @click="handleAssociateDocument" />
        </p>
      </UPageCard>

      <!-- NOTES SECTION -->
      <UPageCard v-if="operation.notes" title="Notas" class="p-6">
        <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ operation.notes }}</p>
      </UPageCard>

      <!-- MODALS -->
      <AssociateDocumentModal
        v-model:open="showDocumentModal"
        :operation-id="id"
        :operation-currency-code="operation.currency_code ?? 'USD'"
        :containers="operation.containers"
        :exclude-document-ids="documentAssociatedIds"
        @associated="
          () => {
            fetchOne(id)
            fetchSummary(id)
          }
        "
      />

      <AssociatePaymentModal
        v-model:open="showPaymentModal"
        :operation-id="id"
        :exclude-payment-ids="paymentAssociatedIds"
        @associated="
          () => {
            fetchOne(id)
            fetchSummary(id)
          }
        "
      />
    </template>
  </UPage>
</template>
