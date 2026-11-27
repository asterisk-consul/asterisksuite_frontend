export type CanonicalVatCondition =
  | 'RESPONSABLE_INSCRIPTO'
  | 'MONOTRIBUTO'
  | 'CONSUMIDOR_FINAL'
  | 'EXENTO'

const VAT_CONDITION_ALIASES: Record<string, CanonicalVatCondition> = {
  RI: 'RESPONSABLE_INSCRIPTO',
  RESPONSABLE_INSCRIPTO: 'RESPONSABLE_INSCRIPTO',
  'RESPONSABLE INSCRIPTO': 'RESPONSABLE_INSCRIPTO',
  MONO: 'MONOTRIBUTO',
  MONOTRIBUTO: 'MONOTRIBUTO',
  CF: 'CONSUMIDOR_FINAL',
  CONSUMIDOR_FINAL: 'CONSUMIDOR_FINAL',
  'CONSUMIDOR FINAL': 'CONSUMIDOR_FINAL',
  EX: 'EXENTO',
  EXENTO: 'EXENTO',
}

/** Normaliza las abreviaturas históricas usadas por el formulario fiscal. */
export function normalizeVatCondition(value?: string | null): CanonicalVatCondition | null {
  if (!value) return null
  return VAT_CONDITION_ALIASES[value.trim().toUpperCase()] ?? null
}
