<script setup lang="ts">
import { HrService } from '~/modulos/erp/hr/services/hr.service'
import type {
  CommissionAssignment,
  CommissionableDocument,
  CommissionSeller
} from '~/modulos/erp/hr/services/hr.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'

definePageMeta({ middleware: ['auth'] })
const toast = useToast()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const canManage = computed(() => isOwnerOrAdmin.value || hasPermission('commissions.manage'))
const canSettle = computed(() => isOwnerOrAdmin.value || hasPermission('commissions.settle'))
const month = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
const tab = ref<'documents' | 'settlements'>('documents')
const documents = ref<CommissionableDocument[]>([])
const sellers = ref<CommissionSeller[]>([])
const report = ref<any>(null)
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const modalOpen = ref(false)
const selected = ref<CommissionableDocument | null>(null)
const rows = ref<CommissionAssignment[]>([])

const ALL_SELLERS = '__all__'
const filterSeller = ref<string>(ALL_SELLERS)
const sellerIdentity = (seller: { seller_type: 'EMPLOYEE' | 'PARTNER'; seller_id: string }) =>
  `${seller.seller_type}:${seller.seller_id}`

const commissionSellerOptions = computed(() => sellers.value.map((item) => ({
    label: `${item.name} · ${item.seller_type === 'PARTNER' ? 'Socio' : 'Empleado'}`,
    value: `${item.seller_type}:${item.id}`
  })))
const sellerOptions = computed(() => [
  { label: 'Todos los vendedores', value: ALL_SELLERS, icon: 'i-lucide-users' },
  ...commissionSellerOptions.value,
])
const pending = computed(() => documents.value.filter((item) => !item.assignments.length).length)

const filteredDocuments = computed(() => {
  if (!filterSeller.value || filterSeller.value === ALL_SELLERS) return documents.value
  return documents.value.filter((item) =>
    item.assignments.some((assignment) => sellerIdentity(assignment) === filterSeller.value)
  )
})

/** Resumen de comisiones por vendedor en el período (todas las OVs, sin filtro). */
const sellerSummary = computed(() => {
  const map = new Map<string, { seller_id: string; seller_type: 'EMPLOYEE' | 'PARTNER'; name: string; accrued: number; settled: number; pending: number }>()
  for (const document of documents.value) {
    for (const assignment of document.assignments) {
      const key = sellerIdentity(assignment)
      const entry = map.get(key) ?? {
        seller_id: assignment.seller_id,
        seller_type: assignment.seller_type,
        name: `${assignment.seller_name || 'Vendedor'} · ${assignment.seller_type === 'PARTNER' ? 'Socio' : 'Empleado'}`,
        accrued: 0,
        settled: 0,
        pending: 0
      }
      entry.accrued += Number(assignment.accrued_amount ?? 0)
      entry.settled += Number(assignment.settled_amount ?? 0)
      entry.pending += Number(assignment.pending_amount ?? 0)
      map.set(key, entry)
    }
  }
  return [...map.values()]
    .map((entry) => ({
      ...entry,
      accrued: Math.round(entry.accrued * 100) / 100,
      settled: Math.round(entry.settled * 100) / 100,
      pending: Math.round(entry.pending * 100) / 100
    }))
    .sort((a, b) => b.accrued - a.accrued)
})

/** Total general de comisiones del período. */
const summaryTotal = computed(() =>
  sellerSummary.value.reduce(
    (acc, entry) => ({ accrued: acc.accrued + entry.accrued, settled: acc.settled + entry.settled, pending: acc.pending + entry.pending }),
    { accrued: 0, settled: 0, pending: 0 }
  )
)

function toggleSellerFilter(sellerId: string) {
  filterSeller.value = filterSeller.value === sellerId ? ALL_SELLERS : sellerId
}

/** % de la comisión devengada que ya está liquidada en vales. */
const settledPercentage = (document: CommissionableDocument) => {
  if (document.commission_accrued <= 0) return 0
  return Math.min(100, (document.commission_settled / document.commission_accrued) * 100)
}

const money = (value: number, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(Number(value || 0))
const date = (value: string) => (value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-AR') : '-')

async function load() {
  loading.value = true
  try {
    const [docs, availableSellers, commissions] = await Promise.all([
      HrService.getCommissionableDocuments(month.value),
      sellers.value.length ? sellers.value : HrService.getCommissionSellers(),
      HrService.getCommissionsReport(month.value)
    ])
    documents.value = docs
    sellers.value = availableSellers
    report.value = commissions
  } catch (error: any) {
    toast.add({
      title: 'No se pudieron cargar las comisiones',
      description: error?.data?.message || error?.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function defaults(seller?: CommissionSeller): CommissionAssignment {
  return {
    seller_id: seller?.id ?? '',
    seller_type: seller?.seller_type ?? 'EMPLOYEE',
    participation_rate: 100,
    commission_rate: Number(seller?.default_commission_rate ?? 0),
    commission_base: seller?.commission_base ?? 'INVOICED'
  }
}

function openAssignments(document: CommissionableDocument) {
  if (document.assignment_locked) {
    toast.add({
      title: 'La asignación está bloqueada',
      description: 'Esta OV ya tiene una liquidación. Podés liquidar nuevos importes si se registran más cobros, pero no cambiar sus vendedores.',
      color: 'warning'
    })
    return
  }
  selected.value = document
  rows.value = document.assignments.length
    ? document.assignments.map((item) => ({ ...item }))
    : [defaults(sellers.value[0])]
  modalOpen.value = true
}

function addSeller() {
  const used = new Set(rows.value.map((item) => sellerIdentity(item)))
  const seller = sellers.value.find((item) => !used.has(`${item.seller_type}:${item.id}`))
  if (!seller) {
    toast.add({ title: 'No quedan vendedores disponibles', color: 'warning' })
    return
  }
  rows.value.push(defaults(seller))
}

function applySellerDefaults(row: CommissionAssignment) {
  const seller = sellers.value.find((item) => item.id === row.seller_id && item.seller_type === row.seller_type)
  if (!seller) return
  row.commission_rate = Number(seller.default_commission_rate ?? 0)
  row.commission_base = seller.commission_base ?? 'INVOICED'
}

function setAssignmentSeller(row: CommissionAssignment, key: string) {
  const [sellerType, sellerId] = key.split(':', 2)
  row.seller_type = sellerType === 'PARTNER' ? 'PARTNER' : 'EMPLOYEE'
  row.seller_id = sellerId ?? ''
  applySellerDefaults(row)
}

async function save() {
  if (!selected.value) return
  if (rows.value.some((item) => !item.seller_id)) {
    toast.add({ title: 'Seleccioná todos los vendedores', color: 'warning' })
    return
  }
  if (new Set(rows.value.map(sellerIdentity)).size !== rows.value.length) {
    toast.add({ title: 'Un vendedor no puede repetirse', color: 'warning' })
    return
  }
  if (rows.value.some((item) =>
    !Number.isFinite(Number(item.participation_rate))
    || !Number.isFinite(Number(item.commission_rate))
    || Number(item.participation_rate) < 0.01
    || Number(item.participation_rate) > 100
    || Number(item.commission_rate) < 0
    || Number(item.commission_rate) > 100
  )) {
    toast.add({ title: 'La participación debe ser mayor que 0% y hasta 100%; la comisión puede ser de 0% a 100%', color: 'warning' })
    return
  }
  saving.value = true
  try {
    await HrService.saveCommissionAssignments(selected.value.document_id, rows.value)
    toast.add({ title: 'Asignación guardada', color: 'success' })
    modalOpen.value = false
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo guardar', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function generate(seller: any) {
  generating.value = true
  try {
    const vale = await HrService.generateCommissionVale(seller.seller_id, month.value, seller.seller_type, seller.currency_code)
    toast.add({
      title: `Vale COMISION #${vale.number} generado`,
      description: `${seller.seller_name} · ${money(vale.amount, seller.currency_code)}`,
      color: 'success'
    })
    await load()
  } catch (error: any) {
    toast.add({ title: 'No se pudo generar el vale', description: error?.data?.message, color: 'error' })
  } finally {
    generating.value = false
  }
}

watch(month, load)
onMounted(load)
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      title="Comisiones de ventas"
      description="Asigná vendedores y liquidá sus comisiones y la participación societaria según la configuración de ventas."
    />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Período" class="w-48"><UInput v-model="month" type="month" class="w-full" /></UFormField>
        <div class="flex rounded-lg bg-elevated p-1">
          <UButton
            label="Documentos"
            icon="i-lucide-files"
            :variant="tab === 'documents' ? 'solid' : 'ghost'"
            @click="() => { tab = 'documents' }"
          />
          <UButton
            label="Devengadas y liquidación"
            icon="i-lucide-hand-coins"
            :variant="tab === 'settlements' ? 'solid' : 'ghost'"
            @click="() => { tab = 'settlements' }"
          />
        </div>
      </div>
      <UBadge v-if="pending" color="warning" variant="subtle">{{ pending }} documento(s) sin vendedores</UBadge>
    </div>

    <template v-if="tab === 'documents'">
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        title="La OV ya no define comisiones"
        description="Elegí empleados o socios y definí para cada uno qué porcentaje de la venta comisiona y su tasa. Cada participación es independiente; varios vendedores pueden comisionar sobre el 100% de la misma OV."
      />

      <!-- Resumen de comisiones por vendedor -->
      <div v-if="sellerSummary.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="entry in sellerSummary"
          :key="`${entry.seller_type}:${entry.seller_id}`"
          type="button"
          class="rounded-lg border bg-elevated/30 p-4 text-left transition-colors"
          :class="
            filterSeller === `${entry.seller_type}:${entry.seller_id}`
              ? 'border-primary/60 bg-primary/10'
              : 'border-default hover:border-default/80 hover:bg-elevated/50'
          "
          @click="() => toggleSellerFilter(`${entry.seller_type}:${entry.seller_id}`)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-medium">{{ entry.name }}</span>
            <UIcon
              :name="filterSeller === `${entry.seller_type}:${entry.seller_id}` ? 'i-lucide-filter-x' : 'i-lucide-user'"
              class="size-4 shrink-0 text-muted"
            />
          </div>
          <p class="mt-2 text-xl font-semibold tabular-nums">{{ money(entry.accrued) }}</p>
          <div class="mt-2 flex items-center gap-2">
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full bg-success"
                :style="{ width: `${entry.accrued > 0 ? Math.min(100, (entry.settled / entry.accrued) * 100) : 0}%` }"
              />
            </div>
            <span class="text-[11px] tabular-nums" :class="entry.pending > 0 ? 'text-warning' : 'text-success'">
              {{ entry.pending > 0 ? `${money(entry.pending)} pend.` : 'Liquidada' }}
            </span>
          </div>
        </button>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex flex-wrap items-center gap-3 border-b border-default px-4 py-3">
          <USelectMenu
            v-model="filterSeller"
            :items="sellerOptions"
            value-key="value"
            searchable
            clearable
            placeholder="Filtrar por vendedor..."
            class="w-64"
          />
          <span v-if="filterSeller !== ALL_SELLERS" class="text-xs text-muted">
            Mostrando {{ filteredDocuments.length }} de {{ documents.length }} documento(s)
          </span>
          <span v-else class="text-xs text-muted">{{ documents.length }} documento(s)</span>
          <UButton
            v-if="filterSeller !== ALL_SELLERS"
            label="Ver todos"
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="soft"
            class="ml-auto"
            @click="() => { filterSeller = ALL_SELLERS }"
          />
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1040px] text-sm">
            <thead class="border-b border-default bg-elevated/50">
              <tr class="text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                <th class="px-4 py-3">Documento</th>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Cliente</th>
                <th class="px-4 py-3 text-right">Total OV</th>
                <th class="px-4 py-3">Comisión</th>
                <th class="px-4 py-3">Vendedores</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="document in filteredDocuments"
                :key="document.document_id"
                class="border-b border-default/60 transition-colors hover:bg-elevated/30"
              >
                <td class="px-4 py-3">
                  <div class="flex flex-col items-start gap-1">
                    <span class="font-medium">{{ document.document_type }} #{{ document.number }}</span>
                    <UBadge v-if="document.is_carryover" color="warning" variant="subtle" size="xs">
                      Arrastre de período anterior
                    </UBadge>
                  </div>
                </td>
                <td class="px-4 py-3 text-muted">{{ date(document.date) }}</td>
                <td class="px-4 py-3">{{ document.customer }}</td>
                <td class="px-4 py-3 text-right">
                  <p class="tabular-nums">{{ money(document.total, document.currency_code) }}</p>
                  <p class="text-[11px] tabular-nums text-muted">
                    sin IVA {{ money(document.subtotal, document.currency_code) }}
                  </p>
                </td>
                <td class="px-4 py-3">
                  <div v-if="document.assignments.length" class="w-52 space-y-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold tabular-nums">
                        {{ money(document.commission_accrued, document.currency_code) }}
                      </span>
                      <UBadge
                        v-if="document.commission_accrued <= 0.005"
                        color="warning"
                        variant="subtle"
                        size="sm"
                      >
                        {{ document.has_unpaid_collection_commission ? 'A la espera del cobro' : 'Sin devengar' }}
                      </UBadge>
                      <UBadge
                        v-else-if="document.commission_pending <= 0.005"
                        :color="document.has_unpaid_collection_commission ? 'info' : 'success'"
                        variant="subtle"
                        size="sm"
                      >
                        {{ document.has_unpaid_collection_commission ? 'Liquidada al día' : 'Liquidada' }}
                      </UBadge>
                      <UBadge
                        v-else-if="document.commission_settled > 0"
                        color="info"
                        variant="subtle"
                        size="sm"
                      >
                        Parcial
                      </UBadge>
                      <UBadge v-else color="warning" variant="subtle" size="sm">
                        Pendiente
                      </UBadge>
                    </div>
                    <p class="text-[11px] tabular-nums text-muted">
                      Base acumulada por vendedor sin IVA {{ money(document.commission_base_amount, document.currency_code) }}
                    </p>
                    <p v-if="document.has_unpaid_collection_commission" class="text-[11px] text-info">
                      Cobrado {{ document.paid_percentage.toFixed(1) }}%; la comisión puede aumentar con nuevos cobros.
                    </p>
                    <template v-if="document.commission_settled > 0 && document.commission_pending > 0">
                      <div class="h-1 overflow-hidden rounded-full bg-elevated">
                        <div class="h-full bg-info" :style="{ width: `${settledPercentage(document)}%` }" />
                      </div>
                      <p class="text-xs text-muted tabular-nums">
                        {{ money(document.commission_settled, document.currency_code) }} liquidada
                        · {{ money(document.commission_pending, document.currency_code) }} pendiente
                      </p>
                    </template>
                  </div>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="px-4 py-3">
                  <div v-if="document.assignments.length" class="space-y-1">
                    <div
                      v-for="assignment in document.assignments"
                      :key="`${assignment.seller_type}:${assignment.seller_id}`"
                      class="flex items-baseline gap-1.5"
                    >
                      <span class="text-sm font-medium">{{ assignment.seller_name }}</span>
                      <UBadge size="xs" color="neutral" variant="subtle">{{ assignment.seller_type === 'PARTNER' ? 'Socio' : 'Empleado' }}</UBadge>
                      <span class="text-xs text-muted tabular-nums">
                        {{ assignment.participation_rate }}% part. · {{ assignment.commission_rate }}% com.
                      </span>
                    </div>
                  </div>
                  <UBadge v-else color="warning" variant="subtle">Sin asignar</UBadge>
                </td>
                <td class="px-4 py-3 text-right">
                  <UBadge v-if="document.assignment_locked" color="neutral" variant="subtle" icon="i-lucide-lock">
                    Asignación bloqueada
                  </UBadge>
                  <UButton
                    v-else-if="canManage"
                    :label="document.assignments.length ? 'Editar' : 'Asignar'"
                    :icon="document.assignments.length ? 'i-lucide-pencil' : 'i-lucide-user-plus'"
                    size="sm"
                    variant="soft"
                    @click="openAssignments(document)"
                  />
                  <span v-else class="text-xs text-muted">Solo lectura</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="loading" class="p-10 text-center text-muted">Cargando documentos…</div>
        <div v-else-if="!filteredDocuments.length" class="p-10 text-center text-muted">
          {{ filterSeller && filterSeller !== ALL_SELLERS ? 'Este vendedor no tiene comisiones pendientes ni documentos del período.' : 'No hay órdenes de venta ni comisiones pendientes de períodos anteriores.' }}
        </div>
      </UCard>
    </template>

    <template v-else>
      <div v-if="report?.totals_by_currency?.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UPageCard v-for="total in report.totals_by_currency" :key="total.currency_code">
          <p class="text-sm text-muted">{{ total.currency_code }} · pendiente para liquidar</p>
          <p class="text-2xl font-bold text-primary">{{ money(total.total_pendiente, total.currency_code) }}</p>
          <p class="mt-2 text-sm text-muted">
            Comisiones {{ money(total.total_comisiones, total.currency_code) }}
            · Participación {{ money(total.total_participacion, total.currency_code) }}
          </p>
          <p class="mt-1 text-xs text-muted">{{ total.cantidad_ov }} OV · base neta {{ money(total.total_ventas, total.currency_code) }}</p>
        </UPageCard>
      </div>
      <UCard v-for="seller in report?.sellers ?? []" :key="`${seller.seller_type}:${seller.seller_id}:${seller.currency_code}`">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="font-semibold">{{ seller.seller_name }} · {{ seller.currency_code }}</p>
            <p class="text-sm text-muted">
              {{ seller.cantidad_ov }} OV · base neta acumulada {{ money(seller.total_ventas, seller.currency_code) }}
            </p>
            <p class="text-xs text-muted">
              Comisiones {{ money(seller.total_comisiones, seller.currency_code) }}
              · Participación societaria {{ money(seller.total_participacion, seller.currency_code) }}
            </p>
          </div>
          <div class="flex items-center gap-4">
            <strong class="text-xl text-primary">{{ money(seller.total_pendiente, seller.currency_code) }}</strong>
            <UButton
              v-if="canSettle"
              label="Generar vale"
              icon="i-lucide-receipt"
              variant="outline"
              :loading="generating"
              @click="generate(seller)"
            />
          </div>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[720px] text-sm">
            <thead class="border-b border-default text-left text-muted">
              <tr>
                <th>Concepto</th>
                <th class="py-2">OV</th>
                <th>Fecha</th>
                <th class="text-right">Base alcanzada</th>
                <th class="text-right">Regla</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in seller.items"
                :key="`${item.kind}-${item.document_id}-${seller.seller_type}:${seller.seller_id}`"
                class="border-b border-default/50"
              >
                <td>{{ item.kind === 'PARTNER_SHARE' ? 'Participación societaria' : 'Comisión de venta' }}</td>
                <td class="py-2">#{{ item.ov_number }}</td>
                <td>{{ date(item.date) }}</td>
                <td class="text-right">{{ money(item.subtotal, seller.currency_code) }}</td>
                <td class="text-right">
                  {{ item.kind === 'PARTNER_SHARE' ? item.share_percentage : item.commission_rate }}%
                  · {{ item.commission_base === 'PAID' ? 'Cobrado' : item.commission_base === 'ORDER' ? 'OV' : 'Facturado' }}
                </td>
                <td class="text-right font-semibold">{{ money(item.commission_amount, seller.currency_code) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
      <div v-if="!loading && !report?.sellers?.length" class="py-12 text-center text-muted">
        No hay comisiones ni participación societaria pendientes de liquidar.
      </div>
    </template>

    <UModal v-model:open="modalOpen" :ui="{ content: 'sm:max-w-5xl' }">
      <template #content>
        <div class="space-y-5 p-6">
          <div>
            <h2 class="text-lg font-semibold">Asignar vendedores</h2>
            <p class="text-sm text-muted">
              {{ selected?.document_type }} #{{ selected?.number }} · {{ selected?.customer }}
            </p>
          </div>
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="La participación es independiente para cada vendedor"
            description="Cada porcentaje se calcula sobre la venta. Podés dejar 100% en varios vendedores; no hace falta que los porcentajes sumen 100%."
          />
          <div class="space-y-3">
            <div
              v-for="(row, index) in rows"
              :key="index"
              class="grid items-end gap-3 rounded-lg border border-default p-3 md:grid-cols-[2fr_1fr_1fr_1.4fr_auto]"
            >
              <UFormField label="Vendedor">
                <USelectMenu
                  :model-value="sellerIdentity(row)"
                  :items="commissionSellerOptions"
                  value-key="value"
                  searchable
                  class="w-full"
                  @update:model-value="setAssignmentSeller(row, $event)"
                />
              </UFormField>
              <UFormField label="Participación %">
                <UInput v-model.number="row.participation_rate" type="number" min="0.01" max="100" step="0.01" />
              </UFormField>
              <UFormField label="Comisión %">
                <UInput v-model.number="row.commission_rate" type="number" min="0" max="100" step="0.01" />
              </UFormField>
              <UFormField label="Se devenga al">
                <USelectMenu
                  v-model="row.commission_base"
                  :items="[
                    { label: 'Facturar', value: 'INVOICED' },
                    { label: 'Cobrar', value: 'PAID' }
                  ]"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                :disabled="rows.length === 1"
                @click="() => { rows.splice(index, 1) }"
              />
            </div>
          </div>
          <div class="flex justify-start">
            <UButton label="Agregar vendedor" icon="i-lucide-plus" variant="soft" @click="addSeller" />
          </div>
          <div class="flex justify-end gap-2 border-t border-default pt-4">
            <UButton label="Cancelar" color="neutral" variant="ghost" @click="() => { modalOpen = false }" />
            <UButton
              label="Guardar asignación"
              icon="i-lucide-save"
              :loading="saving"
              @click="save"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UPage>
</template>
