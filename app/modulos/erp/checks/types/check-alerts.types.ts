export type CheckAlertKind = 'third-party' | 'own' | 'upcoming'
export type CheckAlertTone = 'warning' | 'primary' | 'info'

export interface CheckAlertCard {
  id: CheckAlertKind
  title: string
  count: number
  description: string
  actionLabel: string
  icon: string
  tone: CheckAlertTone
}
