<script setup lang="ts">
import type { BankAccountMovement } from '~/modulos/erp/bank-accounts/types/bank-accounts.types'
import { BANK_MOVEMENT_TYPE_GUIDE } from '~/modulos/erp/bank-accounts/movement-spreadsheet'
import { getMovementSignedAmount, getMovementTypeBadge } from '~/modulos/erp/bank-accounts/movement-columns'

interface Props {
  accountId: string
  accountName: string
  currencyCode: string
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
}

const props = defineProps<Props>()
const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const headers = ref<string[]>([])
const sourceRows = ref<unknown[][]>([])
const parsing = ref(false)
const errorMessage = ref('')
const headerRowNumber = ref(1)
const savedProfile = ref(false)
const mapping = reactive<ColumnMapping>({ date: '', description: '', amount: '', debit: '', credit: '', direction: '', reference: '', balance: '' })

const fieldOptions = computed(() => [
  { label: 'No usar', value: '' },
  ...headers.value.map((header) => ({ label: header, value: header }))
])

const mappingIsValid = computed(() => Boolean(
  mapping.date
  && mapping.description
  && (mapping.amount || mapping.debit || mapping.credit)
))

const normalizedLines = computed<StatementLine[]>(() => sourceRows.value.map((row, index) => {
  const valueFor = (column: string) => {
    const columnIndex = headers.value.indexOf(column)
    return columnIndex < 0 ? '' : row[columnIndex]
  }
  const date = parseDate(valueFor(mapping.date))
  const description = String(valueFor(mapping.description) ?? '').trim()
  const reference = String(valueFor(mapping.reference) ?? '').trim()
  const balance = mapping.balance ? parseAmount(valueFor(mapping.balance)) : null
  let amount: number | null = null
  let issue: string | undefined

  if (mapping.debit || mapping.credit) {
    const debit = mapping.debit ? parseAmount(valueFor(mapping.debit)) : 0
    const credit = mapping.credit ? parseAmount(valueFor(mapping.credit)) : 0
    if (debit == null || credit == null) issue = 'No se pudo interpretar débito/crédito'
    else if (debit !== 0 && credit !== 0) issue = 'La fila tiene importe en débito y crédito'
    else amount = debit !== 0 ? -Math.abs(debit) : Math.abs(credit)
  } else {
    amount = parseAmount(valueFor(mapping.amount))
    if (amount == null) issue = 'No se pudo interpretar el importe'
    else if (amount >= 0) {
      const direction = parseDirection(valueFor(mapping.direction))
      if (direction === 'DEBIT') amount = -Math.abs(amount)
      if (direction === 'CREDIT') amount = Math.abs(amount)
    }
  }

  if (!date) issue = issue ?? 'Falta una fecha válida'
  if (!description) issue = issue ?? 'Falta una descripción'
  if (amount === 0) issue = issue ?? 'El importe es cero'
  return { rowNumber: headerRowNumber.value + index + 1, date, description, reference, amount, balance, issue }
}).filter((line) => line.date || line.description || line.amount != null || line.reference))

const suggestions = computed<ReconciliationSuggestion[]>(() => {
  const usedMovementIds = new Set<string>()
  return normalizedLines.value.map((line) => {
    if (line.issue || line.amount == null || !line.date) {
      return { line, status: 'invalid', candidateCount: 0 }
    }

    const normalizedReference = normalizeText(line.reference)
    const matches = props.movements
      .filter((movement) => {
        if (usedMovementIds.has(movement.id)) return false
        const signedAmount = getMovementSignedAmount(movement)
        if (Math.abs(signedAmount - line.amount!) > 0.01) return false
        const movementDate = parseDate(movement.date)
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
    if (tied) return { line, status: 'ambiguous', candidateCount: matches.length }

    usedMovementIds.add(best.movement.id)
    return { line, status: 'suggested', movement: best.movement, candidateCount: matches.length }
  })
})

const summary = computed(() => ({
  total: suggestions.value.length,
  suggested: suggestions.value.filter((item) => item.status === 'suggested').length,
  pending: suggestions.value.filter((item) => item.status === 'unmatched' || item.status === 'ambiguous').length,
  invalid: suggestions.value.filter((item) => item.status === 'invalid').length
}))

const previewSuggestions = computed(() => suggestions.value.slice(0, 40))

watch(open, (isOpen) => {
  if (!isOpen) reset()
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
  mapping.balance = firstMatchingHeader(allHeaders, ['saldo', 'balance'])
  savedProfile.value = false
}

async function handleFileSelection(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMessage.value = ''
  sourceRows.value = []
  headers.value = []
  fileName.value = ''
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = 'El archivo supera 10 MB. Exportá un período más corto para continuar.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  parsing.value = true
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
    if (!sheet) throw new Error('El archivo no contiene una hoja para leer.')

    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true, blankrows: false })
    let bestHeaderIndex = -1
    let bestScore = 0
    for (let index = 0; index < Math.min(allRows.length, 30); index += 1) {
      const rowHeaders = (allRows[index] ?? []).map((cell) => String(cell ?? '').trim())
      const date = firstMatchingHeader(rowHeaders, ['fecha', 'date'])
      const description = firstMatchingHeader(rowHeaders, ['descripcion', 'concepto', 'detalle', 'description', 'movement'])
      const amount = firstMatchingHeader(rowHeaders, ['importe', 'monto', 'amount', 'debito', 'debit', 'credito', 'credit'])
      const score = Number(Boolean(date)) + Number(Boolean(description)) + Number(Boolean(amount))
      if (score > bestScore) {
        bestScore = score
        bestHeaderIndex = index
      }
    }
    if (bestHeaderIndex < 0 || bestScore < 2) throw new Error('No pude detectar los encabezados. El archivo debe incluir al menos fecha y descripción.')

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
    localStorage.setItem(profileKey, JSON.stringify(mapping))
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

function formatMoney(amount: number | null) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: props.currencyCode, maximumFractionDigits: 2 }).format(amount)
}

async function exportComparison() {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const statementSheet = XLSX.utils.json_to_sheet(suggestions.value.map(({ line, status, movement, candidateCount }) => ({
    Fila: line.rowNumber,
    Fecha: line.date,
    Descripción: line.description,
    Referencia: line.reference,
    Importe: line.amount,
    'Saldo extracto': line.balance ?? '',
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

  const safeName = props.accountName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  XLSX.writeFile(workbook, `comparacion-bancaria-${safeName || 'cuenta'}.xlsx`)
}

function reset() {
  fileName.value = ''
  headers.value = []
  sourceRows.value = []
  errorMessage.value = ''
  savedProfile.value = false
  Object.assign(mapping, { date: '', description: '', amount: '', debit: '', credit: '', direction: '', reference: '', balance: '' })
}
</script>

<template>
  <UModal v-model:open="open" title="Importar extracto bancario" :ui="{ content: 'sm:max-w-5xl' }">
    <template #body>
      <div class="space-y-5">
        <UAlert
          color="info"
          variant="subtle"
          icon="i-lucide-shield-check"
          title="Importación de revisión"
          :description="`El archivo se compara en ${currencyCode} con los movimientos de esta cuenta. Esta vista no agrega movimientos ni modifica el saldo.`"
        />

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-4">
          <div>
            <p class="font-medium">{{ accountName }}</p>
            <p class="text-sm text-muted">{{ currencyCode }} · CSV o Excel de cualquier banco</p>
            <p v-if="fileName" class="mt-1 text-xs text-muted">Archivo: {{ fileName }}</p>
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

          <UAlert v-if="mapping.amount && (mapping.debit || mapping.credit)" color="warning" variant="subtle" icon="i-lucide-info" description="Elegí importe con signo o columnas separadas de débito/crédito; se usan estas últimas cuando están configuradas." />
          <UAlert v-if="!mappingIsValid" color="warning" variant="subtle" icon="i-lucide-list-filter" description="Para comparar se necesitan fecha, descripción y una columna de importe o débito/crédito." />

          <div v-if="mappingIsValid" class="grid gap-3 sm:grid-cols-4">
            <UPageCard variant="subtle"><p class="text-xs text-muted">Filas leídas</p><p class="text-xl font-semibold">{{ summary.total }}</p></UPageCard>
            <UPageCard variant="subtle"><p class="text-xs text-muted">Coincidencias sugeridas</p><p class="text-xl font-semibold text-success">{{ summary.suggested }}</p></UPageCard>
            <UPageCard variant="subtle"><p class="text-xs text-muted">Pendientes</p><p class="text-xl font-semibold">{{ summary.pending }}</p></UPageCard>
            <UPageCard variant="subtle"><p class="text-xs text-muted">Filas para revisar</p><p class="text-xl font-semibold text-warning">{{ summary.invalid }}</p></UPageCard>
          </div>

          <div v-if="mappingIsValid" class="space-y-2">
            <h3 class="font-semibold">Vista previa de comparación <span class="text-sm font-normal text-muted">(primeras {{ previewSuggestions.length }} filas)</span></h3>
            <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
              <article v-for="suggestion in previewSuggestions" :key="suggestion.line.rowNumber" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-default p-3">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-muted">Fila {{ suggestion.line.rowNumber }} · {{ suggestion.line.date || 'sin fecha' }}</span>
                    <UBadge :color="statusColor(suggestion.status) as any" variant="subtle">{{ statusLabel(suggestion.status) }}</UBadge>
                  </div>
                  <p class="mt-1 truncate text-sm font-medium">{{ suggestion.line.description || suggestion.line.issue }}</p>
                  <p v-if="suggestion.movement" class="mt-1 text-xs text-muted">{{ getMovementTypeBadge(suggestion.movement).label }} · {{ suggestion.movement.description || suggestion.movement.reference || 'Movimiento existente' }}</p>
                  <p v-else-if="suggestion.status === 'ambiguous'" class="mt-1 text-xs text-warning">Hay {{ suggestion.candidateCount }} movimientos posibles; requiere revisión manual.</p>
                </div>
                <span class="font-semibold tabular-nums" :class="(suggestion.line.amount ?? 0) < 0 ? 'text-error' : 'text-success'">{{ formatMoney(suggestion.line.amount) }}</span>
              </article>
            </div>
            <p v-if="summary.total > previewSuggestions.length" class="text-xs text-muted">El reporte Excel incluirá las {{ summary.total }} filas.</p>
          </div>
        </section>

        <div class="flex flex-wrap justify-end gap-2 border-t border-default pt-4">
          <UButton label="Cerrar" color="neutral" variant="ghost" @click="open = false" />
          <UButton v-if="mappingIsValid && summary.total" label="Exportar comparación y guía" icon="i-lucide-file-spreadsheet" @click="exportComparison" />
        </div>
      </div>
    </template>
  </UModal>
</template>
