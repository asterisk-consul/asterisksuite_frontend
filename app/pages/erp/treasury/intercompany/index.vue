<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { h } from 'vue'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useIntercompanyTreasuryService } from '~/modulos/erp/treasury/intercompany-treasury.service'
import type { IntercompanyMovement, IntercompanyOverview } from '~/modulos/erp/treasury/intercompany-treasury.service'
import { useCashBoxTransfersService } from '~/modulos/erp/cash-box-transfers/service/cash-box-transfers.service'

const auth = useAuthStore()
const { hasPermission } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const toast = useToast()
const router = useRouter()
const overview = ref<IntercompanyOverview>({ summaries: [], movements: [] })
const loading = ref(false)
const updatingId = ref<string | null>(null)
let overviewRequest = 0
const allCompaniesValue = 'ALL'
const selectedCompanyId = ref(allCompaniesValue)
const canClassify = computed(() => isOwnerOrAdmin.value || hasPermission('cash_box_transfers.confirm'))
const companyItems = computed(() => [
  { label: 'Todas las empresas', value: allCompaniesValue },
  ...[...new Map(overview.value.summaries.map(row => [row.company_id, { label: row.company_name, value: row.company_id }])).values()],
])
const summaries = computed(() => overview.value.summaries.filter(row => selectedCompanyId.value === allCompaniesValue || row.company_id === selectedCompanyId.value))
const movements = computed(() => overview.value.movements.filter(row => selectedCompanyId.value === allCompaniesValue || row.company_id === selectedCompanyId.value))

const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(amount)

const load = async () => {
  const request = ++overviewRequest
  const companyId = auth.selectedCompany?.id
  loading.value = true
  try {
    const result = await useIntercompanyTreasuryService().overview()
    if (request === overviewRequest && companyId === auth.selectedCompany?.id) overview.value = result
  } catch (error: any) {
    if (request === overviewRequest) toast.add({ title: 'No se pudo cargar la cuenta entre empresas', description: error?.data?.message, color: 'error' })
  } finally {
    if (request === overviewRequest) loading.value = false
  }
}

const classify = async (row: IntercompanyMovement, purpose: 'SETTLEMENT' | 'OTHER') => {
  if (updatingId.value || !row.can_classify || !canClassify.value) return
  updatingId.value = row.id
  try {
    await useCashBoxTransfersService().setIntercompanyPurpose(row.source_id, purpose)
    await load()
    toast.add({ title: purpose === 'SETTLEMENT' ? 'Transferencia marcada como rendición' : 'Transferencia marcada como otra operación', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo clasificar la transferencia', description: error?.data?.message, color: 'error' })
  } finally {
    updatingId.value = null
  }
}

const columns: ExtendedColumn<IntercompanyMovement>[] = [
  { accessorKey: 'date', header: 'Fecha', meta: { label: 'Fecha', filter: { type: 'date-range' } }, cell: ({ row }) => new Date(row.original.date).toLocaleDateString('es-AR') },
  { accessorKey: 'company_name', header: 'Empresa', meta: { label: 'Empresa', filter: { type: 'text' } } },
  { accessorKey: 'description', header: 'Detalle', meta: { label: 'Detalle', filter: { type: 'text' } }, cell: ({ row }) => h('div', { class: 'min-w-48' }, [
    h('span', { class: 'block text-sm' }, row.original.description),
    h('span', { class: 'block text-xs text-muted' }, row.original.kind === 'TRANSFERENCIA' ? 'Transferencia entre empresas' : row.original.fund_type === 'BANK_ACCOUNT' ? 'Banco compartido' : 'Caja compartida'),
  ]) },
  { accessorKey: 'amount', header: 'Importe', meta: { label: 'Importe', filter: { type: 'number' } }, cell: ({ row }) => formatMoney(row.original.amount, row.original.currency_code) },
  { accessorKey: 'balance_effect', header: 'Efecto en el saldo', meta: { label: 'Efecto en el saldo', filter: { type: 'number' } }, cell: ({ row }) => h('span', { class: row.original.balance_effect > 0 ? 'text-warning' : row.original.balance_effect < 0 ? 'text-success' : 'text-muted' }, formatMoney(row.original.balance_effect, row.original.currency_code)) },
  { accessorKey: 'status', header: 'Estado', meta: { label: 'Estado', filter: { type: 'select', options: [
    { label: 'Completado', value: 'COMPLETED' }, { label: 'Anulado', value: 'REVERSED' }, { label: 'Transferida', value: 'completed' }, { label: 'Transferencia anulada', value: 'reversed' },
  ] } }, cell: ({ row }) => row.original.status === 'COMPLETED' || row.original.status === 'completed' ? 'Completado' : 'Anulado' },
  { id: 'actions', header: 'Acciones', meta: { label: 'Acciones' }, cell: ({ row }) => {
    const item = row.original
    if (item.kind !== 'TRANSFERENCIA') return null
    const buttons = [h(resolveComponent('UButton'), { label: 'Ver transferencia', size: 'xs', variant: 'ghost', onClick: () => router.push(`/erp/treasury/cash-box-transfers?transferId=${item.source_id}`) })]
    if (item.can_classify && canClassify.value) buttons.push(h(resolveComponent('UButton'), {
      label: item.purpose === 'SETTLEMENT' ? 'Quitar rendición' : 'Marcar rendición', size: 'xs', variant: 'soft',
      loading: updatingId.value === item.id,
      onClick: () => classify(item, item.purpose === 'SETTLEMENT' ? 'OTHER' : 'SETTLEMENT'),
    }))
    return h('div', { class: 'flex gap-1' }, buttons)
  } },
]

onMounted(() => { void load() })
watch(() => auth.selectedCompany?.id, () => { selectedCompanyId.value = allCompaniesValue; overview.value = { summaries: [], movements: [] }; void load() })
</script>

<template>
  <UPage class="flex flex-col gap-5">
    <AppPageHeader title="Entre empresas" description="Fondos recibidos, rendiciones y saldo entre empresas">
      <template #links><UButton label="Actualizar" icon="i-lucide-refresh-cw" variant="outline" :loading="loading" @click="load" /></template>
    </AppPageHeader>

    <UAlert color="info" variant="subtle" icon="i-lucide-info" description="El cobro y la OV permanecen en la empresa que los registró. Esta vista muestra dónde ingresó el dinero y cuánto se rindió entre empresas. Solo las transferencias marcadas como rendición afectan el saldo." />

    <div class="max-w-sm"><UFormField label="Empresa"><USelect v-model="selectedCompanyId" :items="companyItems" class="w-full" /></UFormField></div>

    <div v-if="!loading && summaries.length === 0" class="rounded-xl border border-default p-8 text-center text-muted">Todavía no hay movimientos entre empresas para mostrar.</div>
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <UPageCard v-for="summary in summaries" :key="`${summary.company_id}:${summary.currency_code}`">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><h2 class="font-semibold text-highlighted">{{ summary.company_name }}</h2><p class="text-xs text-muted">{{ summary.currency_code }}</p></div>
          <UBadge :color="summary.balance > 0 ? 'warning' : summary.balance < 0 ? 'success' : 'neutral'" variant="soft">
            {{ summary.balance > 0 ? 'Por rendir' : summary.balance < 0 ? 'A favor' : 'Saldado' }}
          </UBadge>
        </div>
        <p class="mt-3 text-2xl font-bold" :class="summary.balance > 0 ? 'text-warning' : summary.balance < 0 ? 'text-success' : ''">{{ formatMoney(Math.abs(summary.balance), summary.currency_code) }}</p>
        <div class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>Recibido para {{ summary.company_name }}: <strong>{{ formatMoney(summary.collected_here_for_other, summary.currency_code) }}</strong></p>
          <p>Transferido a {{ summary.company_name }}: <strong>{{ formatMoney(summary.transferred_out, summary.currency_code) }}</strong></p>
          <p>Recibido allí para esta empresa: <strong>{{ formatMoney(summary.collected_there_for_us, summary.currency_code) }}</strong></p>
          <p>Transferido desde allí: <strong>{{ formatMoney(summary.transferred_in, summary.currency_code) }}</strong></p>
        </div>
        <p v-if="summary.paid_here_for_other || summary.paid_there_for_us" class="mt-2 text-xs text-muted">El saldo también incluye pagos, cheques y vales efectuados con fondos de la otra empresa.</p>
        <UButton v-if="summary.balance > 0 && auth.companies.some(company => company.id === summary.company_id)" class="mt-4" label="Transferir a esta empresa" icon="i-lucide-arrow-right-left" variant="soft" :to="`/erp/treasury/cash-box-transfers?dest_company_id=${summary.company_id}&purpose=SETTLEMENT`" />
      </UPageCard>
    </div>

    <section class="flex flex-col gap-3"><h2 class="text-lg font-semibold">Movimientos recientes</h2>
      <AsteriskTable :data="movements" :columns="columns" :loading="loading" storage-key="treasury-intercompany-movements" :get-row-id="(row: IntercompanyMovement) => row.id" :filter-fields="[{ id: 'description', label: 'Buscar detalle...', class: 'w-48' }]" />
    </section>
  </UPage>
</template>
