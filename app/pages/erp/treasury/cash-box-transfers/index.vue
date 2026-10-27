<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCashBoxTransfers } from '~/modulos/erp/cash-box-transfers/composables/useCashBoxTransfers'
import { cashBoxTransferColumns } from '~/modulos/erp/cash-box-transfers/columns'
import type { CreateCashBoxTransferInput, CashBoxTransfer, TransferDestinationOptions, TransferType } from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'
import { useCashBoxTransfersService } from '~/modulos/erp/cash-box-transfers/service/cash-box-transfers.service'
import { useAuthStore } from '~/modulos/auth/auth.store'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const toast = useToast()
const route = useRoute()
const authStore = useAuthStore()
const { isOwner } = useCompanyRole()
const { hasPermission } = useRoles()
const transfersService = useCashBoxTransfersService()
const { transfers, loading, init, create, confirm, cancel, remove } = useCashBoxTransfers()
const { selectItems: cashBoxItems, findById: findCashBox, init: initCashBoxes } = useCashBoxes()
const { selectItems: bankAccountItems, findById: findBankAccount, init: initBankAccounts } = useBankAccounts()
const { codeSelectItems: currencyItems, baseCurrency, init: initCurrencies } = useCurrencies()
const { autoResolve, convertAmount, isBaseCurrency } = useExchangeRate()

const sorting = ref<SortingState>([])
const modalOpen = ref(false)
const detailModalOpen = ref(false)
const selectedTransfer = ref<CashBoxTransfer | null>(null)
const loadingRate = ref(false)
const loadingDestinations = ref(false)
const savingTransfer = ref(false)
const processingTransferAction = ref(false)
const canReadTransferAttachments = computed(() => isOwner.value || (
  hasPermission('cash_box_transfers.read')
  && hasPermission('media.read')
))
const canUploadTransferAttachments = computed(() => isOwner.value || (
  hasPermission('media.read')
  && hasPermission('media.upload')
  && hasPermission('cash_box_transfers.create')
))
const remoteDestinations = ref<TransferDestinationOptions | null>(null)
const destinationCompanyId = ref('')

const companyItems = computed(() => authStore.companies.map(company => ({
  label: company.id === authStore.selectedCompany?.id ? `${company.name} (actual)` : company.name,
  value: company.id
})))
const isIntercompany = computed(() => Boolean(destinationCompanyId.value && destinationCompanyId.value !== authStore.selectedCompany?.id))

const detailSourceName = computed(() => {
  if (!selectedTransfer.value) return '—'
  const t = selectedTransfer.value
  if (t.source_name) return t.source_name
  if (t.source_type === 'cash_box') {
    const box = findCashBox(t.source_id)
    return box?.name ?? 'Caja'
  }
  const account = findBankAccount(t.source_id)
  return account ? `${account.bank_name} - ${account.name}` : 'Banco'
})

const detailDestName = computed(() => {
  if (!selectedTransfer.value) return '—'
  const t = selectedTransfer.value
  if (t.dest_name) return t.dest_name
  if (t.dest_type === 'cash_box') {
    const box = findCashBox(t.dest_id)
    return box?.name ?? (t.dest_company_name ? `Caja de ${t.dest_company_name}` : 'Caja')
  }
  const account = findBankAccount(t.dest_id)
  return account ? `${account.bank_name} - ${account.name}` : (t.dest_company_name ? `Banco de ${t.dest_company_name}` : 'Banco')
})

const form = reactive<CreateCashBoxTransferInput>({
  source_type: 'cash_box',
  source_id: '',
  dest_type: 'bank_account',
  dest_id: '',
  amount: 0,
  currency_code: 'ARS',
  transfer_type: 'CASH_TO_BANK',
  exchange_rate: undefined,
  rate_type: 'OFFICIAL',
  converted_amount: undefined,
  description: ''
})

const transferTypeItems = [
  { label: 'Caja a Caja', value: 'CASH_TO_CASH' },
  { label: 'Caja a Banco', value: 'CASH_TO_BANK' },
  { label: 'Banco a Caja', value: 'BANK_TO_CASH' },
  { label: 'Banco a Banco', value: 'BANK_TO_BANK' }
]

const transferTypeMap: Record<string, string> = {
  CASH_TO_CASH: 'Caja a Caja',
  CASH_TO_BANK: 'Caja a Banco',
  BANK_TO_CASH: 'Banco a Caja',
  BANK_TO_BANK: 'Banco a Banco'
}

const statusMap: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'info' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  processing: { label: 'Procesando', color: 'info' },
  debit_applied: { label: 'Débito aplicado', color: 'warning' },
  failed: { label: 'Requiere reintento', color: 'error' },
  completed: { label: 'Completada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'error' }
}

const rateTypeItems = [
  { label: 'Oficial', value: 'OFFICIAL' },
  { label: 'Blue', value: 'BLUE' },
  { label: 'MEP', value: 'MEP' },
  { label: 'CCL', value: 'CCL' }
]

const isSourceCashBox = computed(() => form.transfer_type?.startsWith('CASH'))
const isDestCashBox = computed(() => form.transfer_type?.endsWith('CASH'))

const originLabel = computed(() => isSourceCashBox.value ? 'Caja de origen' : 'Banco de origen')
const destLabel = computed(() => isDestCashBox.value ? 'Caja de destino' : 'Banco de destino')

const originItems = computed(() => isSourceCashBox.value ? cashBoxItems.value : bankAccountItems.value)
const destItems = computed(() => {
  if (!isIntercompany.value) return isDestCashBox.value ? cashBoxItems.value : bankAccountItems.value
  const items = isDestCashBox.value ? remoteDestinations.value?.cash_boxes : remoteDestinations.value?.bank_accounts
  return (items ?? []).map((item: any) => ({ label: item.bank_name ? `${item.bank_name} - ${item.name}` : item.name, value: item.id }))
})

const remoteDestinationById = computed(() => {
  if (!isIntercompany.value || !form.dest_id) return null
  const items = isDestCashBox.value ? remoteDestinations.value?.cash_boxes : remoteDestinations.value?.bank_accounts
  return items?.find(item => item.id === form.dest_id) ?? null
})

const sourceCurrency = computed(() => {
  if (!form.source_id) return null
  if (isSourceCashBox.value) {
    const box = findCashBox(form.source_id)
    return box?.currency_code ?? null
  }
  const account = findBankAccount(form.source_id)
  return account?.currency_code ?? null
})

const destCurrency = computed(() => {
  if (!form.dest_id) return null
  if (isIntercompany.value) return remoteDestinationById.value?.currency_code ?? null
  if (isDestCashBox.value) {
    const box = findCashBox(form.dest_id)
    return box?.currency_code ?? null
  }
  const account = findBankAccount(form.dest_id)
  return account?.currency_code ?? null
})

const sourceBalance = computed(() => {
  if (!form.source_id) return null
  if (isSourceCashBox.value) {
    const box = findCashBox(form.source_id)
    if (!box?.balances) return null
    const balance = box.balances.find(b => b.currency_code === form.currency_code)
    return balance?.balance ?? 0
  }
  const account = findBankAccount(form.source_id)
  return account?.balance ?? 0
})

const showExchangeRate = computed(() => {
  if (!sourceCurrency.value || !destCurrency.value) return false
  return sourceCurrency.value.toUpperCase() !== destCurrency.value.toUpperCase()
})

const computedConvertedAmount = computed(() => {
  if (!form.exchange_rate || !form.amount) return null
  return Number((form.amount * form.exchange_rate).toFixed(2))
})

const showConvertedAmount = computed(() => {
  return showExchangeRate.value && !!form.exchange_rate && form.amount > 0
})

function formatMoney(amount: number, currencyCode?: string | null) {
  const formatted = amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currencyCode ? `${currencyCode} ${formatted}` : `$ ${formatted}`
}

function onTransferTypeChange(type: TransferType) {
  form.source_type = type.startsWith('CASH') ? 'cash_box' : 'bank_account'
  form.dest_type = type.endsWith('CASH') ? 'cash_box' : 'bank_account'
  form.source_id = ''
  form.dest_id = ''
}

async function onDestinationCompanyChange(companyId: string) {
  form.dest_id = ''
  remoteDestinations.value = null
  if (!companyId || companyId === authStore.selectedCompany?.id) {
    form.dest_company_id = undefined
    return
  }
  loadingDestinations.value = true
  try {
    remoteDestinations.value = await transfersService.destinationOptions(companyId)
    form.dest_company_id = companyId
  } catch (e: any) {
    destinationCompanyId.value = authStore.selectedCompany?.id ?? ''
    form.dest_company_id = undefined
    toast.add({ title: e?.data?.message ?? 'No se pudieron cargar los fondos de la empresa destino', color: 'error' })
  } finally {
    loadingDestinations.value = false
  }
}

function onSourceChange(id: string) {
  form.dest_id = ''
  if (!id) return
  const currency = sourceCurrency.value
  if (currency) {
    form.currency_code = currency
    checkExchangeRate()
  }
}

function onCurrencyChange() {
  form.exchange_rate = undefined
  form.converted_amount = undefined
  checkExchangeRate()
}

async function checkExchangeRate() {
  if (!showExchangeRate.value || !sourceCurrency.value || !destCurrency.value) {
    form.exchange_rate = undefined
    form.converted_amount = undefined
    return
  }
  loadingRate.value = true
  try {
    const rate = await autoResolve(sourceCurrency.value, destCurrency.value)
    if (rate) form.exchange_rate = rate
  } finally {
    loadingRate.value = false
  }
}

function onRateTypeChange() {
  checkExchangeRate()
}

watch(() => form.amount, (val) => {
  if (showConvertedAmount.value && form.exchange_rate) {
    form.converted_amount = computedConvertedAmount.value ?? undefined
  }
})

watch(() => form.exchange_rate, (val) => {
  if (val && form.amount) {
    form.converted_amount = computedConvertedAmount.value ?? undefined
  }
})

watch(() => form.dest_id, () => {
  checkExchangeRate()
})

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const openCreate = () => {
  Object.assign(form, {
    source_type: 'cash_box', source_id: '', dest_type: 'bank_account',
    dest_id: '', dest_company_id: undefined, amount: 0, currency_code: 'ARS', transfer_type: 'CASH_TO_BANK',
    exchange_rate: undefined, rate_type: 'OFFICIAL', converted_amount: undefined, description: ''
  })
  destinationCompanyId.value = authStore.selectedCompany?.id ?? ''
  remoteDestinations.value = null
  modalOpen.value = true
}

const openDetail = (row: CashBoxTransfer) => {
  selectedTransfer.value = row
  detailModalOpen.value = true
}

async function handleConfirm(row: CashBoxTransfer) {
  if (processingTransferAction.value) return
  processingTransferAction.value = true
  try {
    await confirm(row.id)
    if (selectedTransfer.value?.id === row.id) detailModalOpen.value = false
    toast.add({ title: 'Transferencia confirmada', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al confirmar', color: 'error' })
  } finally {
    processingTransferAction.value = false
  }
}

async function handleCancel(row: CashBoxTransfer) {
  if (processingTransferAction.value) return
  processingTransferAction.value = true
  try {
    await cancel(row.id)
    if (selectedTransfer.value?.id === row.id) detailModalOpen.value = false
    toast.add({ title: 'Transferencia cancelada', color: 'warning' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al cancelar', color: 'error' })
  } finally {
    processingTransferAction.value = false
  }
}

async function handleDelete(row: CashBoxTransfer) {
  if (processingTransferAction.value) return
  processingTransferAction.value = true
  try {
    await remove(row.id)
    if (selectedTransfer.value?.id === row.id) detailModalOpen.value = false
    toast.add({ title: 'Transferencia eliminada', color: 'error' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al eliminar', color: 'error' })
  } finally {
    processingTransferAction.value = false
  }
}

const handleSubmit = async () => {
  if (savingTransfer.value) return
  savingTransfer.value = true
  try {
    form.converted_amount = computedConvertedAmount.value ?? undefined
    form.exchange_rate = form.exchange_rate ? Number(form.exchange_rate) : undefined
    const created = await create({ ...form })
    modalOpen.value = false
    selectedTransfer.value = created
    detailModalOpen.value = true
    toast.add({
      title: 'Transferencia pendiente creada',
      description: 'Podés agregar los comprobantes desde el detalle.',
      color: 'success'
    })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al crear transferencia', color: 'error' })
  } finally {
    savingTransfer.value = false
  }
}

const columns = cashBoxTransferColumns({
  onDetail: openDetail,
  onSortFieldSelect,
  onConfirm: handleConfirm,
  onCancel: handleCancel,
  onDelete: handleDelete
})

onMounted(async () => {
  await Promise.all([init(), initCashBoxes(), initBankAccounts(), initCurrencies()])
  const transferId = typeof route.query.transferId === 'string' ? route.query.transferId : ''
  const linkedTransfer = transferId ? transfers.value.find(transfer => transfer.id === transferId) : null
  if (linkedTransfer) openDetail(linkedTransfer)
})

const filterFields: FilterField[] = [
  { id: 'description', label: 'Filtrar por descripcion...', class: 'w-56' }
]

const sortFields: SortField[] = [
  { label: 'Fecha', value: 'created_at' },
  { label: 'Tipo', value: 'transfer_type' },
  { label: 'Monto', value: 'amount' },
  { label: 'Estado', value: 'status' }
]
</script>


<template>
  <div>
    <AppPageHeader title="Transferencias de Caja" description="Gestioná las transferencias entre cajas y bancos">
      <template #links>
        <UButton label="Nueva transferencia" icon="i-heroicons-plus" @click="openCreate" />
      </template>
    </AppPageHeader>

    <LogisticaTable
      :data="transfers"
      :columns="columns"
      :loading="loading"
      :filter-fields="filterFields"
      :sort-fields="sortFields"
      v-model:sorting="sorting"
    />

    <UModal v-model:open="modalOpen" title="Nueva transferencia" :ui="{ content: 'w-full sm:max-w-3xl' }">
      <template #body>
        <UForm :state="form" class="space-y-5">
          <UFormField label="Tipo de transferencia" required>
            <USelect
              v-model="form.transfer_type"
              :items="transferTypeItems"
              value-key="value"
              placeholder="Elegí de dónde sale y a dónde va"
              class="w-full"
              @update:model-value="onTransferTypeChange"
            />
          </UFormField>

          <div class="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
            <section class="space-y-3 rounded-xl border border-default bg-elevated/30 p-4">
              <div class="flex items-center gap-2">
                <span class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UIcon name="i-lucide-arrow-up-right" /></span>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Sale de</p>
                  <p class="text-sm font-medium text-highlighted">{{ authStore.selectedCompany?.name ?? 'Empresa actual' }}</p>
                </div>
              </div>
              <UFormField :label="originLabel" required>
                <USelectMenu
                  v-model="form.source_id"
                  :items="originItems"
                  value-key="value"
                  searchable
                  placeholder="Buscar caja o banco"
                  class="w-full"
                  @update:model-value="onSourceChange"
                />
              </UFormField>
              <div v-if="form.source_id && sourceBalance !== null" class="rounded-lg bg-default/60 px-3 py-2 text-sm">
                <span class="text-muted">Saldo disponible</span>
                <p class="font-semibold text-highlighted">{{ formatMoney(sourceBalance, sourceCurrency) }}</p>
              </div>
            </section>

            <div class="flex items-center justify-center text-muted">
              <UIcon name="i-lucide-arrow-right" class="hidden size-5 md:block" />
              <UIcon name="i-lucide-arrow-down" class="size-5 md:hidden" />
            </div>

            <section class="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div class="flex items-center gap-2">
                <span class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UIcon name="i-lucide-arrow-down-left" /></span>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Entra en</p>
                  <p class="text-sm font-medium text-highlighted">{{ companyItems.length > 1 ? 'Empresa y fondo que reciben' : 'Fondo que recibe' }}</p>
                </div>
              </div>
              <UFormField v-if="companyItems.length > 1" label="Empresa destino" required>
                <USelectMenu
                  v-model="destinationCompanyId"
                  :items="companyItems"
                  value-key="value"
                  searchable
                  placeholder="Buscar empresa"
                  class="w-full"
                  @update:model-value="onDestinationCompanyChange"
                />
              </UFormField>
              <UFormField :label="destLabel" required>
                <USelectMenu
                  v-model="form.dest_id"
                  :items="destItems"
                  value-key="value"
                  searchable
                  :placeholder="loadingDestinations ? 'Cargando fondos...' : 'Buscar caja o banco destino'"
                  :loading="loadingDestinations"
                  :disabled="!form.source_id || !destinationCompanyId || loadingDestinations"
                  class="w-full"
                />
              </UFormField>
            </section>
          </div>

          <UAlert
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            :description="isIntercompany
              ? 'Al registrar queda pendiente. Al confirmar, se debita el fondo de origen y se acredita el destino; la recepción también quedará registrada en la otra empresa.'
              : 'Al registrar queda pendiente. Los saldos se actualizan recién cuando confirmás la transferencia.'"
          />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
            <UFormField label="Monto a transferir" required>
              <UInput v-model.number="form.amount" type="number" :min="0" step="0.01" placeholder="0,00" class="w-full">
                <template #trailing><span class="text-xs text-muted">{{ form.currency_code }}</span></template>
              </UInput>
            </UFormField>
            <UFormField label="Moneda" required>
              <USelect
                v-model="form.currency_code"
                :items="currencyItems"
                value-key="value"
                placeholder="Moneda"
                class="w-full"
                @update:model-value="onCurrencyChange"
              />
            </UFormField>
          </div>

          <template v-if="showExchangeRate">
            <div class="rounded-xl border border-default p-4">
              <p class="mb-3 text-sm font-semibold text-highlighted">Conversión de moneda</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <UFormField label="Tipo de cambio">
                  <USelect v-model="form.rate_type" :items="rateTypeItems" value-key="value" class="w-full" @update:model-value="onRateTypeChange" />
                </UFormField>
                <UFormField label="Tasa de cambio">
                  <UInput v-model.number="form.exchange_rate" type="number" :min="0" step="0.0001" placeholder="1,0000" :loading="loadingRate" class="w-full">
                    <template #trailing>
                      <UButton v-if="form.exchange_rate" icon="i-heroicons-arrow-path" variant="link" color="neutral" size="xs" :loading="loadingRate" @click="onRateTypeChange" />
                    </template>
                  </UInput>
                </UFormField>
              </div>
              <div v-if="showConvertedAmount" class="mt-3 flex items-center justify-between rounded-lg bg-elevated/60 px-3 py-2 text-sm">
                <span class="text-muted">Recibe aproximadamente</span>
                <span class="font-semibold text-highlighted">{{ formatMoney(computedConvertedAmount, destCurrency) }}</span>
              </div>
            </div>
          </template>

          <details class="group rounded-xl border border-default">
            <summary class="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-highlighted">
              Más detalles <UIcon name="i-lucide-chevron-down" class="transition-transform group-open:rotate-180" />
            </summary>
            <div class="grid gap-4 border-t border-default p-4 sm:grid-cols-2">
              <UFormField label="Referencia">
                <UInput v-model="form.reference" placeholder="N.º de comprobante" class="w-full" />
              </UFormField>
              <UFormField label="Fecha de la operación">
                <UInput v-model="form.date" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Descripción" class="sm:col-span-2">
                <UTextarea v-model="form.description" placeholder="Motivo o detalle de la transferencia" :rows="2" class="w-full" />
              </UFormField>
            </div>
          </details>
        </UForm>
      </template>

      <template #footer>
        <div class="flex w-full flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <p class="text-xs text-muted">Registrar no mueve saldos; la transferencia queda pendiente de confirmación.</p>
          <div class="flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="outline" :disabled="savingTransfer" @click="modalOpen = false" />
          <UButton
            label="Registrar pendiente"
            icon="i-lucide-file-plus-2"
            :loading="savingTransfer"
            :disabled="savingTransfer || !form.source_id || !form.dest_id || form.amount <= 0 || loadingDestinations"
            @click="handleSubmit"
          />
          </div>
        </div>
      </template>
    </UModal>

    <!-- DETAIL MODAL -->
    <UModal v-model:open="detailModalOpen" title="Detalle de transferencia" :ui="{ width: 'w-full sm:max-w-lg' }">
      <template #body>
        <div v-if="selectedTransfer" class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted">Estado</span>
            <UBadge
              :label="statusMap[selectedTransfer.status]?.label ?? selectedTransfer.status"
              :color="statusMap[selectedTransfer.status]?.color ?? 'neutral'"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Registro</span>
              <p class="font-medium">{{ selectedTransfer.record_side === 'destination' ? 'Transferencia recibida' : 'Transferencia enviada' }}</p>
            </div>
            <div>
              <span class="text-muted">Tipo</span>
              <p class="font-medium">{{ transferTypeMap[selectedTransfer.transfer_type] ?? selectedTransfer.transfer_type }}</p>
            </div>
            <div>
              <span class="text-muted">Monto</span>
              <p class="font-medium">{{ formatMoney(selectedTransfer.amount, selectedTransfer.currency_code) }}</p>
            </div>
            <div>
              <span class="text-muted">Origen</span>
              <p class="font-medium">{{ detailSourceName }}</p>
            </div>
            <div v-if="selectedTransfer.source_company_name">
              <span class="text-muted">Empresa origen</span>
              <p class="font-medium">{{ selectedTransfer.source_company_name }}</p>
            </div>
            <div>
              <span class="text-muted">Destino</span>
              <p class="font-medium">{{ detailDestName }}</p>
            </div>
            <div v-if="selectedTransfer.dest_company_name">
              <span class="text-muted">Empresa destino</span>
              <p class="font-medium">{{ selectedTransfer.dest_company_name }}</p>
            </div>
          </div>

          <div v-if="selectedTransfer.exchange_rate" class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Tipo de cambio</span>
              <p class="font-medium">{{ selectedTransfer.rate_type ?? '—' }}</p>
            </div>
            <div>
              <span class="text-muted">Tasa</span>
              <p class="font-medium">{{ selectedTransfer.exchange_rate }}</p>
            </div>
            <div v-if="selectedTransfer.converted_amount">
              <span class="text-muted">Monto convertido</span>
              <p class="font-medium">{{ formatMoney(selectedTransfer.converted_amount, baseCurrency?.code) }}</p>
            </div>
          </div>

          <div v-if="selectedTransfer.description" class="text-sm">
            <span class="text-muted">Descripción</span>
            <p class="font-medium">{{ selectedTransfer.description }}</p>
          </div>

          <div v-if="selectedTransfer.execution_error" class="text-sm rounded-md bg-error/10 p-3 text-error">
            {{ selectedTransfer.execution_error }}
          </div>

          <div v-if="selectedTransfer.reference" class="text-sm">
            <span class="text-muted">Referencia</span>
            <p class="font-medium">{{ selectedTransfer.reference }}</p>
          </div>

          <template v-if="selectedTransfer.record_side !== 'destination'">
            <UAlert
              v-if="!canReadTransferAttachments"
              icon="i-lucide-lock-keyhole"
              color="warning"
              variant="subtle"
              title="No tenés permiso para ver los comprobantes"
              description="Para consultar estos comprobantes necesitás Ver transferencias (cash_box_transfers.read) y Ver archivos (media.read)."
            />
            <template v-else>
              <UAlert
                v-if="!canUploadTransferAttachments"
                icon="i-lucide-info"
                color="neutral"
                variant="subtle"
                description="Podés consultar los comprobantes. Para adjuntar o quitar archivos necesitás Subir archivos (media.upload), Crear transferencias (cash_box_transfers.create) y acceso al fondo de origen."
              />
              <UiAttachmentManager
                :key="selectedTransfer.id"
                entity-type="cash_box_transfer"
                :entity-id="selectedTransfer.id"
                :allow-upload="canUploadTransferAttachments"
                :readonly="!canUploadTransferAttachments"
                :max-files="10"
                default-expanded
              />
            </template>
          </template>
          <UAlert
            v-else
            icon="i-lucide-shield-check"
            color="info"
            variant="subtle"
            description="Los comprobantes de la transferencia quedan en la empresa de origen y no se comparten con esta empresa."
          />

          <div class="border-t border-default pt-3 text-xs text-muted space-y-1">
            <p>Creado por: <span class="font-medium text-highlighted">{{ selectedTransfer.creator?.name ?? selectedTransfer.creator?.email ?? '—' }}</span></p>
            <p>Fecha: <span class="font-medium text-highlighted">{{ selectedTransfer.created_at ? new Date(selectedTransfer.created_at).toLocaleString('es-AR') : '—' }}</span></p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            v-if="selectedTransfer && ['pending', 'processing', 'debit_applied', 'failed'].includes(selectedTransfer.status)"
            :label="selectedTransfer.status === 'pending' ? 'Confirmar' : 'Reintentar ejecución'"
            icon="i-lucide-check-circle"
            color="success"
            :loading="processingTransferAction"
            :disabled="processingTransferAction"
            @click="handleConfirm(selectedTransfer!)"
          />
          <UButton
            v-if="selectedTransfer?.status === 'completed' && selectedTransfer.record_side !== 'destination' && selectedTransfer.dest_company_id"
            label="Sincronizar recepción"
            icon="i-lucide-refresh-cw"
            color="warning"
            variant="outline"
            :loading="processingTransferAction"
            :disabled="processingTransferAction"
            @click="handleConfirm(selectedTransfer)"
          />
          <UButton
            v-if="selectedTransfer?.status === 'pending'"
            label="Cancelar transferencia"
            icon="i-lucide-x-circle"
            color="warning"
            variant="outline"
            :loading="processingTransferAction"
            :disabled="processingTransferAction"
            @click="handleCancel(selectedTransfer!)"
          />
          <UButton label="Cerrar" color="neutral" variant="outline" :disabled="processingTransferAction" @click="detailModalOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>
