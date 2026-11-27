<script setup lang="ts">
import type { BankAccountMovement, BankAccountMovementDetails, BankMovementCheckDetails } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import type { ExtendedColumn } from '~/components/Tablas/types/tablas.types'
import { BANK_MOVEMENT_TYPE_GUIDE } from '~/modulos/erp/bank-accounts/movement-spreadsheet'
import { getMovementSignedAmount, getMovementTypeBadge } from '~/modulos/erp/bank-accounts/movement-columns'
import { useBankAccounts } from '~/modulos/erp/bank-accounts/composables/useBankAccounts'
import { useBankConcepts } from '~/modulos/erp/bank-concepts/composable/useBankConcepts'
import { useChecks } from '~/modulos/erp/checks/composables/useChecks'
import type { Check } from '~/modulos/erp/checks/types/checks.types'
import AsteriskTable from '~/components/Tablas/AsteriskTable.vue'
import { h, onBeforeUnmount, onMounted, resolveComponent, watch } from 'vue'

interface Props {
  accountId: string
  accountName: string
  currencyCode: string
  currentBalance: number
  bankAccountingAccountId?: string | null
  movements: BankAccountMovement[]
}

interface ColumnMapping {
  date: string
  description: string
  amount: string
  debit: string
  credit: string
  direction: string
  reference: string
  balance: string
}

interface StatementLine {
  rowNumber: number
  date: string
  description: string
  reference: string
  amount: number | null
  balance: number | null
  issue?: string
}

interface ReconciliationSuggestion {
  line: StatementLine
  status: 'suggested' | 'ambiguous' | 'unmatched' | 'invalid'
  movement?: BankAccountMovement
  candidateCount: number
  candidateMovementIds?: string[]
  issue?: string
}

interface ComparisonTableRow {
  id: string
  rowNumber?: number
  date: string
  description: string
  reference: string
  amount: number | null
  statementBalance: number | null
  systemAmount: number | null
  status: ReconciliationSuggestion['status'] | 'system_only'
  movement?: BankAccountMovement
  candidateCount: number
  issue?: string
}

interface SystemMovementTableRow {
  id: string
  date: string
  type: string
  description: string
  reference: string
  nature: string
  amount: number
  balance_before: number
  balance_after: number
  status: string
  movement: BankAccountMovement
}

type ComparisonFilter = 'all' | 'suggested' | 'pending' | 'system_only' | 'invalid'
type StatementAmountScale = 'units' | 'cents'
const NO_COLUMN = '__NO_COLUMN__'

const props = defineProps<Props>()
const emit = defineEmits<{ imported: []; close: [] }>()
const toast = useToast()
const { importStatementMovements, fetchMovementDetails } = useBankAccounts()
const { activeConcepts, init: initConcepts } = useBankConcepts()
const { init: initChecks, checks, deposit: depositCheck, debitOwnCheck } = useChecks()
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const fileHash = ref('')
const amountScale = ref<StatementAmountScale>('units')
const amountScaleItems = [
  { label: 'Importes en pesos / unidades', value: 'units' },
  { label: 'Importes en centavos (÷ 100)', value: 'cents' }
]
const sourceSheetName = ref('')
const headers = ref<string[]>([])
const sourceRows = ref<unknown[][]>([])
const parsing = ref(false)
const errorMessage = ref('')
const headerRowNumber = ref(1)
const savedProfile = ref(false)
const importing = ref(false)
const movementDetailsOpen = ref(false)
const movementDetailsLoading = ref(false)
const selectedMovementDetails = ref<BankAccountMovementDetails | null>(null)
const statementDate = ref('')
const statementClosingBalanceInput = ref('')
const statementDateManuallySet = ref(false)
const statementBalanceManuallySet = ref(false)
const comparisonFilter = ref<ComparisonFilter>('all')
const importPage = ref(0)
const selectedImportRows = ref<number[]>([])
const conceptByRow = reactive<Record<number, string>>({})
const quickConceptId = ref('')
const conceptRulesByKey = ref<Record<string, string>>({})
const rememberConceptRules = ref(true)
const activeWorkspaceTab = ref<'comparison' | 'resolve' | 'system' | 'notes'>('comparison')
const quickConceptOpen = ref(false)
const openConceptMenuRow = ref<number | null>(null)
const reconciliationNotes = ref('')
const savedReconciliationNotes = ref('')
const reconciliationNotesSavedAt = ref('')
const reconciliationNotesMessage = ref('')
const notesDirty = computed(() => reconciliationNotes.value !== savedReconciliationNotes.value)
const resolutionOpen = ref(false)
const activeResolution = ref<ReconciliationSuggestion | null>(null)
const resolutionChecks = ref<Check[]>([])
const loadingResolutionChecks = ref(false)
const impactingCheckId = ref('')
const refreshAfterExternalFlow = ref(false)
const importPageSize = 25
const closingBalance = computed(() => statementClosingBalanceInput.value.trim() ? parseAmount(statementClosingBalanceInput.value) : null)
const mapping = reactive<ColumnMapping>({ date: '', description: '', amount: '', debit: '', credit: '', direction: '', reference: '', balance: '' })
const normalizedMapping = computed<ColumnMapping>(() => ({
  date: mapping.date === NO_COLUMN ? '' : mapping.date,
  description: mapping.description === NO_COLUMN ? '' : mapping.description,
  amount: mapping.amount === NO_COLUMN ? '' : mapping.amount,
  debit: mapping.debit === NO_COLUMN ? '' : mapping.debit,
  credit: mapping.credit === NO_COLUMN ? '' : mapping.credit,
  direction: mapping.direction === NO_COLUMN ? '' : mapping.direction,
  reference: mapping.reference === NO_COLUMN ? '' : mapping.reference,
  balance: mapping.balance === NO_COLUMN ? '' : mapping.balance
}))

const fieldOptions = computed(() => [
  { label: 'No usar', value: NO_COLUMN },
  ...headers.value.map((header) => ({ label: header, value: header }))
])

const mappingIsValid = computed(() => Boolean(
  normalizedMapping.value.date
  && normalizedMapping.value.description
  && (normalizedMapping.value.amount || normalizedMapping.value.debit || normalizedMapping.value.credit)
))

const movementsBySignedCent = computed(() => {
  const index = new Map<number, BankAccountMovement[]>()
  for (const movement of props.movements) {
    if (movement.deleted_at) continue
    const cents = Math.round(getMovementSignedAmount(movement) * 100)
    const matches = index.get(cents) ?? []
    matches.push(movement)
    index.set(cents, matches)
  }
  return index
})

const normalizedLines = computed<StatementLine[]>(() => sourceRows.value.map((row, index) => {
  const valueFor = (column: string) => {
    const columnIndex = headers.value.indexOf(column)
    return columnIndex < 0 ? '' : row[columnIndex]
  }
  const date = parseDate(valueFor(normalizedMapping.value.date))
  const description = String(valueFor(normalizedMapping.value.description) ?? '').trim()
  const reference = String(valueFor(normalizedMapping.value.reference) ?? '').trim()
  const balance = normalizedMapping.value.balance ? parseStatementAmount(valueFor(normalizedMapping.value.balance)) : null
  let amount: number | null = null
  let issue: string | undefined

  if (normalizedMapping.value.debit || normalizedMapping.value.credit) {
    const debit = normalizedMapping.value.debit ? parseStatementAmount(valueFor(normalizedMapping.value.debit)) : 0
    const credit = normalizedMapping.value.credit ? parseStatementAmount(valueFor(normalizedMapping.value.credit)) : 0
    if (debit == null || credit == null) issue = 'No se pudo interpretar débito/crédito'
    else if (debit !== 0 && credit !== 0) issue = 'La fila tiene importe en débito y crédito'
    else amount = debit !== 0 ? -Math.abs(debit) : Math.abs(credit)
  } else {
    amount = parseStatementAmount(valueFor(normalizedMapping.value.amount))
    if (amount == null) issue = 'No se pudo interpretar el importe'
    else if (amount >= 0) {
      const direction = parseDirection(valueFor(normalizedMapping.value.direction))
      if (direction === 'DEBIT') amount = -Math.abs(amount)
      if (direction === 'CREDIT') amount = Math.abs(amount)
    }
  }

  if (!date) issue = issue ?? 'Falta una fecha válida'
  if (!description) issue = issue ?? 'Falta una descripción'
  if (amount === 0) issue = issue ?? 'El importe es cero'
  return { rowNumber: headerRowNumber.value + index + 1, date, description, reference, amount, balance, issue }
}).filter((line) => line.date || line.description || line.amount != null || line.reference))

const latestStatementDate = computed(() => normalizedLines.value
  .filter((line) => line.date && (line.amount != null || line.balance != null))
  .map((line) => line.date)
  .sort()
  .at(-1) ?? '')
const statementBalanceFromFile = computed(() => {
  const rowsWithBalance = normalizedLines.value.filter((line) => line.date && line.balance != null && (!statementDate.value || line.date <= statementDate.value))
  if (!rowsWithBalance.length) return null
  const lastDate = rowsWithBalance.map((line) => line.date).sort().at(-1)!
  const lastDateRows = rowsWithBalance.filter((line) => line.date === lastDate)
  const datedRows = normalizedLines.value.filter((line) => line.date)
  const isDescending = datedRows.length > 1 && datedRows[0]!.date > datedRows.at(-1)!.date
  return (isDescending ? lastDateRows[0] : lastDateRows.at(-1))?.balance ?? null
})

watch(latestStatementDate, (date) => {
  if (!statementDateManuallySet.value) statementDate.value = date
})
watch(statementBalanceFromFile, (balance) => {
  if (!statementBalanceManuallySet.value) statementClosingBalanceInput.value = balance == null ? '' : String(balance)
})
watch(() => props.accountId, loadSavedConceptRules, { immediate: true })
watch([() => props.accountId, fileHash], loadReconciliationNotes, { immediate: true })

const suggestions = computed<ReconciliationSuggestion[]>(() => {
  const usedMovementIds = new Set<string>()
  const chronologicalLines = [...normalizedLines.value].sort((a, b) => a.date.localeCompare(b.date) || a.rowNumber - b.rowNumber)
  return chronologicalLines.map((line) => {
    if (line.issue || line.amount == null || !line.date) {
      return { line, status: 'invalid', candidateCount: 0 }
    }

    const importKey = fileHash.value ? `${props.accountId}:${fileHash.value}:${line.rowNumber}` : ''
    const previouslyImported = importKey
      ? props.movements.find((movement) => movement.import_key === importKey)
      : undefined
    if (previouslyImported) {
      usedMovementIds.add(previouslyImported.id)
      const importedAmount = getMovementSignedAmount(previouslyImported)
      if (Math.abs(importedAmount - line.amount) <= 0.01) {
        return { line, status: 'suggested', movement: previouslyImported, candidateCount: 1 }
      }
      return {
        line,
        status: 'invalid',
        movement: previouslyImported,
        candidateCount: 1,
        issue: `Esta fila ya se importó con ${formatMoney(importedAmount)}; verificá la escala del archivo. No se reemplaza automáticamente.`
      }
    }

    const normalizedReference = normalizeText(line.reference)
    const amountCents = Math.round(line.amount * 100)
    const amountCandidates = [
      ...(movementsBySignedCent.value.get(amountCents - 1) ?? []),
      ...(movementsBySignedCent.value.get(amountCents) ?? []),
      ...(movementsBySignedCent.value.get(amountCents + 1) ?? [])
    ]
    const matches = amountCandidates
      .filter((movement) => {
        if (usedMovementIds.has(movement.id)) return false
        const signedAmount = getMovementSignedAmount(movement)
        if (Math.abs(signedAmount - line.amount!) > 0.01) return false
        const movementDate = parseDate(movement.date)
        if (statementDate.value && movementDate && movementDate > statementDate.value) return false
        const referenceMatch = normalizedReference && normalizeText(movement.reference) === normalizedReference
        return Boolean(movementDate && Math.abs(dayDifference(movementDate, line.date)) <= (referenceMatch ? 5 : 3))
      })
      .map((movement) => {
        const referenceMatch = normalizedReference && normalizeText(movement.reference) === normalizedReference
        const movementDate = parseDate(movement.date)
        const dateDistance = movementDate ? Math.abs(dayDifference(movementDate, line.date)) : 99
        return { movement, referenceMatch: Boolean(referenceMatch), dateDistance }
      })
      .sort((a, b) => Number(b.referenceMatch) - Number(a.referenceMatch) || a.dateDistance - b.dateDistance)

    if (!matches.length) return { line, status: 'unmatched', candidateCount: 0 }
    const best = matches[0]!
    const tied = matches.length > 1
      && best.referenceMatch === matches[1]!.referenceMatch
      && best.dateDistance === matches[1]!.dateDistance
    if (tied) return { line, status: 'ambiguous', candidateCount: matches.length, candidateMovementIds: matches.map(({ movement }) => movement.id) }

    usedMovementIds.add(best.movement.id)
    return { line, status: 'suggested', movement: best.movement, candidateCount: matches.length }
  })
})

const relevantSuggestions = computed(() => suggestions.value.filter((item) => !statementDate.value || item.line.date <= statementDate.value))
const statementPeriodStart = computed(() => relevantSuggestions.value
  .map((item) => item.line.date)
  .filter(Boolean)
  .sort()[0] ?? '')
const matchedSystemMovementIds = computed(() => new Set(relevantSuggestions.value.flatMap((item) => item.movement?.id ? [item.movement.id] : item.candidateMovementIds ?? [])))
const systemMovementsThroughDate = computed(() => props.movements
  .filter((movement) => !movement.deleted_at && (!statementDate.value || movement.date.slice(0, 10) <= statementDate.value))
  .sort((a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? '')))
const systemMovementRows = computed<SystemMovementTableRow[]>(() => [...props.movements]
  .map((movement) => ({
    id: movement.id,
    date: movement.date.slice(0, 10),
    type: getMovementTypeBadge(movement).label,
    description: movement.description || movement.concept_name_snapshot || movement.bank_concept?.name || 'Movimiento bancario',
    reference: movement.reference ?? '',
    nature: movement.nature ?? (getMovementSignedAmount(movement) < 0 ? 'DEBIT' : 'CREDIT'),
    amount: getMovementSignedAmount(movement),
    balance_before: Number(movement.balance_before),
    balance_after: Number(movement.balance_after),
    status: movement.deleted_at ? 'Anulado' : 'Activo',
    movement
  }))
  .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)))
const systemMovementsInStatementPeriod = computed(() => systemMovementsThroughDate.value.filter((movement) => !statementPeriodStart.value || movement.date.slice(0, 10) >= statementPeriodStart.value))
function movementTotals(amounts: number[]) {
  return {
    credits: roundMoney(amounts.filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0)),
    debits: roundMoney(amounts.filter((amount) => amount < 0).reduce((sum, amount) => sum + Math.abs(amount), 0)),
    net: roundMoney(amounts.reduce((sum, amount) => sum + amount, 0)),
    count: amounts.length
  }
}
const statementMovementTotals = computed(() => movementTotals(relevantSuggestions.value
  .flatMap(({ line }) => !line.date || line.amount == null ? [] : [line.amount])))
const systemMovementTotals = computed(() => movementTotals(systemMovementsInStatementPeriod.value.map(getMovementSignedAmount)))
const movementTotalDifferences = computed(() => ({
  credits: roundMoney(statementMovementTotals.value.credits - systemMovementTotals.value.credits),
  debits: roundMoney(statementMovementTotals.value.debits - systemMovementTotals.value.debits),
  net: roundMoney(statementMovementTotals.value.net - systemMovementTotals.value.net)
}))
const systemOnlyMovements = computed(() => systemMovementsInStatementPeriod.value.filter((movement) => !matchedSystemMovementIds.value.has(movement.id)))
const systemBalanceAtDate = computed<number | null>(() => {
  if (!statementDate.value) return null
  const lastMovement = systemMovementsThroughDate.value.at(-1)
  if (lastMovement) return Number(lastMovement.balance_after)
  const firstMovement = [...props.movements].filter((movement) => !movement.deleted_at).sort((a, b) => a.date.localeCompare(b.date))[0]
  if (firstMovement) return Number(firstMovement.balance_before)
  return Number(props.currentBalance)
})
const summary = computed(() => ({
  total: relevantSuggestions.value.length + systemOnlyMovements.value.length,
  suggested: relevantSuggestions.value.filter((item) => item.status === 'suggested').length,
  pending: relevantSuggestions.value.filter((item) => item.status === 'unmatched' || item.status === 'ambiguous').length,
  systemOnly: systemOnlyMovements.value.length,
  invalid: relevantSuggestions.value.filter((item) => item.status === 'invalid').length
}))
const workspaceTabItems = computed(() => [
  { label: `Comparación (${summary.value.total})`, value: 'comparison', icon: 'i-lucide-git-compare-arrows' },
  { label: `Resolver movimientos (${summary.value.pending})`, value: 'resolve', icon: 'i-lucide-wand-sparkles' },
  { label: `Movimientos del sistema (${systemMovementRows.value.length})`, value: 'system', icon: 'i-lucide-landmark' },
  { label: notesDirty.value ? 'Notas · sin guardar' : 'Notas', value: 'notes', icon: 'i-lucide-notebook-pen' }
])
const closingBalanceDifference = computed(() => closingBalance.value == null || systemBalanceAtDate.value == null
  ? null
  : roundMoney(closingBalance.value - systemBalanceAtDate.value))
const inferredStatementBalances = computed(() => {
  const balances = new Map<number, number>()
  const ordered = [...relevantSuggestions.value]
    .filter(({ line }) => line.amount != null && !line.issue)
    .sort((a, b) => a.line.date.localeCompare(b.line.date) || a.line.rowNumber - b.line.rowNumber)
  if (closingBalance.value == null) return balances
  let balanceAfterLine = closingBalance.value
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const item = ordered[index]!
    if (item.line.balance != null) {
      balanceAfterLine = item.line.balance
    } else {
      balances.set(item.line.rowNumber, balanceAfterLine)
    }
    balanceAfterLine = roundMoney(balanceAfterLine - (item.line.amount ?? 0))
  }
  return balances
})
const comparisonRows = computed<ComparisonTableRow[]>(() => {
  const rows: ComparisonTableRow[] = [
    ...relevantSuggestions.value.map(({ line, status, movement, candidateCount, issue }) => ({
    id: `statement:${line.rowNumber}`, rowNumber: line.rowNumber, date: line.date,
    description: line.description || line.issue || 'Fila sin descripción', reference: line.reference,
    amount: line.amount, statementBalance: line.balance ?? inferredStatementBalances.value.get(line.rowNumber) ?? null,
    systemAmount: movement ? getMovementSignedAmount(movement) : null,
    status, movement, candidateCount, issue: issue ?? line.issue
    })),
    ...systemOnlyMovements.value.map((movement) => ({
    id: `system:${movement.id}`, date: movement.date.slice(0, 10), description: movement.description || getMovementTypeBadge(movement).label,
    reference: movement.reference ?? '', amount: null, statementBalance: null, systemAmount: getMovementSignedAmount(movement),
    status: 'system_only' as const, movement, candidateCount: 0
    }))
  ]
  return rows.sort((a, b) => a.date.localeCompare(b.date)
    || (a.rowNumber ?? Number.MAX_SAFE_INTEGER) - (b.rowNumber ?? Number.MAX_SAFE_INTEGER)
    || a.id.localeCompare(b.id))
})
const filteredComparisonRows = computed(() => comparisonFilter.value === 'all'
  ? comparisonRows.value
  : comparisonFilter.value === 'pending'
    ? comparisonRows.value.filter((row) => row.status === 'unmatched' || row.status === 'ambiguous')
    : comparisonRows.value.filter((row) => row.status === comparisonFilter.value))
const unmatchedSuggestions = computed(() => relevantSuggestions.value.filter((item) => item.status === 'unmatched'))
const ambiguousSuggestions = computed(() => relevantSuggestions.value.filter((item) => item.status === 'ambiguous'))
const importPageCount = computed(() => Math.max(1, Math.ceil(unmatchedSuggestions.value.length / importPageSize)))
const importPageSuggestions = computed(() => unmatchedSuggestions.value.slice(importPage.value * importPageSize, (importPage.value + 1) * importPageSize))
const importConceptOptions = computed(() => activeConcepts.value
  .filter((concept: any) => concept.affects_balance && concept.accounting_account?.trim() && !concept.requires_receipt)
  .map((concept: any) => ({ label: `${concept.code} · ${concept.name} · Cuenta ${concept.accounting_account}`, value: concept.id })))
const quickConceptOptions = computed(() => importConceptOptions.value.map((option) => ({
  ...option,
  onSelect: (event: Event) => {
    if (quickConceptId.value !== option.value) return
    event.preventDefault()
    quickConceptId.value = ''
    quickConceptOpen.value = false
  }
})))
const selectedSuggestions = computed(() => unmatchedSuggestions.value.filter((item) => selectedImportRows.value.includes(item.line.rowNumber)))
const selectedRowsMissingConcept = computed(() => selectedSuggestions.value.filter((item) => !getConceptForLine(item.line)).length)
const hasSavedConceptRules = computed(() => Object.keys(conceptRulesByKey.value).length > 0)
const hasSuggestedConceptRows = computed(() => importPageSuggestions.value.some(({ line }) => Boolean(getConceptForLine(line))))
const allVisibleImportRowsSelected = computed(() => importPageSuggestions.value.length > 0 && importPageSuggestions.value.every((item) => selectedImportRows.value.includes(item.line.rowNumber)))
const resolutionAmount = computed(() => Math.abs(activeResolution.value?.line.amount ?? 0))
const resolutionIsCollection = computed(() => (activeResolution.value?.line.amount ?? 0) > 0)
const resolutionPaymentType = computed(() => resolutionIsCollection.value ? 'COLLECTION' : 'PAYMENT')
const resolutionCheckCandidates = computed(() => resolutionChecks.value.filter((check) => {
  const line = activeResolution.value?.line
  if (!line || line.amount == null) return false
  const availableAmount = Number(check.available_amount ?? check.amount)
  return check.is_own === !resolutionIsCollection.value
    && check.currency_code.toUpperCase() === props.currencyCode.toUpperCase()
    && availableAmount > 0
    && Math.abs(availableAmount - Math.abs(line.amount)) <= 0.01
}))
function moneyCell(value: number | string | null | undefined) {
  return h('span', { class: 'whitespace-nowrap tabular-nums' }, formatMoney(value == null ? null : Number(value)))
}

function comparisonStatusLabel(status: ComparisonTableRow['status']) {
  return status === 'system_only' ? 'Solo en el sistema' : statusLabel(status)
}

const movementChecks = computed(() => {
  const payment = selectedMovementDetails.value?.payment
  const checksById = new Map<string, { check: BankMovementCheckDetails; amountApplied?: number }>()
  for (const allocation of payment?.payment_allocations ?? []) {
    checksById.set(allocation.check.id, { check: allocation.check, amountApplied: Number(allocation.amount_applied) })
  }
  for (const check of payment?.checks ?? []) {
    if (!checksById.has(check.id)) checksById.set(check.id, { check })
  }
  const linkedCheck = selectedMovementDetails.value?.linked_check
  if (linkedCheck && !checksById.has(linkedCheck.id)) checksById.set(linkedCheck.id, { check: linkedCheck })
  return [...checksById.values()]
})

const detailsButton = resolveComponent('UButton')

const comparisonColumns: ExtendedColumn<ComparisonTableRow>[] = [
  { id: 'details', header: '', enableSorting: false, enableHiding: false, meta: { label: 'Detalle', disableColumnVisibility: true }, cell: ({ row }) => row.original.movement ? h('div', { class: 'flex justify-center' }, [h(detailsButton, {
    icon: 'i-lucide-eye', size: 'sm', color: 'neutral', variant: 'ghost',
    'aria-label': 'Ver detalle del movimiento bancario',
    onClick: (event: Event) => { event.stopPropagation(); void openMovementDetails(row.original.movement!) }
  })]) : null },
  { accessorKey: 'date', header: 'Fecha', meta: { label: 'Fecha', filter: { type: 'date-range' } } },
  { accessorKey: 'description', header: 'Descripción / movimiento', meta: { label: 'Descripción', filter: { type: 'text' } }, cell: ({ row }) => h('div', { class: 'min-w-52' }, [
    h('span', { class: 'block font-medium' }, row.original.description),
    h('span', { class: 'block text-xs text-muted' }, row.original.reference ? `Ref. ${row.original.reference}` : row.original.rowNumber ? `Fila ${row.original.rowNumber}` : 'Movimiento del sistema'),
    ...(row.original.issue ? [h('span', { class: 'block text-xs text-warning' }, row.original.issue)] : [])
  ]) },
  { accessorKey: 'amount', header: 'Importe', meta: { label: 'Importe', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.amount) },
  { accessorKey: 'statementBalance', header: 'Saldo extracto', meta: { label: 'Saldo extracto', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.statementBalance) },
  { id: 'movement', header: 'Movimiento asociado', meta: { label: 'Movimiento asociado' }, cell: ({ row }) => row.original.movement ? h('div', { class: 'min-w-44' }, [
    h('span', { class: 'block' }, getMovementTypeBadge(row.original.movement).label),
    h('span', { class: 'block text-xs text-muted' }, row.original.movement.description || row.original.movement.reference || 'Movimiento del sistema')
  ]) : row.original.status === 'ambiguous' ? `Revisar ${row.original.candidateCount} opciones` : 'Sin coincidencia' },
  { accessorKey: 'systemAmount', header: 'Importe sistema', meta: { label: 'Importe sistema', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.systemAmount) },
  { id: 'system_balance', header: 'Saldo sistema', meta: { label: 'Saldo sistema' }, cell: ({ row }) => moneyCell(row.original.movement?.balance_after) },
  { accessorKey: 'status', header: 'Resultado', meta: { label: 'Resultado', filter: { type: 'select', options: [
    { label: 'Coincidencia', value: 'suggested' }, { label: 'Sin movimiento', value: 'unmatched' }, { label: 'Ambiguo', value: 'ambiguous' }, { label: 'Solo sistema', value: 'system_only' }, { label: 'Fila inválida', value: 'invalid' }
  ] } }, cell: ({ row }) => h('span', { class: row.original.status === 'suggested' ? 'text-success' : row.original.status === 'invalid' || row.original.status === 'ambiguous' ? 'text-warning' : 'text-error' }, comparisonStatusLabel(row.original.status)) }
]

const systemMovementColumns: ExtendedColumn<SystemMovementTableRow>[] = [
  { id: 'details', header: '', enableSorting: false, enableHiding: false, meta: { label: 'Detalle', disableColumnVisibility: true }, cell: ({ row }) => h('div', { class: 'flex justify-center' }, [h(detailsButton, {
    icon: 'i-lucide-eye', size: 'sm', color: 'neutral', variant: 'ghost',
    'aria-label': 'Ver detalle del movimiento bancario',
    onClick: (event: Event) => { event.stopPropagation(); void openMovementDetails(row.original.movement) }
  })]) },
  { accessorKey: 'date', header: 'Fecha', meta: { label: 'Fecha', filter: { type: 'date-range' } }, cell: ({ row }) => formatDetailDate(row.original.date) },
  { accessorKey: 'type', header: 'Tipo', meta: { label: 'Tipo', filter: { type: 'text' } } },
  { accessorKey: 'description', header: 'Descripción', meta: { label: 'Descripción', filter: { type: 'text' } } },
  { accessorKey: 'reference', header: 'Referencia', meta: { label: 'Referencia', filter: { type: 'text' } } },
  { accessorKey: 'nature', header: 'Naturaleza', meta: { label: 'Naturaleza', filter: { type: 'select', options: [
    { label: 'Débito', value: 'DEBIT' }, { label: 'Crédito', value: 'CREDIT' }
  ] } }, cell: ({ row }) => row.original.nature === 'DEBIT' ? 'Débito' : 'Crédito' },
  { accessorKey: 'amount', header: 'Importe', meta: { label: 'Importe', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.amount) },
  { accessorKey: 'balance_before', header: 'Saldo anterior', meta: { label: 'Saldo anterior', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.balance_before) },
  { accessorKey: 'balance_after', header: 'Saldo posterior', meta: { label: 'Saldo posterior', filter: { type: 'number' } }, cell: ({ row }) => moneyCell(row.original.balance_after) },
  { accessorKey: 'status', header: 'Estado', meta: { label: 'Estado', filter: { type: 'select', options: [
    { label: 'Activo', value: 'Activo' }, { label: 'Anulado', value: 'Anulado' }
  ] } }, cell: ({ row }) => h('span', { class: row.original.status === 'Activo' ? 'text-success' : 'text-muted' }, row.original.status) }
]

async function openMovementDetails(movement: BankAccountMovement) {
  movementDetailsOpen.value = true
  movementDetailsLoading.value = true
  selectedMovementDetails.value = null
  try {
    selectedMovementDetails.value = await fetchMovementDetails(props.accountId, movement.id)
  } catch (error: any) {
    movementDetailsOpen.value = false
    toast.add({ title: 'No se pudo cargar el movimiento', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    movementDetailsLoading.value = false
  }
}

function formatDetailDate(value?: string | null) {
  if (!value) return '—'
  const datePart = value.slice(0, 10)
  const [year, month, day] = datePart.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function formatDetailCurrency(amount: number | string | null | undefined, currencyCode?: string) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyCode || props.currencyCode, maximumFractionDigits: 2 }).format(Number(amount) || 0)
}

function paymentDocumentPath(paymentType: 'PAYMENT' | 'COLLECTION' | 'EXPENSE', documentId: string) {
  const basePath = paymentType === 'COLLECTION' ? '/erp/sales' : '/erp/purchases/purchases-documents'
  return `${basePath}/${encodeURIComponent(documentId)}`
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo', CHECK: 'Cheque', BANK_TRANSFER: 'Transferencia bancaria', CREDIT_CARD: 'Tarjeta de crédito',
  DEBIT_CARD: 'Tarjeta de débito', VIRTUAL_WALLET: 'Billetera virtual', PAYROLL_DEDUCTION: 'Descuento por recibo'
}
const movementStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador', CONFIRMED: 'Confirmado', PAID: 'Pagado', REVERSED: 'Revertido', CANCELLED: 'Cancelado',
  PENDING: 'Pendiente', CLEARED: 'Acreditado', BOUNCED: 'Rechazado'
}

onMounted(async () => {
  try {
    await initConcepts()
  } catch {
    // La comparación sigue disponible aunque no se puedan cargar conceptos.
  }
  window.addEventListener('focus', refreshAfterExternalFlowOnFocus)
})

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
}

function normalizeHeader(value: unknown) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '')
}

function firstMatchingHeader(allHeaders: string[], terms: string[]) {
  return allHeaders.find((header) => terms.some((term) => normalizeHeader(header).includes(term))) ?? ''
}

function parseDate(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number' && value > 0) {
    // Excel serial dates use 1899-12-30 as day zero.
    const serialDate = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000)
    if (Number.isFinite(serialDate.getTime())) {
      return `${serialDate.getUTCFullYear()}-${String(serialDate.getUTCMonth() + 1).padStart(2, '0')}-${String(serialDate.getUTCDate()).padStart(2, '0')}`
    }
  }
  const text = String(value ?? '').trim()
  if (!text) return ''
  const leadingYear = text.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (leadingYear) {
    return `${leadingYear[1]}-${String(Number(leadingYear[2])).padStart(2, '0')}-${String(Number(leadingYear[3])).padStart(2, '0')}`
  }
  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (dmy) {
    const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3])
    return `${year}-${String(Number(dmy[2])).padStart(2, '0')}-${String(Number(dmy[1])).padStart(2, '0')}`
  }
  const parsed = new Date(text)
  return Number.isFinite(parsed.getTime())
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
    : ''
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return roundMoney(value)
  let text = String(value).trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '')
  if (!text) return null
  const parenthesized = String(value).trim().startsWith('(') && String(value).trim().endsWith(')')
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    text = text.split(thousandsSeparator).join('')
    if (decimalSeparator === ',') text = text.replace(',', '.')
  } else if (lastComma >= 0) {
    text = /,\d{1,2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '')
  } else if (lastDot >= 0 && !/\.\d{1,2}$/.test(text)) {
    text = text.replace(/\./g, '')
  }
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return null
  return roundMoney(parenthesized ? -Math.abs(parsed) : parsed)
}

function parseStatementAmount(value: unknown): number | null {
  const amount = parseAmount(value)
  if (amount == null || amountScale.value === 'units') return amount
  return roundMoney(amount / 100)
}

function parseDirection(value: unknown): 'DEBIT' | 'CREDIT' | null {
  const direction = normalizeText(value)
  if (/^(debit|debito|debe|cargo|out|egreso|salida|d|db|dr)$/.test(direction) || direction.includes('debito')) return 'DEBIT'
  if (/^(credit|credito|haber|abono|in|ingreso|entrada|c|cr)$/.test(direction) || direction.includes('credito')) return 'CREDIT'
  return null
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function dayDifference(left: string, right: string) {
  return Math.round((Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86_400_000)
}

function mapColumns(allHeaders: string[]) {
  const profileKey = `bank-statement-columns:${props.accountId}:${allHeaders.map(normalizeHeader).join('|')}`
  try {
    const stored = localStorage.getItem(profileKey)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ColumnMapping>
      for (const key of Object.keys(mapping) as Array<keyof ColumnMapping>) {
        mapping[key] = parsed[key] && allHeaders.includes(parsed[key]!) ? parsed[key]! : ''
      }
      savedProfile.value = true
      return
    }
  } catch {
    // A damaged local mapping can be recreated from the detected headers.
  }

  mapping.date = firstMatchingHeader(allHeaders, ['fecha', 'date', 'operationdate', 'valuedate'])
  mapping.description = firstMatchingHeader(allHeaders, ['descripcion', 'concepto', 'detalle', 'movimiento', 'description', 'transaccion', 'transaction'])
  mapping.debit = firstMatchingHeader(allHeaders, ['debito', 'debitos', 'debit', 'retiro', 'egreso'])
  mapping.credit = firstMatchingHeader(allHeaders, ['credito', 'creditos', 'credit', 'deposito', 'ingreso'])
  mapping.amount = mapping.debit || mapping.credit ? '' : firstMatchingHeader(allHeaders, ['importe', 'monto', 'amount', 'valor'])
  mapping.direction = firstMatchingHeader(allHeaders, ['naturaleza', 'sentido', 'debitcredit', 'creditdebit', 'tipo'])
  mapping.reference = firstMatchingHeader(allHeaders, ['referencia', 'reference', 'comprobante', 'operacionid', 'transactionid'])
  mapping.balance = allHeaders.find((header) => ['saldofinal', 'saldoalcierre', 'closingbalance', 'endingbalance', 'balanceactual'].some((term) => normalizeHeader(header).includes(term)))
    ?? allHeaders.find((header) => ['saldo', 'balance'].includes(normalizeHeader(header)))
    ?? allHeaders.find((header) => {
      const normalized = normalizeHeader(header)
      return (normalized.includes('saldo') || normalized.includes('balance'))
        && !['anterior', 'inicial', 'apertura', 'opening', 'previous', 'previo', 'inicio'].some((term) => normalized.includes(term))
    })
  savedProfile.value = false
}

async function handleFileSelection(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (fileHash.value && notesDirty.value) saveReconciliationNotes()
  errorMessage.value = ''
  sourceRows.value = []
  headers.value = []
  fileName.value = ''
  fileHash.value = ''
  amountScale.value = 'units'
  sourceSheetName.value = ''
  statementDate.value = ''
  statementClosingBalanceInput.value = ''
  statementDateManuallySet.value = false
  statementBalanceManuallySet.value = false
  comparisonFilter.value = 'all'
  activeWorkspaceTab.value = 'comparison'
  selectedImportRows.value = []
  quickConceptId.value = ''
  for (const key of Object.keys(conceptByRow)) delete conceptByRow[Number(key)]
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'El archivo supera 10 MB. Exportá un período más corto para continuar.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  parsing.value = true
  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const digest = await globalThis.crypto?.subtle?.digest('SHA-256', buffer)
    if (!digest) throw new Error('El navegador no permite calcular la huella de seguridad del archivo.')
    fileHash.value = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    // Conservá los valores de CSV como texto: SheetJS puede invertir fechas DD/MM
    // ambiguas y leer importes con coma decimal como enteros 100 veces mayores.
    // parseDate y parseAmount normalizan luego el texto según el formato bancario.
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: true })
    const guidanceSheets = new Set(['instrucciones', 'guiadetipos', 'guia', 'readme', 'comparacion', 'notas', 'notasconciliacion', 'movimientoscuenta', 'movimientossistema'])
    let detected: { sheetName: string; allRows: unknown[][]; headerIndex: number; score: number } | null = null

    for (const sheetName of workbook.SheetNames) {
      if (guidanceSheets.has(normalizeHeader(sheetName))) continue
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) continue
      const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true, blankrows: true })
      let headerIndex = -1
      let score = 0
      for (let index = 0; index < Math.min(allRows.length, 30); index += 1) {
        const rowHeaders = (allRows[index] ?? []).map((cell) => String(cell ?? '').trim())
        const date = firstMatchingHeader(rowHeaders, ['fecha', 'date'])
        const description = firstMatchingHeader(rowHeaders, ['descripcion', 'concepto', 'detalle', 'description', 'movement'])
        const amount = firstMatchingHeader(rowHeaders, ['importe', 'monto', 'amount', 'debito', 'debit', 'credito', 'credit'])
        const candidateScore = Number(Boolean(date)) + Number(Boolean(description)) + Number(Boolean(amount))
        if (candidateScore > score) {
          score = candidateScore
          headerIndex = index
        }
      }
      if (score >= 2 && (!detected || score > detected.score)) {
        detected = { sheetName, allRows, headerIndex, score }
      }
    }

    if (!detected) throw new Error('No pude detectar una hoja de movimientos. El archivo debe incluir fecha, descripción y un importe o débito/crédito.')

    const { sheetName, allRows, headerIndex: bestHeaderIndex } = detected
    const rawHeaders = (allRows[bestHeaderIndex] ?? []).map((cell, index) => String(cell ?? '').trim() || `Columna ${index + 1}`)
    const seen = new Map<string, number>()
    headers.value = rawHeaders.map((header) => {
      const count = (seen.get(header) ?? 0) + 1
      seen.set(header, count)
      return count === 1 ? header : `${header} (${count})`
    })
    sourceRows.value = allRows.slice(bestHeaderIndex + 1)
    if (sourceRows.value.length > 20_000) throw new Error('El archivo contiene más de 20.000 filas. Importá un período más corto.')
    headerRowNumber.value = bestHeaderIndex + 1
    mapColumns(headers.value)
    fileName.value = file.name
    sourceSheetName.value = sheetName
  } catch (error: any) {
    sourceRows.value = []
    headers.value = []
    errorMessage.value = error?.message || 'No se pudo leer el archivo.'
  } finally {
    parsing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function saveColumnProfile() {
  if (!mappingIsValid.value || !headers.value.length) return
  const profileKey = `bank-statement-columns:${props.accountId}:${headers.value.map(normalizeHeader).join('|')}`
  try {
    localStorage.setItem(profileKey, JSON.stringify(normalizedMapping.value))
    savedProfile.value = true
    toast.add({ title: 'Formato guardado', description: 'La próxima vez se reutilizarán estas columnas para esta cuenta y formato.', color: 'success' })
  } catch {
    toast.add({ title: 'No se pudo guardar el formato', description: 'El navegador no permitió guardar la asociación de columnas.', color: 'warning' })
  }
}

function statusLabel(status: ReconciliationSuggestion['status']) {
  return {
    suggested: 'Coincidencia sugerida',
    ambiguous: 'Revisar coincidencias',
    unmatched: 'Sin movimiento asociado',
    invalid: 'Revisar fila'
  }[status]
}

function statusColor(status: ReconciliationSuggestion['status']) {
  return status === 'suggested' ? 'success' : status === 'invalid' || status === 'ambiguous' ? 'warning' : 'neutral'
}

function toggleImportRow(rowNumber: number, checked: boolean) {
  const next = new Set(selectedImportRows.value)
  if (checked) {
    next.add(rowNumber)
    const suggestion = unmatchedSuggestions.value.find((item) => item.line.rowNumber === rowNumber)
    if (suggestion && quickConceptId.value) applyConceptToLines([suggestion.line], quickConceptId.value)
  }
  else {
    next.delete(rowNumber)
    const suggestion = unmatchedSuggestions.value.find((item) => item.line.rowNumber === rowNumber)
    if (suggestion) clearConceptForLines([suggestion.line])
  }
  selectedImportRows.value = [...next]
}

function toggleVisibleImportRows() {
  if (allVisibleImportRowsSelected.value) {
    const visible = new Set(importPageSuggestions.value.map((item) => item.line.rowNumber))
    selectedImportRows.value = selectedImportRows.value.filter((rowNumber) => !visible.has(rowNumber))
    clearConceptForLines(importPageSuggestions.value.map((item) => item.line))
    return
  }
  const newlySelectedRows = importPageSuggestions.value
    .filter((item) => !selectedImportRows.value.includes(item.line.rowNumber))
    .map((item) => item.line)
  if (quickConceptId.value) applyConceptToLines(newlySelectedRows, quickConceptId.value)
  selectedImportRows.value = [...new Set([
    ...selectedImportRows.value,
    ...importPageSuggestions.value.map((item) => item.line.rowNumber)
  ])]
}

function applyQuickConceptToSelectedRows() {
  if (!quickConceptId.value || !selectedSuggestions.value.length) return
  applyConceptToLines(selectedSuggestions.value.map((item) => item.line), quickConceptId.value)
}

function relatedPaymentsFor(check: Check) {
  const payments = [
    ...(check.payment ? [check.payment] : []),
    ...(check.payment_allocations ?? []).flatMap((allocation) => allocation.payment ? [allocation.payment] : [])
  ]
  return [...new Map(payments.map((payment) => [payment.id, payment])).values()]
}

function paymentForCheck(check: Check) {
  return relatedPaymentsFor(check).find((payment) => payment.type === resolutionPaymentType.value)
}

function canLinkCheckToPayment(check: Check) {
  if (check.status !== 'PENDING' || relatedPaymentsFor(check).length > 0) return false
  if (check.bank_account_id && check.bank_account_id !== props.accountId) return false
  return true
}

function canImpactCheck(check: Check) {
  const paymentRelations = relatedPaymentsFor(check)
  const expectedStatus = resolutionIsCollection.value ? ['PENDING', 'CONFIRMED'] : ['CONFIRMED']
  const accountMatches = resolutionIsCollection.value
    ? !check.bank_account_id || check.bank_account_id === props.accountId
    : check.bank_account_id === props.accountId
  const date = activeResolution.value?.line.date ?? ''
  const checkDateValid = resolutionIsCollection.value || (date >= check.due_date.slice(0, 10) && date <= localDateToday())
  return expectedStatus.includes(check.status)
    && accountMatches
    && checkDateValid
    && paymentRelations.length > 0
    && paymentRelations.every((payment) => payment.type === resolutionPaymentType.value && payment.status === 'PAID')
}

function checkNotReadyReason(check: Check) {
  const related = relatedPaymentsFor(check)
  if (check.bank_account_id && check.bank_account_id !== props.accountId) return 'Está asignado a otra cuenta bancaria.'
  if (!resolutionIsCollection.value && !check.bank_account_id) return 'El cheque propio no tiene asociada una cuenta bancaria.'
  if (!resolutionIsCollection.value && activeResolution.value && activeResolution.value.line.date < check.due_date.slice(0, 10)) return 'La fecha del extracto es anterior al vencimiento del cheque.'
  if (!resolutionIsCollection.value && activeResolution.value && activeResolution.value.line.date > localDateToday()) return 'La fecha del extracto no puede ser futura para debitar un cheque propio.'
  if (related.length && related.some((payment) => payment.type !== resolutionPaymentType.value)) return 'Está vinculado a un tipo de pago/cobro distinto del movimiento.'
  if (related.length && related.some((payment) => payment.status !== 'PAID')) return 'El pago/cobro asociado todavía no está confirmado.'
  if (related.length) return 'El cheque todavía no está disponible para impactar en esta cuenta.'
  return 'Primero vinculá el cheque a un pago/cobro para conservar su asociación con la factura o el anticipo.'
}

function openExternalRoute(path: string) {
  refreshAfterExternalFlow.value = true
  window.open(path, '_blank', 'noopener,noreferrer')
}

function openBankAccountsConfiguration() {
  openExternalRoute('/erp/treasury/bank-accounts')
}

function openPaymentFlow(options: { paymentMode: 'NORMAL' | 'ADVANCE'; paymentMethod?: 'BANK_TRANSFER' | 'CHECK'; check?: Check }) {
  const line = activeResolution.value?.line
  if (!line || line.amount == null) return
  const query = new URLSearchParams({
    type: resolutionPaymentType.value,
    payment_mode: options.paymentMode,
    payment_method: options.paymentMethod ?? 'BANK_TRANSFER',
    amount: String(options.check ? Number(options.check.available_amount ?? options.check.amount) : resolutionAmount.value),
    currency: options.check?.currency_code ?? props.currencyCode,
    date: line.date,
    description: line.description,
    reference: line.reference,
    bank_account_id: props.accountId,
    statement_reconciliation: '1'
  })
  const checkPayment = options.check ? paymentForCheck(options.check) : undefined
  if (checkPayment?.party_id) query.set('party_id', checkPayment.party_id)
  if (options.check) query.set('check_id', options.check.id)
  openExternalRoute(`/erp/treasury/payments/create?${query.toString()}`)
}

function openRelatedPayment(check: Check) {
  const payment = paymentForCheck(check) ?? relatedPaymentsFor(check)[0]
  if (!payment) return
  openExternalRoute(`/erp/treasury/payments/${encodeURIComponent(payment.id)}`)
}

async function openResolution(suggestion: ReconciliationSuggestion) {
  activeResolution.value = suggestion
  resolutionOpen.value = true
  loadingResolutionChecks.value = true
  resolutionChecks.value = []
  try {
    const isOwn = !((suggestion.line.amount ?? 0) > 0)
    const statuses = ['PENDING', 'CONFIRMED']
    const found: Check[] = []
    for (const status of statuses) {
      await initChecks({ status, is_own: isOwn })
      found.push(...checks.value)
    }
    resolutionChecks.value = [...new Map(found.map((check) => [check.id, check])).values()]
  } catch (error: any) {
    toast.add({ title: 'No se pudieron buscar cheques', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    loadingResolutionChecks.value = false
  }
}

async function impactMatchedCheck(check: Check) {
  const line = activeResolution.value?.line
  if (!line || !canImpactCheck(check) || impactingCheckId.value) return
  impactingCheckId.value = check.id
  try {
    if (resolutionIsCollection.value) {
      await depositCheck(check.id, {
        bank_account_id: props.accountId,
        amount: Number(check.available_amount ?? check.amount),
        date: line.date
      })
    } else {
      await debitOwnCheck(check.id, line.date)
    }
    toast.add({ title: 'Cheque impactado en el banco', description: `Se registró en ${props.accountName} y se actualizará la comparación.`, color: 'success' })
    resolutionOpen.value = false
    emit('imported')
  } catch (error: any) {
    toast.add({ title: 'No se pudo impactar el cheque', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    impactingCheckId.value = ''
  }
}

function localDateToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function refreshAfterExternalFlowOnFocus() {
  if (!refreshAfterExternalFlow.value) return
  refreshAfterExternalFlow.value = false
  emit('imported')
}

onBeforeUnmount(() => {
  if (fileHash.value && notesDirty.value) saveReconciliationNotes()
  window.removeEventListener('focus', refreshAfterExternalFlowOnFocus)
})

async function registerSelectedMovements() {
  if (!fileHash.value || !props.bankAccountingAccountId || !selectedSuggestions.value.length || selectedSuggestions.value.length > 50 || selectedRowsMissingConcept.value) return
  importing.value = true
  try {
    const result = await importStatementMovements(props.accountId, {
      file_hash: fileHash.value,
      rows: selectedSuggestions.value.map(({ line }) => ({
        row_number: line.rowNumber,
        date: line.date,
        description: line.description,
        reference: line.reference || undefined,
        amount: line.amount!,
        bank_concept_id: getConceptForLine(line)
      }))
    })
    toast.add({
      title: 'Movimientos registrados',
      description: `${result.created} nuevos · ${result.already_imported} ya importados. Se actualizó el saldo y se generaron los asientos.`,
      color: 'success'
    })
    selectedImportRows.value = []
    emit('imported')
  } catch (error: any) {
    toast.add({ title: 'No se pudo registrar el extracto', description: error?.data?.message || error?.message, color: 'error' })
  } finally {
    importing.value = false
  }
}

function formatMoney(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.currencyCode, maximumFractionDigits: 2 }).format(amount)
}

function conceptRuleStorageKey() {
  return `bank-statement-concept-rules:${props.accountId}`
}

function conceptRuleKey(line: StatementLine) {
  if (!line.description.trim() || line.amount == null) return ''
  const nature = line.amount < 0 ? 'DEBIT' : 'CREDIT'
  return `${nature}:${normalizeText(line.description)}`
}

function getConceptForLine(line: StatementLine) {
  if (Object.prototype.hasOwnProperty.call(conceptByRow, line.rowNumber)) return conceptByRow[line.rowNumber] || ''
  const ruleKey = conceptRuleKey(line)
  const conceptId = ruleKey ? conceptRulesByKey.value[ruleKey] : ''
  return conceptId && importConceptOptions.value.some((option) => option.value === conceptId) ? conceptId : ''
}

function conceptOptionsForLine(line: StatementLine) {
  return importConceptOptions.value.map((option) => ({
    ...option,
    onSelect: (event: Event) => {
      if (getConceptForLine(line) !== option.value) return
      event.preventDefault()
      updateConceptForLine(line, '')
      openConceptMenuRow.value = null
    }
  }))
}

function updateConceptForLine(line: StatementLine, value: unknown) {
  const conceptId = String(value ?? '')
  applyConceptToLines([line], conceptId)
}

function applyConceptToLines(lines: StatementLine[], conceptId: string) {
  const nextRules = { ...conceptRulesByKey.value }
  let hasRulesToSave = false
  for (const line of lines) {
    conceptByRow[line.rowNumber] = conceptId
    const ruleKey = conceptRuleKey(line)
    if (!conceptId || !ruleKey || !rememberConceptRules.value) continue
    nextRules[ruleKey] = conceptId
    hasRulesToSave = true
  }
  if (!hasRulesToSave) return
  conceptRulesByKey.value = nextRules
  try {
    localStorage.setItem(conceptRuleStorageKey(), JSON.stringify(nextRules))
  } catch {
    toast.add({ title: 'No se pudo guardar la sugerencia', description: 'El navegador no permitió guardar reglas para esta cuenta.', color: 'warning' })
  }
}

function clearConceptForLines(lines: StatementLine[]) {
  for (const line of lines) conceptByRow[line.rowNumber] = ''
}

function loadSavedConceptRules() {
  if (!import.meta.client) return
  try {
    const saved = localStorage.getItem(conceptRuleStorageKey())
    const parsed = saved ? JSON.parse(saved) : {}
    conceptRulesByKey.value = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    conceptRulesByKey.value = {}
  }
}

function clearSavedConceptRules() {
  try {
    localStorage.removeItem(conceptRuleStorageKey())
    conceptRulesByKey.value = {}
    toast.add({ title: 'Sugerencias borradas', description: 'Se quitaron las reglas recordadas para esta cuenta en este navegador.', color: 'success' })
  } catch {
    toast.add({ title: 'No se pudieron borrar las sugerencias', description: 'El navegador no permitió modificar el almacenamiento local.', color: 'warning' })
  }
}

function reconciliationNotesStorageKey() {
  return fileHash.value ? `bank-statement-notes:${props.accountId}:${fileHash.value}` : ''
}

function loadReconciliationNotes() {
  reconciliationNotes.value = ''
  savedReconciliationNotes.value = ''
  reconciliationNotesSavedAt.value = ''
  reconciliationNotesMessage.value = ''
  const key = reconciliationNotesStorageKey()
  if (!import.meta.client || !key) return
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return
    const parsed = JSON.parse(saved) as { text?: unknown; savedAt?: unknown }
    const text = typeof parsed.text === 'string' ? parsed.text : ''
    reconciliationNotes.value = text
    savedReconciliationNotes.value = text
    reconciliationNotesSavedAt.value = typeof parsed.savedAt === 'string' ? parsed.savedAt : ''
    reconciliationNotesMessage.value = 'Notas guardadas en este navegador para este archivo.'
  } catch {
    reconciliationNotesMessage.value = 'No se pudieron leer las notas guardadas de este archivo.'
  }
}

function saveReconciliationNotes() {
  const key = reconciliationNotesStorageKey()
  if (!import.meta.client || !key) return
  try {
    const savedAt = new Date().toISOString()
    if (reconciliationNotes.value.trim()) {
      localStorage.setItem(key, JSON.stringify({ text: reconciliationNotes.value, savedAt, fileName: fileName.value }))
      reconciliationNotesSavedAt.value = savedAt
      reconciliationNotesMessage.value = 'Notas guardadas en este navegador para este archivo.'
    } else {
      localStorage.removeItem(key)
      reconciliationNotesSavedAt.value = ''
      reconciliationNotesMessage.value = 'Se quitaron las notas guardadas para este archivo.'
    }
    savedReconciliationNotes.value = reconciliationNotes.value
  } catch {
    reconciliationNotesMessage.value = 'No se pudieron guardar las notas; descargalas para conservar una copia.'
    toast.add({ title: 'No se pudieron guardar las notas', description: 'El almacenamiento local del navegador no está disponible.', color: 'warning' })
  }
}

function downloadReconciliationNotes() {
  const content = [
    'Notas de conciliación bancaria',
    `Cuenta: ${accountName}`,
    `Archivo: ${fileName.value || '—'}`,
    `Período: ${statementPeriodStart.value || '—'} a ${statementDate.value || '—'}`,
    `Descargado: ${new Date().toLocaleString('es-AR')}`,
    '',
    reconciliationNotes.value.trim() || 'Sin notas.'
  ].join('\r\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = accountName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  link.href = url
  link.download = `notas-conciliacion-${safeName || 'cuenta'}.txt`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function selectRowsWithSuggestedConcept() {
  const nextRows = new Set(selectedImportRows.value)
  for (const { line } of unmatchedSuggestions.value) {
    if (nextRows.size >= 50) break
    if (getConceptForLine(line)) nextRows.add(line.rowNumber)
  }
  selectedImportRows.value = [...nextRows]
}

async function exportComparison() {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['Comparación de extracto bancario'],
    ['Cuenta', props.accountName],
    ['Moneda', props.currencyCode],
    ['Fecha de cierre del banco', statementDate.value || 'No informada'],
    ['Saldo del banco al cierre', closingBalance.value ?? 'No informado'],
    ['Saldo de Asterisk Suite al cierre', systemBalanceAtDate.value ?? 'No disponible'],
    ['Diferencia (banco menos sistema)', closingBalanceDifference.value ?? 'No disponible'],
    ['Período de movimientos comparado', `${statementPeriodStart.value || 'No definido'} a ${statementDate.value || 'sin fecha de corte'}`],
    ['Créditos del extracto', statementMovementTotals.value.credits],
    ['Débitos del extracto', statementMovementTotals.value.debits],
    ['Neto del extracto', statementMovementTotals.value.net],
    ['Créditos registrados en el sistema', systemMovementTotals.value.credits],
    ['Débitos registrados en el sistema', systemMovementTotals.value.debits],
    ['Neto registrado en el sistema', systemMovementTotals.value.net],
    ['Diferencia neta de movimientos (extracto menos sistema)', movementTotalDifferences.value.net],
    ['Hoja de datos', 'Comparación contiene las filas del extracto y el resultado sugerido. Movimientos del sistema contiene los registros ya cargados para esta cuenta.'],
    ['Lectura', 'Los importes positivos aumentan el saldo de esta cuenta y los negativos lo reducen. La naturaleza diferencia CREDIT de DEBIT.'],
    ['Resultado', 'Una coincidencia sugerida no modifica registros. Revisá manualmente los pendientes y ambiguos antes de conciliarlos fuera de este reporte.'],
    ['Efecto en Asterisk Suite', 'Exportar este archivo no agrega movimientos ni modifica el saldo o genera asientos contables.'],
    ['Reimportación', 'La app ignora las hojas Instrucciones, Guía de tipos, Comparación y Notas para buscar una hoja de movimientos compatible.']
  ])
  instructionsSheet['!cols'] = [{ wch: 24 }, { wch: 112 }]
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones')

  const statementSheet = XLSX.utils.json_to_sheet(suggestions.value.map(({ line, status, movement, candidateCount }) => ({
    Fila: line.rowNumber,
    Fecha: line.date,
    Descripción: line.description,
    Referencia: line.reference,
    Importe: line.amount,
    'Saldo extracto': line.balance ?? inferredStatementBalances.value.get(line.rowNumber) ?? '',
    'Resultado de comparación': statusLabel(status),
    'Tipo sugerido': movement ? getMovementTypeBadge(movement).label : '',
    'Código de tipo': movement?.type ?? '',
    'Referencia del sistema': movement?.reference ?? '',
    'Movimiento del sistema': movement?.id ?? '',
    'Candidatos posibles': candidateCount,
    Observación: line.issue ?? ''
  })))
  statementSheet['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 44 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 38 }, { wch: 18 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(workbook, statementSheet, 'Comparación')

  const movementsSheet = XLSX.utils.json_to_sheet(props.movements.map((movement) => ({
    'Movimiento del sistema': movement.id,
    Fecha: movement.date.slice(0, 10),
    Tipo: getMovementTypeBadge(movement).label,
    'Código de tipo': movement.type,
    Naturaleza: movement.nature ?? (getMovementSignedAmount(movement) < 0 ? 'DEBIT' : 'CREDIT'),
    Concepto: movement.concept_name_snapshot ?? movement.bank_concept?.name ?? '',
    Descripción: movement.description ?? '',
    Referencia: movement.reference ?? '',
    Importe: getMovementSignedAmount(movement),
    Saldo: Number(movement.balance_after)
  })))
  movementsSheet['!cols'] = [{ wch: 38 }, { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 44 }, { wch: 24 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(workbook, movementsSheet, 'Movimientos sistema')

  const guideSheet = XLSX.utils.json_to_sheet(BANK_MOVEMENT_TYPE_GUIDE.map((item) => ({
    'Código / etiqueta': item.code,
    'Nombre en español': item.label,
    'Qué significa': item.meaning,
    'Efecto habitual': item.usualNature
  })))
  guideSheet['!cols'] = [{ wch: 34 }, { wch: 32 }, { wch: 88 }, { wch: 54 }]
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guía de tipos')

  const notesSheet = XLSX.utils.aoa_to_sheet([
    ['Notas de conciliación bancaria'],
    ['Cuenta', props.accountName],
    ['Archivo', fileName.value || ''],
    ['Período comparado', `${statementPeriodStart.value || 'No definido'} a ${statementDate.value || 'Sin fecha de cierre'}`],
    ['Notas', reconciliationNotes.value.trim() || 'Sin notas.']
  ])
  notesSheet['!cols'] = [{ wch: 24 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(workbook, notesSheet, 'Notas')

  const safeName = props.accountName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  XLSX.writeFile(workbook, `comparacion-bancaria-${safeName || 'cuenta'}.xlsx`)
}

</script>

<template>
  <div class="flex flex-col gap-5 p-4 sm:p-6">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-default pb-4">
      <div>
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Tesorería · Bancos</p>
        <h1 class="text-2xl font-semibold">Conciliación bancaria</h1>
        <p class="text-sm text-muted">{{ accountName }} · {{ currencyCode }}</p>
      </div>
      <UButton label="Volver a la cuenta" icon="i-lucide-arrow-left" color="neutral" variant="outline" @click="emit('close')" />
    </header>

    <div class="flex flex-col gap-5">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-shield-check"
          title="Primero compará; después elegí qué registrar"
          :description="`Comparar no modifica nada. Para cada fila sin coincidencia podés abrir el flujo de pago/cobro con factura o anticipo, asociar o crear un cheque, o registrar un concepto bancario. Se usan las acciones existentes para que cada operación impacte una sola vez en ${accountName}.`"
        />
        <div v-if="!bankAccountingAccountId" class="space-y-2">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-landmark"
            title="Falta configurar la cuenta contable del banco"
            description="Podés seleccionar los conceptos ahora, pero para registrar los movimientos y generar sus asientos hace falta una cuenta contable activa de tipo Activo en esta cuenta bancaria."
          />
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2">
            <p class="text-sm text-muted">Abrí la configuración en otra pestaña; al volver se actualizará esta conciliación y conservarás las filas seleccionadas.</p>
            <UButton size="sm" variant="outline" icon="i-lucide-settings-2" label="Configurar cuenta bancaria" @click="openBankAccountsConfiguration" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div>
            <p class="font-medium">{{ accountName }}</p>
            <p class="text-sm text-muted">Esta cuenta · {{ currencyCode }} · CSV o Excel de cualquier banco</p>
            <p v-if="fileName" class="mt-1 text-xs text-muted">Archivo: {{ fileName }}<span v-if="sourceSheetName"> · Hoja leída: {{ sourceSheetName }}</span></p>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-default px-3 py-2 text-sm font-medium hover:bg-elevated">
            <UIcon name="i-lucide-upload" class="size-4" /> Elegir archivo
            <input ref="fileInput" class="sr-only" type="file" accept=".xlsx,.xls,.csv" @change="handleFileSelection">
          </label>
        </div>

        <UAlert v-if="parsing" color="neutral" variant="subtle" icon="i-lucide-loader-circle" title="Leyendo extracto…" />
        <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="errorMessage" />

        <section v-if="headers.length" class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-semibold">Asociar columnas del extracto</h3>
              <p class="text-sm text-muted">La app detecta algunos encabezados; corregilos si el banco usa otros nombres.</p>
            </div>
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-save"
              :disabled="!mappingIsValid"
              :label="savedProfile ? 'Formato guardado' : 'Guardar este formato'"
              @click="saveColumnProfile"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <UFormField label="Fecha" required><USelect v-model="mapping.date" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Descripción" required><USelect v-model="mapping.description" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Importe con signo"><USelect v-model="mapping.amount" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Débito"><USelect v-model="mapping.debit" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Crédito"><USelect v-model="mapping.credit" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Tipo / sentido"><USelect v-model="mapping.direction" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Referencia"><USelect v-model="mapping.reference" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
            <UFormField label="Saldo del extracto"><USelect v-model="mapping.balance" :items="fieldOptions" value-key="value" class="w-full" /></UFormField>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField
              label="Escala de importes"
              description="Si el banco exporta centavos enteros (por ejemplo, 162877000 para $1.628.770), elegí dividir por 100. Se aplica a importes y saldos del archivo; no cambia movimientos ya registrados."
            >
              <USelect v-model="amountScale" :items="amountScaleItems" value-key="value" class="w-full" />
            </UFormField>
          </div>

          <UAlert v-if="normalizedMapping.amount && (normalizedMapping.debit || normalizedMapping.credit)" color="warning" variant="subtle" icon="i-lucide-info" description="Elegí importe con signo o columnas separadas de débito/crédito; se usan estas últimas cuando están configuradas." />
          <UAlert v-if="!mappingIsValid" color="warning" variant="subtle" icon="i-lucide-list-filter" description="Para comparar se necesitan fecha, descripción y una columna de importe o débito/crédito." />

          <section v-if="mappingIsValid && activeWorkspaceTab === 'comparison'" class="space-y-3 rounded-xl border border-default p-4">
            <div>
              <h3 class="font-semibold">Saldo del extracto al cierre</h3>
              <p class="text-sm text-muted">La fecha y el saldo se completan desde la última fila del archivo cuando están disponibles. Si no mapeaste una columna de saldo, ingresá el saldo final que informa el banco.</p>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="Fecha de cierre" required><UInput v-model="statementDate" type="date" class="w-full" @update:model-value="statementDateManuallySet = true" /></UFormField>
              <UFormField label="Saldo final según el banco" required><UInput v-model="statementClosingBalanceInput" type="number" step="0.01" placeholder="0,00" class="w-full" @update:model-value="statementBalanceManuallySet = true" /></UFormField>
            </div>
            <div v-if="statementDate && closingBalance != null && systemBalanceAtDate != null" class="grid gap-3 sm:grid-cols-3">
              <UPageCard variant="subtle"><p class="text-xs text-muted">Saldo extracto · {{ statementDate }}</p><p class="text-xl font-semibold">{{ formatMoney(closingBalance) }}</p></UPageCard>
              <UPageCard variant="subtle"><p class="text-xs text-muted">Saldo sistema al cierre</p><p class="text-xl font-semibold">{{ formatMoney(systemBalanceAtDate) }}</p></UPageCard>
              <UPageCard variant="subtle" :class="Math.abs(closingBalanceDifference ?? 0) < 0.01 ? 'border-success/40' : 'border-warning/50'">
                <p class="text-xs text-muted">Diferencia · banco menos sistema</p>
                <p class="text-xl font-semibold" :class="Math.abs(closingBalanceDifference ?? 0) < 0.01 ? 'text-success' : 'text-warning'">{{ formatMoney(closingBalanceDifference) }}</p>
                <p class="text-xs text-muted">{{ Math.abs(closingBalanceDifference ?? 0) < 0.01 ? 'Los saldos coinciden' : 'Revisá movimientos omitidos, duplicados o con fecha incorrecta' }}</p>
              </UPageCard>
            </div>
            <UAlert v-else-if="statementDate && closingBalance != null" color="warning" variant="subtle" icon="i-lucide-circle-alert" description="No hay saldo histórico de la cuenta para la fecha elegida; revisá que la fecha y los movimientos cargados sean correctos." />
          </section>

          <UTabs v-if="mappingIsValid" v-model="activeWorkspaceTab" :items="workspaceTabItems" :content="false" variant="link" class="w-full" />
          <section v-if="mappingIsValid && activeWorkspaceTab === 'comparison' && statementDate && normalizedLines.length" class="grid gap-3 xl:grid-cols-3">
            <UPageCard variant="subtle">
              <template #header><div><p class="font-semibold">Totales del extracto</p><p class="text-xs text-muted">{{ statementMovementTotals.count }} movimientos · {{ statementPeriodStart }} a {{ statementDate }}</p></div></template>
              <div class="grid grid-cols-3 gap-2 text-sm">
                <div><p class="text-xs text-muted">Créditos</p><p class="font-semibold text-success">{{ formatMoney(statementMovementTotals.credits) }}</p></div>
                <div><p class="text-xs text-muted">Débitos</p><p class="font-semibold text-error">{{ formatMoney(statementMovementTotals.debits) }}</p></div>
                <div><p class="text-xs text-muted">Neto</p><p class="font-semibold">{{ formatMoney(statementMovementTotals.net) }}</p></div>
              </div>
            </UPageCard>
            <UPageCard variant="subtle">
              <template #header><div><p class="font-semibold">Totales en el sistema</p><p class="text-xs text-muted">{{ systemMovementTotals.count }} movimientos · mismo período</p></div></template>
              <div class="grid grid-cols-3 gap-2 text-sm">
                <div><p class="text-xs text-muted">Créditos</p><p class="font-semibold text-success">{{ formatMoney(systemMovementTotals.credits) }}</p></div>
                <div><p class="text-xs text-muted">Débitos</p><p class="font-semibold text-error">{{ formatMoney(systemMovementTotals.debits) }}</p></div>
                <div><p class="text-xs text-muted">Neto</p><p class="font-semibold">{{ formatMoney(systemMovementTotals.net) }}</p></div>
              </div>
            </UPageCard>
            <UPageCard variant="subtle" :class="Math.abs(movementTotalDifferences.net) < 0.01 ? 'border-success/40' : 'border-warning/50'">
              <template #header><div><p class="font-semibold">Diferencia · extracto menos sistema</p><p class="text-xs text-muted">Los importes se comparan en la moneda de la cuenta</p></div></template>
              <div class="grid grid-cols-3 gap-2 text-sm">
                <div><p class="text-xs text-muted">Créditos</p><p class="font-semibold">{{ formatMoney(movementTotalDifferences.credits) }}</p></div>
                <div><p class="text-xs text-muted">Débitos</p><p class="font-semibold">{{ formatMoney(movementTotalDifferences.debits) }}</p></div>
                <div><p class="text-xs text-muted">Neto</p><p class="font-semibold" :class="Math.abs(movementTotalDifferences.net) < 0.01 ? 'text-success' : 'text-warning'">{{ formatMoney(movementTotalDifferences.net) }}</p></div>
              </div>
            </UPageCard>
          </section>

          <div v-if="mappingIsValid && activeWorkspaceTab === 'comparison'" class="grid gap-3 sm:grid-cols-4">
            <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-primary" :class="comparisonFilter === 'all' ? 'border-primary bg-primary/5' : ''" :aria-pressed="comparisonFilter === 'all'" @click="comparisonFilter = 'all'"><span class="block text-xs text-muted">Movimientos comparados</span><span class="text-xl font-semibold">{{ summary.total }}</span></button>
            <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-success" :class="comparisonFilter === 'suggested' ? 'border-success bg-success/5' : ''" :aria-pressed="comparisonFilter === 'suggested'" @click="comparisonFilter = 'suggested'"><span class="block text-xs text-muted">Coincidencias</span><span class="text-xl font-semibold text-success">{{ summary.suggested }}</span></button>
            <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-warning" :class="comparisonFilter === 'pending' ? 'border-warning bg-warning/5' : ''" :aria-pressed="comparisonFilter === 'pending'" @click="comparisonFilter = 'pending'"><span class="block text-xs text-muted">Sin asociar / ambiguos</span><span class="text-xl font-semibold text-warning">{{ summary.pending }}</span></button>
            <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-error" :class="comparisonFilter === 'system_only' ? 'border-error bg-error/5' : ''" :aria-pressed="comparisonFilter === 'system_only'" @click="comparisonFilter = 'system_only'"><span class="block text-xs text-muted">Solo en el sistema</span><span class="text-xl font-semibold text-error">{{ summary.systemOnly }}</span></button>
            <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-warning sm:col-span-2 lg:col-span-1" :class="comparisonFilter === 'invalid' ? 'border-warning bg-warning/5' : ''" :aria-pressed="comparisonFilter === 'invalid'" @click="comparisonFilter = 'invalid'"><span class="block text-xs text-muted">Filas para corregir</span><span class="text-xl font-semibold text-warning">{{ summary.invalid }}</span></button>
          </div>

          <div v-if="mappingIsValid && activeWorkspaceTab === 'resolve' && ambiguousSuggestions.length" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div>
              <p class="font-medium">{{ ambiguousSuggestions.length }} movimientos tienen más de una coincidencia posible</p>
              <p class="text-sm text-muted">Revisalos en Comparación antes de registrar para evitar duplicados.</p>
            </div>
            <UButton label="Ver coincidencias ambiguas" icon="i-lucide-git-compare-arrows" variant="outline" @click="activeWorkspaceTab = 'comparison'; comparisonFilter = 'pending'" />
          </div>

          <section v-if="mappingIsValid && activeWorkspaceTab === 'resolve' && unmatchedSuggestions.length" class="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold">Asociar o registrar movimientos del extracto</h3>
                <p class="text-sm text-muted">Usá Resolver para pagos, cobros o cheques. Para comisiones, impuestos o rendimientos, elegí un concepto: se registran con la fecha y el importe del extracto.</p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <UCheckbox v-model="rememberConceptRules" label="Recordar conceptos por descripción y débito/crédito para sugerirlos en futuras cargas de esta cuenta" />
                  <UButton v-if="hasSavedConceptRules" size="xs" color="neutral" variant="ghost" icon="i-lucide-trash-2" label="Borrar sugerencias recordadas" @click="clearSavedConceptRules" />
                </div>
              </div>
              <div class="text-right text-sm text-muted">
                <p>{{ selectedSuggestions.length }} seleccionados · máximo 50</p>
                <p v-if="selectedRowsMissingConcept" class="text-warning">{{ selectedRowsMissingConcept }} sin concepto</p>
                <p v-if="selectedSuggestions.length && !bankAccountingAccountId" class="text-warning">Falta configurar la cuenta contable del banco para registrar.</p>
              </div>
            </div>

            <UAlert
              v-if="!importConceptOptions.length"
              color="warning"
              variant="subtle"
              icon="i-lucide-list-checks"
              description="No hay conceptos activos con cuenta contable y efecto en saldo. Configuralos en Conceptos bancarios antes de importar."
            />

            <div class="grid gap-3 rounded-lg border border-default bg-elevated/30 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <UFormField
                label="Concepto para selección rápida"
                description="Elegí un concepto y marcá varias filas: se les asigna automáticamente. Desmarcar una fila la saca del lote y borra su concepto."
              >
                <USelectMenu
                  v-model="quickConceptId"
                  v-model:open="quickConceptOpen"
                  :items="quickConceptOptions"
                  value-key="value"
                  searchable
                  clear
                  placeholder="Elegir concepto bancario"
                  class="w-full"
                  :disabled="!importConceptOptions.length"
                />
              </UFormField>
              <UButton
                label="Aplicar a los seleccionados"
                icon="i-lucide-list-checks"
                variant="outline"
                :disabled="!quickConceptId || !selectedSuggestions.length"
                @click="applyQuickConceptToSelectedRows"
              />
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="outline"
                  :label="allVisibleImportRowsSelected ? 'Quitar selección de esta página' : 'Seleccionar esta página'"
                  :disabled="!importPageSuggestions.length || !importConceptOptions.length"
                  @click="toggleVisibleImportRows"
                />
                <UButton
                  v-if="hasSavedConceptRules || hasSuggestedConceptRows"
                  size="xs"
                  color="primary"
                  variant="soft"
                  icon="i-lucide-list-checks"
                  label="Seleccionar hasta 50 con concepto sugerido"
                  :disabled="!importConceptOptions.length"
                  @click="selectRowsWithSuggestedConcept"
                />
              </div>
              <div class="flex items-center gap-2 text-sm text-muted">
                <span>Página {{ importPage + 1 }} de {{ importPageCount }}</span>
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-left" :disabled="importPage === 0" aria-label="Página anterior" @click="() => { importPage -= 1 }" />
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-right" :disabled="importPage + 1 >= importPageCount" aria-label="Página siguiente" @click="() => { importPage += 1 }" />
              </div>
            </div>

            <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
              <article v-for="suggestion in importPageSuggestions" :key="suggestion.line.rowNumber" class="space-y-3 rounded-lg border border-default bg-default/70 p-3">
                <div class="flex flex-wrap items-center gap-3">
                  <UCheckbox
                    :model-value="selectedImportRows.includes(suggestion.line.rowNumber)"
                    :disabled="!importConceptOptions.length"
                    :aria-label="`Seleccionar fila ${suggestion.line.rowNumber}`"
                    @update:model-value="value => toggleImportRow(suggestion.line.rowNumber, Boolean(value))"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-muted">Fila {{ suggestion.line.rowNumber }} · {{ suggestion.line.date }}<span v-if="suggestion.line.reference"> · Ref. {{ suggestion.line.reference }}</span></p>
                    <p class="truncate text-sm font-medium">{{ suggestion.line.description }}</p>
                    <p class="text-sm font-semibold tabular-nums" :class="(suggestion.line.amount ?? 0) < 0 ? 'text-error' : 'text-success'">{{ formatMoney(suggestion.line.amount) }} · {{ (suggestion.line.amount ?? 0) < 0 ? 'Débito' : 'Crédito' }}</p>
                  </div>
                  <UButton size="sm" icon="i-lucide-wand-sparkles" label="Resolver pago, cobro o cheque" variant="outline" @click="openResolution(suggestion)" />
                </div>
                <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:pl-8">
                  <USelectMenu
                    :model-value="getConceptForLine(suggestion.line)"
                    :items="conceptOptionsForLine(suggestion.line)"
                    :open="openConceptMenuRow === suggestion.line.rowNumber"
                    value-key="value"
                    searchable
                    clear
                    placeholder="Elegir concepto bancario"
                    class="w-full"
                    :disabled="!importConceptOptions.length"
                    @update:open="value => { openConceptMenuRow = value ? suggestion.line.rowNumber : null }"
                    @update:model-value="value => updateConceptForLine(suggestion.line, value)"
                  />
                  <p class="self-center text-xs text-muted">Al registrar se usan {{ suggestion.line.date }} y {{ formatMoney(suggestion.line.amount) }} del extracto.</p>
                </div>
              </article>
            </div>

            <p class="text-xs text-muted">Se usa la cotización oficial configurada para la fecha del movimiento cuando la cuenta no opera en la moneda base. Si volvés a importar el mismo archivo, las filas ya registradas no se duplican.</p>
          </section>

          <div v-if="mappingIsValid && activeWorkspaceTab === 'comparison'" class="space-y-2">
            <div class="flex flex-wrap items-end justify-between gap-2">
              <div><h3 class="font-semibold">Comparación de movimientos</h3><p class="text-sm text-muted">Cada fila muestra el importe y el saldo del extracto junto al saldo posterior del movimiento en el sistema.</p></div>
              <UButton v-if="comparisonFilter !== 'all'" size="xs" color="neutral" variant="ghost" label="Quitar filtro" @click="() => { comparisonFilter = 'all' }" />
            </div>
            <AsteriskTable
              :data="filteredComparisonRows"
              :columns="comparisonColumns"
              :loading="parsing"
              :get-row-id="(row: ComparisonTableRow) => row.id"
              :filter-fields="[{ id: 'description', label: 'Buscar movimiento...', class: 'w-56' }]"
              :sort-fields="[{ label: 'Fecha', value: 'date' }, { label: 'Importe', value: 'amount' }, { label: 'Saldo extracto', value: 'statementBalance' }]"
              :storage-key="`bank-statement-comparison-${accountId}`"
            />
            <p v-if="summary.total > filteredComparisonRows.length" class="text-xs text-muted">El filtro está mostrando {{ filteredComparisonRows.length }} de {{ summary.total }} filas.</p>
          </div>

          <section v-else-if="mappingIsValid && activeWorkspaceTab === 'resolve' && !unmatchedSuggestions.length && !ambiguousSuggestions.length" class="rounded-xl border border-success/25 bg-success/5 p-6 text-center">
            <UIcon name="i-lucide-circle-check" class="mx-auto mb-2 size-8 text-success" />
            <h3 class="font-semibold">No hay movimientos pendientes de resolver</h3>
            <p class="text-sm text-muted">Los movimientos del extracto ya tienen una coincidencia o no requieren una acción.</p>
          </section>

          <section v-else-if="mappingIsValid && activeWorkspaceTab === 'system'" class="space-y-4">
            <div class="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 class="font-semibold">Movimientos del sistema</h3>
                <p class="text-sm text-muted">{{ systemMovementRows.length }} movimientos cargados para {{ accountName }}. Filtrá por fecha, concepto o referencia; abrí el ojo para ver el detalle.</p>
              </div>
            </div>
            <AsteriskTable
              :data="systemMovementRows"
              :columns="systemMovementColumns"
              :loading="parsing"
              :get-row-id="(row: SystemMovementTableRow) => row.id"
              :filter-fields="[
                { id: 'description', label: 'Buscar concepto o descripción...', class: 'w-64' },
                { id: 'reference', label: 'Buscar referencia...', class: 'w-48' }
              ]"
              :sort-fields="[{ label: 'Fecha', value: 'date' }, { label: 'Importe', value: 'amount' }, { label: 'Saldo posterior', value: 'balance_after' }]"
              :storage-key="`bank-statement-system-movements-${accountId}`"
            />
          </section>

          <section v-else-if="mappingIsValid && activeWorkspaceTab === 'notes'" class="space-y-4 rounded-xl border border-default p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold">Notas de esta conciliación</h3>
                <p class="text-sm text-muted">Quedan asociadas a esta cuenta y a este archivo en este navegador. Podés descargarlas como texto o incluirlas en el Excel de comparación.</p>
              </div>
              <UBadge v-if="notesDirty" color="warning" variant="subtle">Cambios sin guardar</UBadge>
              <UBadge v-else-if="reconciliationNotesSavedAt" color="success" variant="subtle">Guardadas</UBadge>
            </div>
            <UTextarea
              v-model="reconciliationNotes"
              :rows="12"
              :maxlength="20000"
              resize
              placeholder="Anotá diferencias, comprobantes pendientes, consultas al banco o decisiones para continuar después..."
              aria-label="Notas de la conciliación bancaria"
              class="w-full"
            />
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-1 text-xs text-muted">
                <p>{{ reconciliationNotes.length.toLocaleString('es-AR') }} / 20.000 caracteres</p>
                <p v-if="reconciliationNotesSavedAt">Último guardado: {{ new Date(reconciliationNotesSavedAt).toLocaleString('es-AR') }}</p>
                <p v-if="reconciliationNotesMessage">{{ reconciliationNotesMessage }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton label="Guardar notas" icon="i-lucide-save" :disabled="!notesDirty" @click="saveReconciliationNotes" />
                <UButton label="Descargar notas .txt" icon="i-lucide-download" variant="outline" :disabled="!reconciliationNotes.trim()" @click="downloadReconciliationNotes" />
              </div>
            </div>
          </section>
        </section>

        <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-4">
          <UButton v-if="activeWorkspaceTab === 'comparison' && mappingIsValid && summary.total" label="Exportar conciliación a Excel" icon="i-lucide-file-spreadsheet" @click="exportComparison" />
          <UButton
            v-if="activeWorkspaceTab === 'resolve' && mappingIsValid && unmatchedSuggestions.length"
            label="Registrar conceptos seleccionados"
            icon="i-lucide-file-check-2"
            :loading="importing"
            :disabled="!bankAccountingAccountId || !selectedSuggestions.length || selectedSuggestions.length > 50 || selectedRowsMissingConcept > 0"
            @click="registerSelectedMovements"
          />
        </div>
      </div>
  </div>

  <UModal v-model:open="resolutionOpen" :title="`Resolver movimiento · ${resolutionPaymentType === 'COLLECTION' ? 'Cobro' : 'Pago'}`" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div v-if="activeResolution" class="space-y-5">
        <div class="grid gap-3 rounded-xl border border-default bg-elevated/30 p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">Fecha · fila {{ activeResolution.line.rowNumber }}</p>
            <p class="font-medium">{{ activeResolution.line.date }}</p>
            <p class="mt-1 text-sm">{{ activeResolution.line.description }}</p>
            <p v-if="activeResolution.line.reference" class="text-xs text-muted">Referencia {{ activeResolution.line.reference }}</p>
          </div>
          <div class="sm:text-right">
            <p class="text-xs text-muted">Importe bancario · {{ currencyCode }}</p>
            <p class="text-xl font-semibold tabular-nums" :class="resolutionIsCollection ? 'text-success' : 'text-error'">{{ formatMoney(activeResolution.line.amount) }}</p>
            <p class="text-xs text-muted">{{ accountName }}</p>
          </div>
        </div>

        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-scale"
          title="Revisá el importe antes de confirmar"
          description="El importe del extracto es el impacto neto en el banco. Retenciones o gastos pueden hacer que difiera del total aplicado a la factura. El borrador de una transferencia impacta al confirmarlo; con cheque, el movimiento bancario se registra después al depositarlo o debitarlo."
        />

        <section class="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div>
            <h3 class="font-semibold">Pago/cobro asociado a un comprobante</h3>
            <p class="text-sm text-muted">En la pantalla que se abre, seleccioná una factura pendiente o creá el comprobante desde el formulario. Después guardá el borrador y confirmalo.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton :label="resolutionIsCollection ? 'Asociar cobro a factura' : 'Asociar pago a factura'" icon="i-lucide-file-text" @click="openPaymentFlow({ paymentMode: 'NORMAL' })" />
            <UButton label="Registrar como anticipo (sin factura)" icon="i-lucide-hand-coins" color="neutral" variant="outline" @click="openPaymentFlow({ paymentMode: 'ADVANCE' })" />
          </div>
        </section>

        <section class="space-y-3 rounded-xl border border-default p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold">Resolver como cheque</h3>
              <p class="text-sm text-muted">El cheque debe coincidir con el importe, moneda y sentido. El impacto directo requiere un pago/cobro confirmado asociado.</p>
            </div>
            <UButton size="sm" icon="i-lucide-plus" label="Abrir pago/cobro para crear un cheque" variant="outline" @click="openPaymentFlow({ paymentMode: 'NORMAL', paymentMethod: 'CHECK' })" />
          </div>

          <div v-if="loadingResolutionChecks" class="flex items-center gap-2 py-3 text-sm text-muted"><UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> Buscando cheques compatibles…</div>
          <UAlert v-else-if="!resolutionCheckCandidates.length" color="neutral" variant="subtle" icon="i-lucide-search" description="No hay cheques registrados con este importe, moneda y sentido. Podés crear uno desde el pago/cobro o elegir el concepto bancario correspondiente." />
          <div v-else class="max-h-64 space-y-2 overflow-y-auto pr-1">
            <article v-for="check in resolutionCheckCandidates" :key="check.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-3">
              <div class="min-w-0">
                <p class="font-medium">Cheque N.º {{ check.check_number }} · {{ check.bank_name }}</p>
                <p class="text-xs text-muted">{{ check.is_own ? 'Propio' : 'De terceros' }} · {{ check.status }} · vence {{ formatDetailDate(check.due_date) }} · {{ formatDetailCurrency(check.available_amount ?? check.amount, check.currency_code) }}</p>
                <p v-if="relatedPaymentsFor(check).length" class="text-xs text-muted">
                  Asociado a {{ relatedPaymentsFor(check).map(payment => `#${payment.number} · ${payment.status}`).join(', ') }}
                </p>
                <p v-else class="text-xs text-muted">Todavía no está vinculado a un pago/cobro.</p>
                <p v-if="!canImpactCheck(check) && !canLinkCheckToPayment(check)" class="mt-1 text-xs text-warning">{{ checkNotReadyReason(check) }}</p>
              </div>
              <UButton
                v-if="canImpactCheck(check)"
                size="sm"
                :loading="impactingCheckId === check.id"
                :disabled="Boolean(impactingCheckId)"
                :label="resolutionIsCollection ? 'Depositar en este banco' : 'Registrar débito en este banco'"
                icon="i-lucide-landmark"
                @click="impactMatchedCheck(check)"
              />
              <UButton
                v-else-if="relatedPaymentsFor(check).length"
                size="sm"
                variant="outline"
                label="Abrir pago/cobro asociado"
                icon="i-lucide-arrow-up-right"
                @click="openRelatedPayment(check)"
              />
              <UButton
                v-else-if="canLinkCheckToPayment(check)"
                size="sm"
                variant="outline"
                label="Vincular a pago/cobro con comprobante"
                icon="i-lucide-link"
                @click="openPaymentFlow({ paymentMode: 'NORMAL', paymentMethod: 'CHECK', check })"
              />
            </article>
          </div>
        </section>

        <UAlert color="info" variant="subtle" icon="i-lucide-book-open-check" title="Comisión, impuesto o ajuste bancario" description="Para estos casos, cerrá este panel, elegí el concepto contable en la fila y usá Registrar conceptos seleccionados. Esa acción crea el movimiento y su asiento una sola vez." />
      </div>
    </template>
  </UModal>

  <UModal v-model:open="movementDetailsOpen" title="Detalle del movimiento bancario" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div v-if="movementDetailsLoading" class="flex min-h-40 items-center justify-center gap-3 text-sm text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" /> Cargando información relacionada…
      </div>
      <div v-else-if="selectedMovementDetails" class="space-y-5">
        <section class="grid gap-3 rounded-xl border border-default bg-elevated/40 p-4 sm:grid-cols-3">
          <div><p class="text-xs text-muted">Movimiento</p><div class="flex flex-wrap items-center gap-2"><UBadge :color="getMovementTypeBadge(selectedMovementDetails).color as any" variant="subtle">{{ getMovementTypeBadge(selectedMovementDetails).label }}</UBadge><UBadge v-if="selectedMovementDetails.intercompany_source_company" color="info" variant="soft">Origen: {{ selectedMovementDetails.intercompany_source_company.name }}</UBadge><UBadge v-if="selectedMovementDetails.deleted_at" color="error" variant="subtle">Anulado</UBadge></div></div>
          <div><p class="text-xs text-muted">Fecha de operación</p><p class="font-medium">{{ formatDetailDate(selectedMovementDetails.date) }}</p></div>
          <div><p class="text-xs text-muted">Importe</p><p class="font-semibold" :class="getMovementSignedAmount(selectedMovementDetails) >= 0 ? 'text-success' : 'text-error'">{{ formatDetailCurrency(Math.abs(getMovementSignedAmount(selectedMovementDetails)), selectedMovementDetails.currency_code) }}</p></div>
          <div><p class="text-xs text-muted">Saldo anterior</p><p class="font-medium">{{ formatDetailCurrency(selectedMovementDetails.balance_before, selectedMovementDetails.currency_code) }}</p></div>
          <div><p class="text-xs text-muted">Saldo posterior</p><p class="font-medium">{{ formatDetailCurrency(selectedMovementDetails.balance_after, selectedMovementDetails.currency_code) }}</p></div>
          <div><p class="text-xs text-muted">Referencia</p><p class="font-medium break-all">{{ selectedMovementDetails.reference || '—' }}</p></div>
          <div><p class="text-xs text-muted">Fecha efectiva</p><p class="font-medium">{{ formatDetailDate(selectedMovementDetails.effective_date) }}</p></div>
          <div><p class="text-xs text-muted">Concepto bancario</p><p class="font-medium">{{ selectedMovementDetails.concept_name_snapshot || selectedMovementDetails.bank_concept?.name || '—' }}</p></div>
          <div><p class="text-xs text-muted">Origen relacionado</p><p class="font-medium break-all">{{ selectedMovementDetails.reference_type || selectedMovementDetails.type }}<span v-if="selectedMovementDetails.reference_id"> · {{ selectedMovementDetails.reference_id }}</span></p><NuxtLink v-if="!selectedMovementDetails.payment && selectedMovementDetails.payment_id" :to="`/erp/treasury/payments/${selectedMovementDetails.payment_id}`" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">Abrir pago o cobro <UIcon name="i-lucide-external-link" class="size-3.5" /></NuxtLink></div>
          <p v-if="selectedMovementDetails.description" class="text-sm text-muted sm:col-span-3">{{ selectedMovementDetails.description }}</p>
        </section>

        <section v-if="selectedMovementDetails.payment" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <NuxtLink :to="`/erp/treasury/payments/${selectedMovementDetails.payment.id}`" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <h4>{{ selectedMovementDetails.payment.type === 'COLLECTION' ? 'Cobro' : selectedMovementDetails.payment.type === 'PAYMENT' ? 'Pago' : 'Gasto' }} #{{ selectedMovementDetails.payment.number }}</h4>
              <UIcon name="i-lucide-external-link" class="size-4 shrink-0" />
            </NuxtLink>
            <UBadge color="neutral" variant="subtle">{{ movementStatusLabels[selectedMovementDetails.payment.status] || selectedMovementDetails.payment.status }}</UBadge>
          </div>
          <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p class="text-xs text-muted">Cliente / proveedor</p><p class="font-medium">{{ selectedMovementDetails.payment.party?.name || '—' }}</p><p v-if="selectedMovementDetails.payment.party?.tax_id" class="text-xs text-muted">CUIT {{ selectedMovementDetails.payment.party.tax_id }}</p></div>
            <div><p class="text-xs text-muted">Medio de pago</p><p class="font-medium">{{ paymentMethodLabels[selectedMovementDetails.payment.payment_method] || selectedMovementDetails.payment.payment_method }}</p></div>
            <div><p class="text-xs text-muted">Fecha del pago</p><p class="font-medium">{{ formatDetailDate(selectedMovementDetails.payment.payment_date || selectedMovementDetails.payment.date) }}</p></div>
            <div><p class="text-xs text-muted">Importe del pago / cobro</p><p class="font-medium">{{ formatDetailCurrency(selectedMovementDetails.payment.amount, selectedMovementDetails.payment.currency_code) }}</p></div>
            <div v-if="selectedMovementDetails.payment.reference"><p class="text-xs text-muted">Referencia</p><p class="font-medium">{{ selectedMovementDetails.payment.reference }}</p></div>
            <div v-if="selectedMovementDetails.payment.exchange_rate"><p class="text-xs text-muted">Cotización aplicada</p><p class="font-medium">{{ selectedMovementDetails.payment.exchange_rate }}</p></div>
            <p v-if="selectedMovementDetails.payment.description" class="text-sm text-muted sm:col-span-2">{{ selectedMovementDetails.payment.description }}</p>
          </div>
          <div v-if="selectedMovementDetails.payment.documents.length" class="space-y-2">
            <h5 class="text-sm font-medium">Comprobantes aplicados</h5>
            <div v-for="application in selectedMovementDetails.payment.documents" :key="application.id" class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-default px-3 py-2 text-sm">
              <NuxtLink :to="paymentDocumentPath(selectedMovementDetails.payment.type, application.document.id)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
                {{ application.document.document_types.description }} {{ application.document.number }} · {{ formatDetailDate(application.document.date) }}
                <UIcon name="i-lucide-external-link" class="size-3.5 shrink-0" />
              </NuxtLink>
              <span class="font-medium">Aplicado {{ formatDetailCurrency(application.amount_applied, application.document.currency_code || selectedMovementDetails.payment.currency_code) }}</span>
            </div>
          </div>
        </section>

        <section v-if="movementChecks.length" class="space-y-2">
          <h4 class="font-semibold">Cheques asociados</h4>
          <article v-for="item in movementChecks" :key="item.check.id" class="grid gap-3 rounded-xl border border-info/25 bg-info/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p class="text-xs text-muted">Cheque {{ item.check.is_own ? 'propio' : 'de terceros' }}</p><p class="font-semibold">N.º {{ item.check.check_number }}</p></div>
            <div><p class="text-xs text-muted">Banco emisor</p><p class="font-medium">{{ item.check.bank_name }}</p></div>
            <div><p class="text-xs text-muted">Emisor</p><p class="font-medium">{{ item.check.issuer_name }}</p><p v-if="item.check.issuer_id" class="text-xs text-muted">{{ item.check.issuer_id }}</p></div>
            <div><p class="text-xs text-muted">Estado</p><p class="font-medium">{{ movementStatusLabels[item.check.status] || item.check.status }}</p></div>
            <div><p class="text-xs text-muted">Importe del cheque</p><p class="font-medium">{{ formatDetailCurrency(item.check.amount, item.check.currency_code) }}</p></div>
            <div v-if="item.amountApplied != null"><p class="text-xs text-muted">Aplicado a este pago</p><p class="font-medium">{{ formatDetailCurrency(item.amountApplied, item.check.currency_code) }}</p></div>
            <div><p class="text-xs text-muted">Emisión / vencimiento</p><p class="font-medium">{{ formatDetailDate(item.check.issue_date) }} / {{ formatDetailDate(item.check.due_date) }}</p></div>
            <div><p class="text-xs text-muted">Depósito / acreditación</p><p class="font-medium">{{ formatDetailDate(item.check.deposit_date) }} / {{ formatDetailDate(item.check.clearing_date) }}</p></div>
          </article>
        </section>

        <section v-if="selectedMovementDetails.operation || selectedMovementDetails.charge" class="space-y-3">
          <h4 class="font-semibold">Desglose bancario</h4>
          <div v-if="selectedMovementDetails.operation" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Tipo de operación</p><p class="font-medium">{{ selectedMovementDetails.operation.operation_type }}</p></div>
            <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Importe bruto</p><p class="font-semibold">{{ formatDetailCurrency(selectedMovementDetails.operation.gross_amount) }}</p></div>
            <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Comisiones / cargos</p><p class="font-semibold">{{ formatDetailCurrency(selectedMovementDetails.operation.charges_amount) }}</p></div>
            <div class="rounded-lg border border-default p-3"><p class="text-xs text-muted">Retenciones / neto</p><p class="font-semibold">{{ formatDetailCurrency(selectedMovementDetails.operation.retentions_amount) }} / {{ formatDetailCurrency(selectedMovementDetails.operation.net_amount) }}</p></div>
          </div>
          <div v-if="selectedMovementDetails.charge" class="rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm">
            {{ selectedMovementDetails.charge.concept_name_snapshot || 'Cargo bancario' }}: base {{ formatDetailCurrency(selectedMovementDetails.charge.base_amount) }} · impuesto {{ formatDetailCurrency(selectedMovementDetails.charge.tax_amount) }} · total {{ formatDetailCurrency(selectedMovementDetails.charge.total_amount) }}
            <span v-if="selectedMovementDetails.charge.certificate_number"> · Certificado {{ selectedMovementDetails.charge.certificate_number }}</span>
          </div>
        </section>

        <section v-if="selectedMovementDetails.accounting_entry" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2"><h4 class="font-semibold">Asiento contable</h4><UBadge :color="selectedMovementDetails.accounting_entry.reversed_at ? 'warning' : 'success'" variant="subtle">{{ selectedMovementDetails.accounting_entry.reversed_at ? 'Revertido' : 'Activo' }}</UBadge></div>
          <p class="text-sm text-muted">{{ formatDetailDate(selectedMovementDetails.accounting_entry.entry_date) }} · {{ selectedMovementDetails.accounting_entry.description }}</p>
          <div v-for="line in selectedMovementDetails.accounting_entry.lines" :key="line.id" class="grid gap-2 rounded-lg border border-default px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_9rem_9rem] sm:items-center">
            <span class="min-w-0"><strong>{{ line.account.code }}</strong> · {{ line.account.name }}</span>
            <span class="text-muted">Debe {{ formatDetailCurrency(line.debit, line.currency_code) }}</span>
            <span class="text-muted">Haber {{ formatDetailCurrency(line.credit, line.currency_code) }}</span>
          </div>
        </section>
      </div>
      <div v-else class="py-8 text-center text-sm text-muted">No hay información adicional para este movimiento.</div>
    </template>
  </UModal>
</template>
