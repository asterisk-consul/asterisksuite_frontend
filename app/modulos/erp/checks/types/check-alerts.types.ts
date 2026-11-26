export type CheckAlertKind = 'third-party' | 'own' | 'upcoming'
export type CheckAlertTone = 'warning' | 'primary' | 'info'
export interface CheckAlertTotal { currency_code: string; amount: number }

export interface CheckAlertCard {
  id: CheckAlertKind
  title: string
  count: number
  totals?: CheckAlertTotal[]
  description: string
  actionLabel: string
  icon: string
  tone: CheckAlertTone
}
