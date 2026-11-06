export const BADGE_COLORS = ['success', 'neutral', 'error', 'primary', 'secondary', 'info', 'warning'] as const

export type BadgeColor = (typeof BADGE_COLORS)[number]
