<script setup lang="ts">
import { h } from 'vue'
import { UBadge } from '#components'
import { NuxtLink } from '#components'
definePageMeta({ middleware: ['auth'] })

import CustomerHistoryTimeline from '~/components/CustomerHistoryTimeline.vue'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'
import CurrentAccountEntryTable from '~/components/current-account/CurrentAccountEntryTable.vue'
import { createTableBuilder } from '@/composables/table/createColumns'
import type { SortingState } from '@tanstack/vue-table'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = route.params.id as string

const party = ref<any>(null)
const documents = ref<any[]>([])
const payments = ref<any[]>([])
const statement = ref<any>(null)
const activeTab = ref('documents')
const loadingData = ref(true)

const sorting = ref<SortingState>([])

onMounted(async () => {
  loadingData.value = true
  try {
    const [partyData, docsData, paymentsData, statementData] = await Promise.all([
      $fetch<any>(`/api/logistica/master-data/business-parties/${id}`),
      $fetch<any[]>(`/api/erp/documents/sales?party_id=${id}`),
      $fetch<any[]>(`/api/erp/payments?party_id=${id}`),
      $fetch<any>(`/api/erp/current-accounts/party/${id}/statement`).catch(() => null)
    ])
    party.value = partyData
    documents.value = docsData || []
    payments.value = paymentsData || []
    statement.value = statementData
  } catch (e: any) {
    toast.add({ title: 'Error al cargar datos del cliente', color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    loadingData.value = false
  }
})

const summary = computed(() => {
  const docs = documents.value
  const pays = payments.value
  return {
    totalDocs: docs.length,
    totalOV: docs
      .filter((d: any) => d.document_types?.category === 'ORDER')
      .reduce((sum: number, d: any) => sum + (Number(d.converted_total ?? d.total) || 0), 0),
    totalRemitos: docs.filter((d: any) => d.document_types?.category === 'REMITO').length,
    totalFacturado: docs
      .filter((d: any) => d.document_types?.category === 'INVOICE' && d.status === 2)
      .reduce((sum: number, d: any) => sum + (Number(d.converted_total ?? d.total) || 0), 0),
    totalCobrado: pays
      .filter((p: any) => p.type === 'COLLECTION' && p.status === 'CONFIRMED')
      .reduce((sum: number, p: any) => sum + (Number(p.converted_amount ?? p.amount) || 0), 0),
    saldoCC: statement.value?.balance ?? 0
  }
})

function fmtMoney(amount?: number) {
  if (!amount) return '$0'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

const CATEGORY_LABELS: Record<string, string> = {
  QUOTE: 'Presupuesto',
  ORDER: 'Orden de Venta',
  REMITO: 'Remito',
  INVOICE: 'Factura',
  CREDIT_NOTE: 'N. Crédito',
  DEBIT_NOTE: 'N. Débito'
}

const ORDER_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'Aprobada',
  2: 'En Preparación',
  3: 'Lista Despacho',
  4: 'Parcial Entregada',
  5: 'Entregada',
  6: 'Facturada',
  7: 'Cerrada',
  8: 'Cancelada'
}
const REMITO_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'En Tránsito', 2: 'Entregado', 3: 'Cancelado' }
const INVOICE_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'Pendiente', 2: 'Confirmada', 3: 'Anulada' }
const QUOTE_STATUSES: Record<number, string> = {
  0: 'Borrador',
  1: 'Enviado',
  2: 'Aprobado',
  3: 'Rechazado',
  4: 'Vencido',
  5: 'Convertido',
  6: 'Cancelado'
}

function getStatusLabel(cat: string, status: number): string {
  if (cat === 'QUOTE') return QUOTE_STATUSES[status] ?? '—'
  if (cat === 'ORDER') return ORDER_STATUSES[status] ?? '—'
  if (cat === 'REMITO') return REMITO_STATUSES[status] ?? '—'
  return INVOICE_STATUSES[status] ?? '—'
}

function getStatusColor(cat: string, status: number): any {
  const map: Record<string, Record<number, string>> = {
    QUOTE: { 0: 'neutral', 1: 'info', 2: 'success', 3: 'error', 4: 'warning', 5: 'secondary', 6: 'error' },
    ORDER: {
      0: 'neutral',
      1: 'info',
      2: 'warning',
      3: 'primary',
      4: 'warning',
      5: 'success',
      6: 'success',
      7: 'secondary',
      8: 'error'
    },
    REMITO: { 0: 'neutral', 1: 'info', 2: 'success', 3: 'error' },
    INVOICE: { 0: 'neutral', 1: 'warning', 2: 'success', 3: 'error' }
  }
  return map[cat]?.[status] ?? 'neutral'
}

const buildDocs = createTableBuilder<any>({ locale: 'es-AR' })

const docColumns = buildDocs([
  {
    key: 'number',
    label: 'Número',
    cell: ({ row }) =>
      h(
        NuxtLink,
        {
          to: `/erp/sales/${row.original.id}`,
          class: 'text-primary hover:underline font-mono text-xs'
        },
        () => `#${String(row.original.number).padStart(8, '0')}`
      )
  },
  {
    id: 'category',
    label: 'Tipo',
    accessorFn: (row: any) => CATEGORY_LABELS[row.document_types?.category] || row.document_types?.category,
    cell: ({ row }) =>
      h(UBadge, {
        label: CATEGORY_LABELS[row.original.document_types?.category] || row.original.document_types?.category,
        color: 'primary',
        variant: 'subtle',
        size: 'xs'
      })
  },
  {
    key: 'created_at',
    label: 'Fecha',
    date: true
  },
  {
    id: 'status',
    label: 'Estado',
    accessorFn: (row: any) => getStatusLabel(row.document_types?.category, row.status),
    cell: ({ row }) =>
      h(UBadge, {
        label: getStatusLabel(row.original.document_types?.category, row.original.status),
        color: getStatusColor(row.original.document_types?.category, row.original.status),
        variant: 'subtle',
        size: 'xs'
      })
  },
  {
    key: 'total',
    label: 'Total',
    cell: ({ row }) => fmtMoney(row.original.total)
  }
])

const paymentTableColumns = buildDocs([
  {
    key: 'number',
    label: 'N°',
    sortable: true
  },
  {
    key: 'date',
    label: 'Fecha',
    sortable: true,
    date: true
  },
  {
    key: 'type',
    label: 'Tipo',
    sortable: true,
    badge: {
      resolve: (row: any) => {
        const map: Record<string, { label: string; color: string }> = {
          PAYMENT: { label: 'Pago', color: 'error' },
          COLLECTION: { label: 'Cobro', color: 'success' }
        }
        if (row.payment_mode === 'ADVANCE') return { label: 'Anticipo', color: 'warning' }
        return map[row.type] ?? { label: row.type, color: 'neutral' }
      }
    }
  },
  {
    key: 'payment_method',
    label: 'Método',
    badge: {
      resolve: (row: any) => {
        const map: Record<string, { label: string; color: string }> = {
          CASH: { label: 'Efectivo', color: 'neutral' },
          CHECK: { label: 'Cheque', color: 'warning' },
          BANK_TRANSFER: { label: 'Transferencia', color: 'primary' }
        }
        return map[row.payment_method] ?? { label: row.payment_method, color: 'neutral' }
      }
    }
  },
  {
    key: 'amount',
    label: 'Monto',
    sortable: true,
    cell: ({ row }: any) => {
      const value = row.original.amount
      if (value == null) return '—'
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: row.original.currency_code || 'ARS',
        maximumFractionDigits: 2
      }).format(Number(value))
    }
  },
  {
    key: 'status',
    label: 'Estado',
    badge: {
      resolve: (row: any) => {
        const map: Record<string, { label: string; color: string }> = {
          DRAFT: { label: 'Borrador', color: 'neutral' },
          CONFIRMED: { label: 'Confirmado', color: 'info' },
          PAID: { label: 'Pagado', color: 'success' },
          REVERSED: { label: 'Rechazado', color: 'warning' },
          CANCELLED: { label: 'Anulado', color: 'error' }
        }
        return map[row.status] ?? { label: row.status, color: 'neutral' }
      }
    }
  }
])
</script>

<template>
  <UPage class="space-y-4">
    <div v-if="loadingData" class="space-y-4">
      <div class="h-8 w-64 bg-muted animate-pulse rounded" />
      <div class="h-4 w-96 bg-muted animate-pulse rounded" />
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    </div>

    <template v-else-if="party">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              color="neutral"
              @click="router.push('/erp/sales/customers')"
            />
            <div>
              <h1 class="text-xl font-bold">{{ party.name }}</h1>
              <p v-if="party.business_names" class="text-sm text-muted">{{ party.business_names }}</p>
            </div>
          </div>
        </div>
        <UButton
          label="Editar"
          icon="i-lucide-pencil"
          variant="outline"
          @click="router.push(`/erp/sales/customers/${id}/edit`)"
        />
      </div>

      <!-- Info del cliente -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div v-if="party.tax_id">
          <span class="text-muted">CUIT:</span>
          <p class="font-medium">{{ party.tax_id }}</p>
        </div>
        <div v-if="party.document_type">
          <span class="text-muted">Doc. Tipo:</span>
          <p class="font-medium">{{ party.document_type }}</p>
        </div>
        <div v-if="party.vat_condition">
          <span class="text-muted">IVA:</span>
          <p class="font-medium">{{ party.vat_condition }}</p>
        </div>
        <div v-if="party.email">
          <span class="text-muted">Email:</span>
          <p class="font-medium">{{ party.email }}</p>
        </div>
      </div>

      <!-- Resumen -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Documentos</p>
            <p class="text-2xl font-bold">{{ summary.totalDocs }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">OV (total)</p>
            <p class="text-2xl font-bold text-primary">{{ fmtMoney(summary.totalOV) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Remitos</p>
            <p class="text-2xl font-bold text-warning">{{ summary.totalRemitos }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Facturado</p>
            <p class="text-2xl font-bold text-success">{{ fmtMoney(summary.totalFacturado) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Cobrado</p>
            <p class="text-2xl font-bold text-info">{{ fmtMoney(summary.totalCobrado) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-xs text-muted">Saldo CC</p>
            <p class="text-2xl font-bold" :class="summary.saldoCC > 0 ? 'text-error' : 'text-success'">
              {{ fmtMoney(summary.saldoCC) }}
            </p>
          </div>
        </UCard>
      </div>

      <!-- Layout: contenido + timeline sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <!-- Contenido principal -->
        <div>
          <UTabs
            v-model="activeTab"
            :items="[
              { label: 'Documentos', value: 'documents', icon: 'i-lucide-file-text', slot: 'documents' },
              { label: 'Pagos', value: 'payments', icon: 'i-lucide-hand-coins', slot: 'payments' },
              { label: 'Cuenta Corriente', value: 'cc', icon: 'i-lucide-calculator', slot: 'cc' }
            ]"
          >
            <template #documents>
              <LogisticaTable
                :data="documents"
                :columns="docColumns"
                :loading="loadingData"
                v-model:sorting="sorting"
              />
            </template>

            <template #payments>
              <LogisticaTable
                :data="payments"
                :columns="paymentTableColumns"
                :loading="loadingData"
                v-model:sorting="sorting"
              />
            </template>

            <template #cc>
              <CurrentAccountEntryTable
                :entries="statement?.entries ?? []"
                :loading="loadingData"
                party-type="CUSTOMER"
              />
            </template>
          </UTabs>
        </div>

        <!-- Timeline sidebar -->
        <div class="hidden lg:block h-[calc(100vh-280px)]">
          <UCard class="h-full flex flex-col" :ui="{ body: 'flex-1 min-h-0 overflow-y-auto' }">
            <template #header>
              <h3 class="font-semibold text-sm">Historial</h3>
            </template>

            <CustomerHistoryTimeline :documents="documents" :payments="payments" />
          </UCard>
        </div>
      </div>
    </template>
  </UPage>
</template>
