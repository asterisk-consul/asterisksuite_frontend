import type { BankAccount, BankAccountMovement } from './types/bank-accounts.types'
import { getMovementSignedAmount, getMovementTypeBadge } from './movement-columns'

export const BANK_MOVEMENT_TYPE_GUIDE = [
  { code: 'OPENING_BALANCE', label: 'Saldo inicial', meaning: 'Importe de apertura registrado al iniciar la cuenta.', usualNature: 'Crédito, aunque la naturaleza guardada define el efecto.' },
  { code: 'DEPOSIT', label: 'Depósito', meaning: 'Ingreso de fondos en la cuenta bancaria.', usualNature: 'Crédito.' },
  { code: 'WITHDRAWAL', label: 'Retiro', meaning: 'Salida o retiro de fondos de la cuenta.', usualNature: 'Débito.' },
  { code: 'TRANSFER', label: 'Transferencia', meaning: 'Movimiento recibido o enviado por transferencia. Puede ser una transferencia interna o externa.', usualNature: 'Débito o crédito según el sentido.' },
  { code: 'PAYMENT', label: 'Pago', meaning: 'Pago registrado desde la cuenta bancaria.', usualNature: 'Débito.' },
  { code: 'COLLECTION', label: 'Cobro', meaning: 'Cobro acreditado en la cuenta bancaria.', usualNature: 'Crédito.' },
  { code: 'CHECK_ISSUED', label: 'Cheque emitido', meaning: 'Débito relacionado con un cheque propio emitido.', usualNature: 'Débito.' },
  { code: 'CHECK_RECEIVED', label: 'Cheque recibido', meaning: 'Crédito relacionado con la acreditación de un cheque recibido.', usualNature: 'Crédito.' },
  { code: 'FEE', label: 'Comisión / cargo', meaning: 'Comisión u otro cargo bancario. El concepto detalla qué se cobró.', usualNature: 'Habitualmente débito; revisar el movimiento.' },
  { code: 'INTEREST', label: 'Interés', meaning: 'Interés cobrado o acreditado por el banco.', usualNature: 'Débito o crédito según el caso.' },
  { code: 'TAX', label: 'Impuesto bancario', meaning: 'Impuesto o percepción informado como movimiento de la cuenta.', usualNature: 'Habitualmente débito; revisar el movimiento.' },
  { code: 'RETENTION', label: 'Retención bancaria', meaning: 'Retención practicada o informada por el banco. Consultá el concepto y su comprobante.', usualNature: 'Según la naturaleza del movimiento y el concepto.' },
  { code: 'ADJUSTMENT', label: 'Ajuste', meaning: 'Corrección o ajuste bancario que requiere revisar su descripción y respaldo.', usualNature: 'Débito o crédito según el caso.' },
  { code: 'DEBIT', label: 'Débito genérico (histórico)', meaning: 'Tipo genérico que puede aparecer en datos anteriores; no identifica por sí solo el motivo.', usualNature: 'Débito.' },
  { code: 'CREDIT', label: 'Crédito genérico (histórico)', meaning: 'Tipo genérico que puede aparecer en datos anteriores; no identifica por sí solo el origen.', usualNature: 'Crédito.' },
  { code: 'Reversión de pago', label: 'Reversión de pago', meaning: 'Etiqueta descriptiva de una reversión vinculada a un pago; no es un código de tipo independiente.', usualNature: 'Revisar el signo del importe.' },
  { code: 'Constitución / Rescate / vencimiento', label: 'Movimiento de inversión', meaning: 'Etiqueta descriptiva para fondos enviados a una inversión o recibidos por rescate/vencimiento; no es un código de tipo independiente.', usualNature: 'Débito al constituir; crédito al rescatar o vencer.' },
  { code: 'DEBIT (naturaleza)', label: 'Naturaleza: débito', meaning: 'Reduce el saldo de esta cuenta. Es distinta del tipo de movimiento.', usualNature: 'Resta del saldo.' },
  { code: 'CREDIT (naturaleza)', label: 'Naturaleza: crédito', meaning: 'Aumenta el saldo de esta cuenta. Es distinta del tipo de movimiento.', usualNature: 'Suma al saldo.' }
]

const dateLabel = (value?: string | null) => {
  if (!value) return ''
  const part = value.slice(0, 10)
  const [year, month, day] = part.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export async function exportBankMovementsWorkbook(
  account: BankAccount,
  movements: BankAccountMovement[]
) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const movementRows = movements.map((movement) => {
    const signedAmount = getMovementSignedAmount(movement)
    const type = getMovementTypeBadge(movement)
    return {
      Fecha: dateLabel(movement.date),
      Tipo: type.label,
      'Código de tipo': movement.type,
      Naturaleza: movement.nature ?? (signedAmount < 0 ? 'DEBIT' : 'CREDIT'),
      'Concepto bancario': movement.concept_name_snapshot ?? movement.bank_concept?.name ?? '',
      Descripción: movement.description ?? '',
      Referencia: movement.reference ?? '',
      Moneda: movement.currency_code,
      Importe: signedAmount,
      'Saldo anterior': Number(movement.balance_before),
      Saldo: Number(movement.balance_after)
    }
  })

  const movementsSheet = XLSX.utils.json_to_sheet(movementRows)
  movementsSheet['!cols'] = [
    { wch: 13 }, { wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 28 },
    { wch: 40 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 18 }
  ]
  XLSX.utils.book_append_sheet(workbook, movementsSheet, 'Movimientos')

  const guideSheet = XLSX.utils.json_to_sheet(BANK_MOVEMENT_TYPE_GUIDE.map((item) => ({
    'Código / etiqueta': item.code,
    'Nombre en español': item.label,
    'Qué significa': item.meaning,
    'Efecto habitual': item.usualNature
  })))
  guideSheet['!cols'] = [{ wch: 34 }, { wch: 32 }, { wch: 88 }, { wch: 54 }]
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guía de tipos')

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['Extracto de movimientos bancarios'],
    ['Cuenta', `${account.bank_name} · ${account.name}`],
    ['Moneda', account.currency_code],
    ['Alcance', 'Se exportaron los movimientos operativos del historial de esta cuenta. Los anulados se incluyen si estaba activada la opción Mostrar anulados.'],
    ['Importe', 'Los importes se expresan desde la perspectiva de esta cuenta: los débitos son negativos y los créditos positivos.'],
    ['Tipo y naturaleza', 'El tipo describe el origen o clase del movimiento. La naturaleza indica si el saldo de la cuenta disminuye (DEBIT) o aumenta (CREDIT).'],
    ['Transferencias', 'Una transferencia puede ser débito o crédito. Revisá siempre la naturaleza y el signo del importe.'],
    ['Conciliación', 'Este archivo es una exportación informativa; editarlo no modifica los movimientos ni el saldo en Asterisk Suite.']
  ])
  instructionsSheet['!cols'] = [{ wch: 24 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones')

  const safeName = account.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  XLSX.writeFile(workbook, `movimientos-bancarios-${safeName || 'cuenta'}.xlsx`)
}
