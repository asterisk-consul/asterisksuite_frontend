<script setup lang="ts">
definePageMeta({ layout: 'rrhh', middleware: ['auth'] })

import { useCurrentAccounts } from '~/modulos/erp/current-accounts/composables/useCurrentAccounts'
import { currentAccountEntryColumns, ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import type { CurrentAccount } from '~/modulos/erp/current-accounts/types/current-accounts.types'
import LogisticaTable from '~/components/Tablas/LogisticaTable.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { statement, entries: storeEntries, loading, fetchStatement, fetchEntries } = useCurrentAccounts()

const partyId = route.params.id as string
const currencyCode = (route.query.currency as string) || 'ARS'

const account = ref<CurrentAccount | null>(null)

const entries = computed(() => {
  const fromStatement = statement.value?.entries ?? []
  const fromStore = storeEntries.value ?? []
  const list = fromStatement.length > 0 ? fromStatement : fromStore
  return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const balance = computed(() => Number(statement.value?.balance ?? 0))

const resolveSide = (type: string, partyType: string): 'debit' | 'credit' => {
  if (type === 'VALE_DEBIT') return 'debit'
  if (type === 'VALE_CREDIT') return 'credit'
  if (type === 'PAYMENT') return 'credit'
  if (type === 'COLLECTION') return 'debit'
  if (type === 'ADJUSTMENT') return 'debit'
  return 'debit'
}

const totalDebit = computed(() =>
  entries.value
    .filter(e => resolveSide(e.type, account.value?.party_type ?? '') === 'debit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

const totalCredit = computed(() =>
  entries.value
    .filter(e => resolveSide(e.type, account.value?.party_type ?? '') === 'credit')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
)

onMounted(async () => {
  try {
    await Promise.all([fetchStatement(partyId, currencyCode), fetchEntries(partyId, currencyCode)])
    if (statement.value?.account) {
      account.value = statement.value.account
    }
  } catch (e: any) {
    toast.add({ title: 'Error al cargar cuenta', color: 'error', icon: 'i-lucide-alert-circle' })
    router.push('/erp/rrhh/current-accounts')
  }
})

const entryTypeLabels: Record<string, string> = {
  VALE_DEBIT: 'Vale (Débito)',
  VALE_CREDIT: 'Vale (Crédito)',
  PAYMENT: 'Pago',
  COLLECTION: 'Cobro',
  ADJUSTMENT: 'Ajuste',
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de crédito',
  DEBIT_NOTE: 'Nota de débito'
}

const entryTypeColors: Record<string, string> = {
  VALE_DEBIT: 'error',
  VALE_CREDIT: 'success',
  PAYMENT: 'warning',
  COLLECTION: 'info',
  ADJUSTMENT: 'neutral',
  INVOICE: 'error',
  CREDIT_NOTE: 'success',
  DEBIT_NOTE: 'warning'
}

const formatCurrency = (amount: number | string | null | undefined, currency?: string) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || currencyCode,
    maximumFractionDigits: 2
  }).format(num)
}

const balanceColor = computed(() => {
  if (balance.value > 0) return 'text-success'
  if (balance.value < 0) return 'text-error'
  return 'text-muted'
})

const partyTypeLabel = computed(() => {
  if (!account.value) return ''
  return account.value.party_type === 'EMPLOYEE' ? 'Empleado' : 'Socio'
})

const goBack = () => {
  router.push('/erp/rrhh/current-accounts')
}
</script>

<template>
  <UPage class="space-y-6 px-4">
    <AppPageHeader
      :title="`Cuenta Corriente — ${account?.party?.name ?? '...'}`"
      :description="`${partyTypeLabel} · Saldo: ${formatCurrency(balance)}`"
    >
      <template #links>
        <UButton label="Volver" icon="i-lucide-arrow-left" variant="outline" @click="goBack" />
      </template>
    </AppPageHeader>

    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-down-left" class="size-5 text-success" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Total débitos</p>
            <p class="text-lg font-bold text-error">{{ formatCurrency(totalDebit) }}</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-arrow-up-right" class="size-5 text-error" />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Total créditos</p>
            <p class="text-lg font-bold text-success">{{ formatCurrency(totalCredit) }}</p>
          </div>
        </div>
      </UPageCard>
      <UPageCard variant="subtle">
        <div class="flex items-center gap-4">
          <div
            class="size-10 rounded-lg flex items-center justify-center shrink-0"
            :class="balance >= 0 ? 'bg-primary/10' : 'bg-warning/10'"
          >
            <UIcon
              name="i-lucide-scale"
              class="size-5"
              :class="balance >= 0 ? 'text-primary' : 'text-warning'"
            />
          </div>
          <div>
            <p class="text-xs text-muted font-medium uppercase">Saldo actual</p>
            <p class="text-lg font-bold" :class="balanceColor">{{ formatCurrency(balance) }}</p>
          </div>
        </div>
      </UPageCard>
    </div>

    <!-- ENTRIES TABLE -->
    <UPageCard variant="subtle">
      <template #header>
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">Movimientos</p>
          <UBadge :label="`${entries.length} movimientos`" variant="soft" size="sm" />
        </div>
      </template>

      <div v-if="loading" class="flex justify-center py-12">
        <ULoader />
      </div>
      <div v-else-if="entries.length === 0" class="text-center py-12 text-muted">
        <UIcon name="i-lucide-file-search" class="size-12 mx-auto mb-3 opacity-30" />
        <p>No hay movimientos registrados</p>
      </div>
      <div v-else class="border border-default rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-muted/30">
            <tr>
              <th class="text-left py-3 px-4 font-medium text-muted">Fecha</th>
              <th class="text-left py-3 px-4 font-medium text-muted">Tipo</th>
              <th class="text-left py-3 px-4 font-medium text-muted">Descripción</th>
              <th class="text-right py-3 px-4 font-medium text-muted">Monto</th>
              <th class="text-right py-3 px-4 font-medium text-muted">Saldo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="entry in entries" :key="entry.id" class="hover:bg-muted/20 transition-colors">
              <td class="py-3 px-4">
                {{ entry.date ? new Date(entry.date).toLocaleDateString('es-AR') : '-' }}
              </td>
              <td class="py-3 px-4">
                <UBadge
                  :label="entryTypeLabels[entry.type] ?? entry.type"
                  :color="(entryTypeColors[entry.type] ?? 'neutral') as any"
                  variant="soft"
                  size="xs"
                />
              </td>
              <td class="py-3 px-4 text-muted">{{ entry.description ?? '-' }}</td>
              <td class="py-3 px-4 text-right font-medium" :class="resolveSide(entry.type, account?.party_type ?? '') === 'debit' ? 'text-error' : 'text-success'">
                {{ resolveSide(entry.type, account?.party_type ?? '') === 'debit' ? '-' : '+' }}{{ formatCurrency(entry.amount) }}
              </td>
              <td class="py-3 px-4 text-right font-semibold" :class="Number(entry.balance_after) >= 0 ? 'text-success' : 'text-error'">
                {{ formatCurrency(entry.balance_after) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UPageCard>
  </UPage>
</template>
