<script setup lang="ts">
const props = defineProps<{
  documents: any[]
  payments: any[]
}>()

const search = ref('')

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; borderColor: string }> = {
  QUOTE: { label: 'Presupuesto', icon: 'i-lucide-file-text', color: 'info', borderColor: 'border-info' },
  ORDER: { label: 'Orden de Venta', icon: 'i-lucide-shopping-cart', color: 'primary', borderColor: 'border-primary' },
  REMITO: { label: 'Remito', icon: 'i-lucide-truck', color: 'warning', borderColor: 'border-warning' },
  INVOICE: { label: 'Factura', icon: 'i-lucide-file-check', color: 'success', borderColor: 'border-success' },
  CREDIT_NOTE: { label: 'Nota de Crédito', icon: 'i-lucide-file-minus', color: 'error', borderColor: 'border-error' },
  DEBIT_NOTE: { label: 'Nota de Débito', icon: 'i-lucide-file-plus', color: 'warning', borderColor: 'border-warning' },
}

const QUOTE_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'Enviado', 2: 'Aprobado', 3: 'Rechazado', 4: 'Vencido', 5: 'Convertido', 6: 'Cancelado' }
const ORDER_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'Aprobada', 2: 'En Preparación', 3: 'Lista Despacho', 4: 'Parcial Entregada', 5: 'Entregada', 6: 'Facturada', 7: 'Cerrada', 8: 'Cancelada' }
const REMITO_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'En Tránsito', 2: 'Entregado', 3: 'Cancelado' }
const INVOICE_STATUSES: Record<number, string> = { 0: 'Borrador', 1: 'Pendiente', 2: 'Confirmada', 3: 'Anulada' }

const STATUS_COLORS: Record<string, Record<number, string>> = {
  QUOTE: { 0: 'neutral', 1: 'info', 2: 'success', 3: 'error', 4: 'warning', 5: 'secondary', 6: 'error' },
  ORDER: { 0: 'neutral', 1: 'info', 2: 'warning', 3: 'primary', 4: 'warning', 5: 'success', 6: 'success', 7: 'secondary', 8: 'error' },
  REMITO: { 0: 'neutral', 1: 'info', 2: 'success', 3: 'error' },
  INVOICE: { 0: 'neutral', 1: 'warning', 2: 'success', 3: 'error' },
  CREDIT_NOTE: { 0: 'neutral', 1: 'warning', 2: 'success', 3: 'error' },
  DEBIT_NOTE: { 0: 'neutral', 1: 'warning', 2: 'success', 3: 'error' },
}

function getStatusLabel(category: string, status: number): string {
  if (category === 'QUOTE') return QUOTE_STATUSES[status] ?? 'Desconocido'
  if (category === 'ORDER') return ORDER_STATUSES[status] ?? 'Desconocido'
  if (category === 'REMITO') return REMITO_STATUSES[status] ?? 'Desconocido'
  return INVOICE_STATUSES[status] ?? 'Desconocido'
}

function getStatusColor(category: string, status: number): string {
  return STATUS_COLORS[category]?.[status] ?? 'neutral'
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtMoney(amount?: number, currency?: string) {
  if (!amount) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(amount)
}

function resolveDocLink(doc: any): string {
  return `/erp/sales/${doc.id}`
}

interface TimelineNode {
  id: string
  type: string
  label: string
  number: number
  date: string
  status: number
  statusLabel: string
  statusColor: string
  amount?: number
  currency?: string
  link: string
  icon: string
  color: string
  borderColor: string
  isPayment?: boolean
  paymentMethod?: string
  searchText: string
}

const allNodes = computed<TimelineNode[]>(() => {
  const nodes: TimelineNode[] = []

  for (const doc of props.documents || []) {
    const cat = doc.document_types?.category ?? 'INVOICE'
    const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.INVOICE
    const num = String(doc.number).padStart(8, '0')
    nodes.push({
      id: doc.id,
      type: cat,
      label: config.label,
      number: doc.number,
      date: doc.created_at || doc.date,
      status: doc.status,
      statusLabel: getStatusLabel(cat, doc.status),
      statusColor: getStatusColor(cat, doc.status),
      amount: doc.total,
      currency: doc.currency_code,
      link: resolveDocLink(doc),
      icon: config.icon,
      color: config.color,
      borderColor: config.borderColor,
      searchText: `${config.label} #${num} ${getStatusLabel(cat, doc.status)}`.toLowerCase(),
    })
  }

  for (const payment of props.payments || []) {
    const num = String(payment.number).padStart(8, '0')
    const label = payment.type === 'COLLECTION' ? 'Cobro' : 'Pago'
    nodes.push({
      id: payment.id,
      type: 'PAYMENT',
      label,
      number: payment.number,
      date: payment.date,
      status: 0,
      statusLabel: payment.status,
      statusColor: payment.status === 'CONFIRMED' ? 'success' : payment.status === 'CANCELLED' ? 'error' : 'neutral',
      amount: payment.amount,
      currency: payment.currency_code,
      link: '#',
      icon: 'i-lucide-hand-coins',
      color: 'secondary',
      borderColor: 'border-secondary',
      isPayment: true,
      paymentMethod: payment.payment_method,
      searchText: `${label} #${num} ${payment.status} ${payment.payment_method ?? ''}`.toLowerCase(),
    })
  }

  return nodes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const timeline = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allNodes.value
  return allNodes.value.filter(n => n.searchText.includes(q))
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search -->
    <div class="px-3 pb-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar OV, factura, pago..."
        size="xs"
        class="w-full"
      />
    </div>

    <!-- Timeline scrollable -->
    <div class="flex-1 overflow-y-auto min-h-0 px-3 pb-3 space-y-0">
      <div v-if="timeline.length === 0" class="py-8 text-center text-xs text-muted">
        <UIcon name="i-lucide-search-x" class="mx-auto mb-2 text-xl opacity-30" />
        <p v-if="search">Sin resultados para "{{ search }}"</p>
        <p v-else>Sin movimientos</p>
      </div>

      <div v-for="(node, idx) in timeline" :key="node.id + node.type" class="relative flex gap-3">
        <!-- Línea vertical -->
        <div class="flex flex-col items-center">
          <div
            class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 border-2"
            :class="[
              `border-${node.color}`,
              idx === 0 ? `bg-${node.color}` : 'bg-default'
            ]"
          />
          <div v-if="idx < timeline.length - 1" class="w-px flex-1 bg-border" />
        </div>

        <!-- Contenido del nodo -->
        <div class="pb-4 flex-1 min-w-0">
          <NuxtLink :to="node.link" class="block group">
            <div class="flex items-start justify-between gap-1">
              <div class="flex items-center gap-1.5 min-w-0">
                <UIcon :name="node.icon" class="shrink-0 text-xs" :class="`text-${node.color}`" />
                <span class="text-xs font-medium truncate group-hover:underline">
                  {{ node.label }} #{{ String(node.number).padStart(8, '0') }}
                </span>
              </div>
              <span class="text-[10px] text-muted shrink-0">{{ fmtDate(node.date) }}</span>
            </div>

            <div class="flex items-center gap-1.5 mt-0.5">
              <UBadge
                :label="node.statusLabel"
                :color="node.statusColor as any"
                variant="subtle"
                size="xs"
              />
              <span v-if="node.isPayment && node.paymentMethod" class="text-[10px] text-muted">
                {{ node.paymentMethod }}
              </span>
            </div>

            <div v-if="node.amount" class="text-xs font-semibold mt-0.5" :class="`text-${node.color}`">
              {{ fmtMoney(node.amount, node.currency) }}
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
