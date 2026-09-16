<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import { resolveEntrySide } from '~/modulos/erp/current-accounts/utils'

import CurrentAccountSummary from '~/components/current-account/CurrentAccountSummary.vue'
import CurrentAccountChart from '~/components/current-account/CurrentAccountChart.vue'
import CurrentAccountEntryTable from '~/components/current-account/CurrentAccountEntryTable.vue'
import CurrentAccountExport from '~/components/current-account/CurrentAccountExport.vue'
import AdjustBalanceModal from '~/components/current-account/AdjustBalanceModal.vue'
import { useCurrentAccountsService } from '~/modulos/erp/current-accounts/service/current-accounts.service'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { statement, entries: storeEntries, loading, fetchStatement, fetchEntries } = useCurrentAccounts()

const partyId = route.params.partyId as string

const account = ref<CurrentAccount | null>(null)
const showAdjustBalance = ref(false)
const showDeleteConfirmation = ref(false)
const deletingOpeningBalance = ref(false)
const currentAccountsService = useCurrentAccountsService()

const entries = computed(() => {
  const fromStatement = statement.value?.entries ?? []
  const fromStore = storeEntries.value ?? []
  const list = fromStatement.length > 0 ? fromStatement : fromStore
  return list
    .map((entry) => {
      if (entry.reference_type === 'order_invoice_replacement') {
        return { ...entry, type: 'ORDER_INVOICE_REPLACEMENT' }
      }
      if (entry.reference_type === 'order_invoice_replacement_reversal') {
        return { ...entry, type: 'ORDER_INVOICE_REPLACEMENT_REVERSAL' }
      }
      return entry
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const balance = computed(() => Number(statement.value?.balance ?? 0))
const canDeleteOpeningBalance = computed(() =>
  entries.value.length === 1 && entries.value[0]?.type === 'OPENING_BALANCE'
)

async function reloadAccount() {
  await Promise.all([fetchStatement(partyId), fetchEntries(partyId)])
  if (statement.value?.account) account.value = statement.value.account
}

async function deleteOpeningBalance() {
  try {
    deletingOpeningBalance.value = true
    await currentAccountsService.deleteOpeningBalance(partyId)
    showDeleteConfirmation.value = false
    await reloadAccount()
    toast.add({ title: 'Saldo inicial eliminado', description: 'La cuenta quedó con saldo cero.', color: 'success' })
  } catch (error: any) {
    toast.add({ title: 'No se pudo eliminar', description: error?.data?.message ?? error.message, color: 'error' })
  } finally {
    deletingOpeningBalance.value = false
  }
}

const activeReplacementAmount = computed(() => {
  const replacements = entries.value
    .filter((e) => e.type === 'ORDER_INVOICE_REPLACEMENT')
    .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
  const reversals = entries.value
    .filter((e) => e.type === 'ORDER_INVOICE_REPLACEMENT_REVERSAL')
    .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
  return Math.max(0, replacements - reversals)
})

const totalDebit = computed(() =>
  Math.max(0,
    entries.value
      .filter((e) => e.type !== 'ORDER_INVOICE_REPLACEMENT_REVERSAL')
      .filter((e) => resolveEntrySide(e, account.value?.party_type ?? '') === 'debit')
      .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
      - activeReplacementAmount.value
  )
)

const totalCredit = computed(() =>
  entries.value
    .filter((e) => e.type !== 'ORDER_INVOICE_REPLACEMENT')
    .filter((e) => resolveEntrySide(e, account.value?.party_type ?? '') === 'credit')
    .reduce((sum, e) => sum + (Number(e.converted_amount ?? e.amount) || 0), 0)
)

const partyTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Proveedor',
    EMPLOYEE: 'Empleado',
    PARTNER: 'Socio'
  }
  return labels[account.value?.party_type ?? ''] ?? account.value?.party_type ?? ''
})

onMounted(async () => {
  try {
    await Promise.all([fetchStatement(partyId), fetchEntries(partyId)])
    if (statement.value?.account) {
      account.value = statement.value.account
    }
  } catch (e: any) {
    toast.add({ title: 'Error al cargar cuenta', color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/treasury/current-accounts')
  }
})

const goBack = () => {
  router.push('/erp/treasury/current-accounts')
}

const nuevoMovimientoItems = computed(() => {
  const partyType = account.value?.party_type

  if (partyType === 'CUSTOMER') {
    return [
      {
        label: 'Venta',
        icon: 'i-lucide-receipt',
        onSelect() {
          router.push(`/erp/sales/new?party_id=${partyId}`)
        }
      },
      {
        label: 'Cobro',
        icon: 'i-lucide-wallet',
        onSelect() {
          router.push(`/erp/treasury/payments/create?party_id=${partyId}`)
        }
      },
    ]
  }

  if (partyType === 'SUPPLIER') {
    return [
      {
        label: 'Compra',
        icon: 'i-lucide-shopping-cart',
        onSelect() {
          router.push(`/erp/purchases/purchases-documents/new?party_id=${partyId}`)
        }
      },
      {
        label: 'Pago',
        icon: 'i-lucide-wallet',
        onSelect() {
          router.push(`/erp/treasury/payments/create?party_id=${partyId}`)
        }
      },
    ]
  }

  return []
})

const accountActionItems = computed(() => [
  [
    {
      label: 'Registrar ajuste de saldo',
      description: 'Agrega un movimiento sin modificar el historial',
      icon: 'i-lucide-scale',
      onSelect: () => { showAdjustBalance.value = true },
    },
  ],
  ...(canDeleteOpeningBalance.value
    ? [[{
        label: 'Eliminar saldo inicial',
        description: 'Disponible porque es el único movimiento',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => { showDeleteConfirmation.value = true },
      }]]
    : []),
])
</script>

<template>
  <UPage class="mx-auto w-full max-w-[1600px] space-y-5 px-4 pb-10 sm:px-6">
    <AppPageHeader
      :title="account?.party?.name ?? 'Cuenta corriente'"
      :description="`Estado de cuenta · ${partyTypeLabel}`"
    >
      <template #links>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <CurrentAccountExport
            :entries="entries"
            :account="account"
            :party-type-label="partyTypeLabel"
          />
          <UDropdownMenu :items="accountActionItems">
            <UButton
              label="Acciones de cuenta"
              icon="i-lucide-ellipsis"
              variant="outline"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
          <UDropdownMenu :items="nuevoMovimientoItems">
            <UButton
              label="Nuevo movimiento"
              icon="i-heroicons-plus"
              color="primary"
              variant="solid"
            />
          </UDropdownMenu>
          <UButton label="Volver" icon="i-lucide-arrow-left" variant="ghost" @click="goBack" />
        </div>
      </template>
    </AppPageHeader>

    <!-- SUMMARY -->
    <CurrentAccountSummary
      :balance="balance"
      :total-debit="totalDebit"
      :total-credit="totalCredit"
      :party-type="account?.party_type"
      :party-type-label="partyTypeLabel"
      :account-count="entries.length"
    />

    <div class="flex items-end justify-between pt-2">
      <div>
        <p class="text-base font-semibold">Análisis de la cuenta</p>
        <p class="text-sm text-muted">Evolución y composición de los movimientos</p>
      </div>
    </div>

    <CurrentAccountChart
      :entries="entries"
      :balance="balance"
      :party-type="account?.party_type"
    />

    <div class="pt-2">
      <p class="text-base font-semibold">Detalle de la cuenta</p>
      <p class="text-sm text-muted">Consultá, filtrá y ordená todos los movimientos</p>
    </div>

    <CurrentAccountEntryTable
      v-if="account"
      :entries="entries"
      :loading="loading"
      :party-type="account.party_type"
    />

    <AdjustBalanceModal
      v-if="account"
      v-model:open="showAdjustBalance"
      :account="account"
      :balance="balance"
      @saved="reloadAccount"
    />

    <UModal
      v-model:open="showDeleteConfirmation"
      title="Eliminar saldo inicial"
      description="Esta acción dejará la cuenta corriente con saldo cero."
      :ui="{ content: 'w-[calc(100vw-2rem)] max-w-lg' }"
    >
      <template #body>
        <div class="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p class="font-medium">{{ account?.party?.name }}</p>
          <p class="mt-1 text-sm text-muted">
            Se eliminará el único movimiento de saldo inicial. Esta opción deja de estar disponible cuando la cuenta registra otro movimiento.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="Cancelar" variant="ghost" @click="showDeleteConfirmation = false" />
          <UButton
            label="Eliminar saldo inicial"
            icon="i-lucide-trash-2"
            color="error"
            :loading="deletingOpeningBalance"
            @click="deleteOpeningBalance"
          />
        </div>
      </template>
    </UModal>
  </UPage>
</template>
