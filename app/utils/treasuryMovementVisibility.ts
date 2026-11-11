interface TreasuryMovementVisibilityInput {
  id?: string | null
  reference_type?: string | null
  reference_id?: string | null
  created_at?: string | Date | null
  payment?: { status?: string | null } | null
}

const reversalToOriginalType: Record<string, string> = {
  payment_reversal: 'payment',
  payment_rejection: 'payment',
  hr_vale_cancellation: 'hr_vale'
}

const cancelledPaymentStatuses = new Set(['CANCELLED', 'REVERSED'])

export function partitionCancelledTreasuryMovements<T extends TreasuryMovementVisibilityInput>(movements: T[]) {
  const checkLifecycleById = new Map<string, T[]>()

  for (const movement of movements) {
    if (!['check', 'check_reversal'].includes(movement.reference_type ?? '') || !movement.reference_id) continue
    const lifecycle = checkLifecycleById.get(movement.reference_id) ?? []
    lifecycle.push(movement)
    checkLifecycleById.set(movement.reference_id, lifecycle)
  }

  const finalCheckMovementIds = new Map<string, string | null>()
  for (const [checkId, lifecycle] of checkLifecycleById) {
    const reversals = lifecycle.filter(movement => movement.reference_type === 'check_reversal')
    if (!reversals.length) continue

    const lastEvent = [...lifecycle].sort((left, right) => {
      const leftCreatedAt = left.created_at instanceof Date
        ? left.created_at.getTime()
        : Date.parse(left.created_at ?? '') || 0
      const rightCreatedAt = right.created_at instanceof Date
        ? right.created_at.getTime()
        : Date.parse(right.created_at ?? '') || 0

      return leftCreatedAt - rightCreatedAt || String(left.id ?? '').localeCompare(String(right.id ?? ''))
    }).at(-1)

    finalCheckMovementIds.set(
      checkId,
      lastEvent?.reference_type === 'check' ? lastEvent.id ?? null : null
    )
  }

  const cancelledOriginalKeys = new Set(
    movements.flatMap((movement) => {
      const originalType = reversalToOriginalType[movement.reference_type ?? '']
      return originalType && movement.reference_id
        ? [`${originalType}:${movement.reference_id}`]
        : []
    })
  )

  const isCancelled = (movement: T) => {
    const referenceType = movement.reference_type ?? ''
    if (referenceType === 'check_reversal') return true
    if (referenceType === 'check' && movement.reference_id && finalCheckMovementIds.has(movement.reference_id)) {
      return finalCheckMovementIds.get(movement.reference_id) !== (movement.id ?? null)
    }
    if (referenceType in reversalToOriginalType) return true
    if (cancelledPaymentStatuses.has(movement.payment?.status ?? '')) return true
    return Boolean(
      movement.reference_id
      && cancelledOriginalKeys.has(`${referenceType}:${movement.reference_id}`)
    )
  }

  return {
    active: movements.filter(movement => !isCancelled(movement)),
    cancelled: movements.filter(isCancelled)
  }
}
