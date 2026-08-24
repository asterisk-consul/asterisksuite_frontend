<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useInternationalOperations } from '~/modulos/international-operations/composable/useInternationalOperations'
import type { OperationStatus } from '~/modulos/international-operations/types/international-operations.types'

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
  statusColor,
  statusLabel,
  containerStatusColor,
  containerStatusLabel,
  formatCurrency,
  formatDate,
  removeContainer,
  removeEvent
} = useInternationalOperations()

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
</script>

<template>
  <UPage class="space-y-6">
    <AppPageHeader v-if="operation" :title="operation.number" :description="operation.name ?? 'Operación Internacional'">
      <template #links>
        <UButton label="Volver" variant="ghost" icon="i-lucide-arrow-left" to="/operaciones-internacionales" />
        <UButton label="Editar" variant="outline" icon="i-lucide-pencil" :to="`/operaciones-internacionales/${id}/edit`" />
      </template>
    </AppPageHeader>

    <div v-if="loading && !operation" class="space-y-4">
      <USkeleton class="h-8 w-48" />
      <USkeleton class="h-32 w-full" />
    </div>

    <template v-if="operation">
      <div class="flex flex-wrap gap-2 items-center">
        <UBadge :label="statusLabel(operation.status)" :color="statusColor(operation.status)" size="lg" />
        <UBadge v-if="operation.incoterm" :label="operation.incoterm" color="neutral" variant="outline" />
        <UBadge :label="operation.transport_type" color="neutral" variant="outline" />
        <span v-if="operation.primary_supplier" class="text-muted text-sm">
          {{ operation.primary_supplier.name }}
        </span>
      </div>

      <div v-if="nextStatuses.length" class="flex gap-2">
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

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Contenedores</p>
            <p class="text-2xl font-semibold">{{ summary?.stats.containerCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Órdenes de Compra</p>
            <p class="text-2xl font-semibold">{{ summary?.stats.purchaseOrderCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Facturas</p>
            <p class="text-2xl font-semibold">{{ summary?.stats.documentCount ?? 0 }}</p>
          </div>
        </UPageCard>
        <UPageCard variant="subtle">
          <div class="space-y-1">
            <p class="text-xs text-muted">Pagos</p>
            <p class="text-2xl font-semibold">{{ summary?.stats.paymentCount ?? 0 }}</p>
          </div>
        </UPageCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UPageCard class="lg:col-span-2" title="Situación Financiera">
          <div v-if="summary" class="space-y-3">
            <div class="flex justify-between">
              <span class="text-muted">Total</span>
              <span class="font-semibold">{{ formatCurrency(summary.financial.total.amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Pagado</span>
              <span class="font-semibold text-success-500">{{ formatCurrency(summary.financial.paid.amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Pendiente</span>
              <span class="font-semibold" :class="summary.financial.pending.amount > 0 ? 'text-warning-500' : 'text-success-500'">
                {{ formatCurrency(summary.financial.pending.amount) }}
              </span>
            </div>
          </div>
        </UPageCard>

        <UPageCard title="Información">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Origen</span>
              <span>{{ operation.origin_country ?? '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Destino</span>
              <span>{{ operation.destination_country ?? '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">ETA</span>
              <span>{{ formatDate(operation.estimated_arrival_date) }}</span>
            </div>
            <div v-if="operation.actual_arrival_date" class="flex justify-between">
              <span class="text-muted">Llegada real</span>
              <span>{{ formatDate(operation.actual_arrival_date) }}</span>
            </div>
          </div>
        </UPageCard>
      </div>

      <div v-if="summary?.alerts.etaOverdue" class="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg p-4">
        <p class="text-error-600 dark:text-error-400 font-medium">ETA vencida - La fecha estimada de arribo ya pasó.</p>
      </div>
      <div v-else-if="summary?.alerts.etaApproaching" class="bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
        <p class="text-warning-600 dark:text-warning-400 font-medium">ETA próxima - El arribo estimado es en menos de 3 días.</p>
      </div>

      <UPageCard title="Contenedores">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-medium">Contenedores</span>
            <NuxtLink :to="`/operaciones-internacionales/${id}/containers/create`">
              <UButton label="Nuevo contenedor" icon="i-lucide-plus" size="xs" variant="outline" />
            </NuxtLink>
          </div>
        </template>
        <div v-if="operation.containers?.length" class="space-y-3">
          <div v-for="container in operation.containers" :key="container.id" class="border rounded-lg p-4 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <NuxtLink :to="`/operaciones-internacionales/containers/${container.id}`" class="font-medium hover:underline">
                  {{ container.container_number }}
                </NuxtLink>
                <UBadge :label="containerStatusLabel(container.status)" :color="containerStatusColor(container.status)" size="xs" variant="subtle" />
              </div>
              <UDropdownMenu
                :items="[
                  [{ label: 'Ver', icon: 'i-lucide-eye', to: `/operaciones-internacionales/containers/${container.id}` }],
                  [{ label: 'Eliminar', icon: 'i-lucide-trash', color: 'error', onClick: () => handleRemoveContainer(container.id) }]
                ]"
              >
                <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis-vertical" size="xs" />
              </UDropdownMenu>
            </div>
            <div class="flex gap-4 text-xs text-muted">
              <span v-if="container.vessel_name">{{ container.vessel_name }}</span>
              <span v-if="container.container_type">{{ container.container_type }}</span>
              <span v-if="container.origin_port">{{ container.origin_port }} → {{ container.destination_port }}</span>
              <span v-if="container.estimated_arrival_date">ETA: {{ formatDate(container.estimated_arrival_date) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm">No hay contenedores asociados.</p>
      </UPageCard>

      <UPageCard title="Documentos Asociados">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <span class="font-medium">Documentos</span>
          </div>
        </template>
        <div v-if="operation.operation_documents?.length" class="space-y-2">
          <div v-for="rel in operation.operation_documents" :key="rel.document_id" class="flex items-center justify-between py-2 border-b last:border-0">
            <div class="flex items-center gap-3">
              <span class="font-medium">{{ rel.document?.document_types?.code }} Nº {{ rel.document?.number }}</span>
              <span class="text-muted text-sm">{{ rel.document?.document_types?.description }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm">{{ formatCurrency(Number(rel.document?.total ?? 0), rel.document?.currency_code) }}</span>
              <span class="text-muted text-sm">{{ formatDate(rel.document?.date) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm">No hay documentos asociados.</p>
      </UPageCard>

      <UPageCard title="Pagos Asociados">
        <div v-if="operation.operation_payments?.length" class="space-y-2">
          <div v-for="rel in operation.operation_payments" :key="rel.payment_id" class="flex items-center justify-between py-2 border-b last:border-0">
            <div class="flex items-center gap-3">
              <span class="font-medium">Pago Nº {{ rel.payment?.number }}</span>
              <UBadge :label="rel.payment?.status" :color="rel.payment?.status === 'PAID' ? 'success' : 'warning'" size="xs" variant="subtle" />
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm">{{ formatCurrency(Number(rel.payment?.amount ?? 0), rel.payment?.currency_code) }}</span>
              <span class="text-muted text-sm">{{ formatDate(rel.payment?.date) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-muted text-sm">No hay pagos asociados.</p>
      </UPageCard>

      <UPageCard v-if="operation.notes" title="Notas">
        <p class="text-sm whitespace-pre-wrap">{{ operation.notes }}</p>
      </UPageCard>
    </template>
  </UPage>
</template>
