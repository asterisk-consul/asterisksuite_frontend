<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import type { SortingState } from '@tanstack/vue-table'
import type { FilterField, SortField } from '~/components/Tablas/TableToolbar.vue'

import { useCashBoxTransfers } from '~/modulos/erp/cash-box-transfers/composables/useCashBoxTransfers'
import { cashBoxTransferColumns } from '~/modulos/erp/cash-box-transfers/columns'
import type { CreateCashBoxTransferInput, CashBoxTransfer, TransferType } from '~/modulos/erp/cash-box-transfers/types/cash-box-transfers.types'
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import { useExchangeRate } from '~/modulos/erp/currencies/composables/useExchangeRate'

import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const toast = useToast()
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

const detailSourceName = computed(() => {
  if (!selectedTransfer.value) return '—'
  const t = selectedTransfer.value
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
  if (t.dest_type === 'cash_box') {
    const box = findCashBox(t.dest_id)
    return box?.name ?? 'Caja'
  }
  const account = findBankAccount(t.dest_id)
  return account ? `${account.bank_name} - ${account.name}` : 'Banco'
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
const destItems = computed(() => isDestCashBox.value ? cashBoxItems.value : bankAccountItems.value)

const sourceCurrency = computed(() => {
  if (!form.source_id) return null
  if (isSourceCashBox.value) {
    const box = findCashBox(form.source_id)
    return box?.currency_code ?? null
  }
  const account = findBankAccount(form.source_id)
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
  if (!form.currency_code || !baseCurrency.value) return false
  return form.currency_code.toUpperCase() !== baseCurrency.value.code.toUpperCase()
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
  if (!showExchangeRate.value || !baseCurrency.value) {
    form.exchange_rate = undefined
    form.converted_amount = undefined
    return
  }
  loadingRate.value = true
  try {
    const rate = await autoResolve(form.currency_code, baseCurrency.value.code)
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

function onSortFieldSelect(columnId: string) {
  const current = sorting.value[0]
  sorting.value = [{ id: columnId, desc: current?.id === columnId ? !current.desc : false }]
}

const openCreate = () => {
  Object.assign(form, {
    source_type: 'cash_box', source_id: '', dest_type: 'bank_account',
    dest_id: '', amount: 0, currency_code: 'ARS', transfer_type: 'CASH_TO_BANK',
    exchange_rate: undefined, rate_type: 'OFFICIAL', converted_amount: undefined, description: ''
  })
  modalOpen.value = true
}

const openDetail = (row: CashBoxTransfer) => {
  selectedTransfer.value = row
  detailModalOpen.value = true
}

async function handleConfirm(row: CashBoxTransfer) {
  try {
    await confirm(row.id)
    toast.add({ title: 'Transferencia confirmada', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al confirmar', color: 'error' })
  }
}

async function handleCancel(row: CashBoxTransfer) {
  try {
    await cancel(row.id)
    toast.add({ title: 'Transferencia cancelada', color: 'warning' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al cancelar', color: 'error' })
  }
}

async function handleDelete(row: CashBoxTransfer) {
  try {
    await remove(row.id)
    toast.add({ title: 'Transferencia eliminada', color: 'error' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Error al eliminar', color: 'error' })
  }
}

const handleSubmit = async () => {
  form.converted_amount = computedConvertedAmount.value ?? undefined
  await create({ ...form })
  modalOpen.value = false
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

    <UModal v-model:open="modalOpen" title="Nueva transferencia" :ui="{ width: 'w-full sm:max-w-xl' }">
      <template #body>
        <UForm :state="form" class="space-y-5">

          <!-- Tipo de transferencia -->
          <UFormField label="Tipo de transferencia" required>
            <USelect
              :items="transferTypeItems"
              v-model="form.transfer_type"
              placeholder="Seleccionar tipo"
              @update:model-value="onTransferTypeChange"
            />
          </UFormField>

          <!-- Origen -->
          <UFormField :label="originLabel" required>
            <USelect
              :items="originItems"
              v-model="form.source_id"
              placeholder="Seleccionar..."
              @update:model-value="onSourceChange"
            />
          </UFormField>

          <div v-if="form.source_id && sourceBalance !== null" class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-heroicons-banknotes" class="text-primary" />
            <span>Saldo disponible: <span class="font-semibold text-highlighted">{{ formatMoney(sourceBalance, form.currency_code) }}</span></span>
          </div>

          <!-- Destino -->
          <UFormField :label="destLabel" required>
            <USelect
              :items="destItems"
              v-model="form.dest_id"
              placeholder="Seleccionar..."
              :disabled="!form.source_id"
            />
          </UFormField>

          <!-- Monto + Moneda -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Monto" required>
              <UInput v-model.number="form.amount" type="number" :min="0" placeholder="0.00" />
            </UFormField>
            <UFormField label="Moneda" required>
              <USelect
                :items="currencyItems"
                v-model="form.currency_code"
                placeholder="Moneda"
                @update:model-value="onCurrencyChange"
              />
            </UFormField>
          </div>

          <!-- Tipo de cambio + Convertido -->
          <template v-if="showExchangeRate">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Tipo de cambio">
                <USelect
                  :items="rateTypeItems"
                  v-model="form.rate_type"
                  @update:model-value="onRateTypeChange"
                />
              </UFormField>
              <UFormField label="Tasa de cambio">
                <UInput
                  v-model.number="form.exchange_rate"
                  type="number"
                  :min="0"
                  step="0.0001"
                  placeholder="1.0000"
                  :loading="loadingRate"
                >
                  <template #trailing>
                    <UButton
                      v-if="form.exchange_rate"
                      icon="i-heroicons-arrow-path"
                      variant="link"
                      color="neutral"
                      size="xs"
                      @click="onRateTypeChange"
                      :loading="loadingRate"
                    />
                  </template>
                </UInput>
              </UFormField>
            </div>
            <div v-if="showConvertedAmount" class="flex items-center gap-2 text-sm text-muted p-2 bg-elevated/50 rounded-lg">
              <UIcon name="i-heroicons-calculator" class="text-primary" />
              <span>Monto convertido: <span class="font-semibold text-highlighted">{{ formatMoney(computedConvertedAmount, baseCurrency?.code) }}</span></span>
            </div>
          </template>

          <!-- Referencia + Fecha -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Referencia">
              <UInput v-model="form.reference" placeholder="Nro comprobante" />
            </UFormField>
            <UFormField label="Fecha">
              <UInput v-model="form.date" type="date" />
            </UFormField>
          </div>

          <!-- Descripcion -->
          <UFormField label="Descripcion">
            <UTextarea v-model="form.description" placeholder="Detalle de la transferencia..." :rows="2" />
          </UFormField>

        </UForm>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancelar" color="neutral" variant="outline" @click="modalOpen = false" />
          <UButton
            label="Crear transferencia"
            icon="i-heroicons-arrow-right"
            :loading="loading"
            :disabled="!form.source_id || !form.dest_id || form.amount <= 0"
            @click="handleSubmit"
          />
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
              :label="selectedTransfer.status === 'pending' ? 'Pendiente' : selectedTransfer.status === 'completed' ? 'Completada' : 'Cancelada'"
              :color="selectedTransfer.status === 'pending' ? 'warning' : selectedTransfer.status === 'completed' ? 'success' : 'error'"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
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
            <div>
              <span class="text-muted">Destino</span>
              <p class="font-medium">{{ detailDestName }}</p>
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

          <div v-if="selectedTransfer.reference" class="text-sm">
            <span class="text-muted">Referencia</span>
            <p class="font-medium">{{ selectedTransfer.reference }}</p>
          </div>

          <div class="border-t border-default pt-3 text-xs text-muted space-y-1">
            <p>Creado por: <span class="font-medium text-highlighted">{{ selectedTransfer.creator?.name ?? selectedTransfer.creator?.email ?? '—' }}</span></p>
            <p>Fecha: <span class="font-medium text-highlighted">{{ selectedTransfer.created_at ? new Date(selectedTransfer.created_at).toLocaleString('es-AR') : '—' }}</span></p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            v-if="selectedTransfer?.status === 'pending'"
            label="Confirmar"
            icon="i-lucide-check-circle"
            color="success"
            @click="handleConfirm(selectedTransfer!); detailModalOpen = false"
          />
          <UButton
            v-if="selectedTransfer?.status === 'pending'"
            label="Cancelar transferencia"
            icon="i-lucide-x-circle"
            color="warning"
            variant="outline"
            @click="handleCancel(selectedTransfer!); detailModalOpen = false"
          />
          <UButton label="Cerrar" color="neutral" variant="outline" @click="detailModalOpen = false" />
        </div>
      </template>
    </UModal>
  </div>
</template>
