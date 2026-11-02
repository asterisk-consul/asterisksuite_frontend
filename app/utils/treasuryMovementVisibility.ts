interface TreasuryMovementVisibilityInput {
  reference_type?: string | null
  reference_id?: string | null
  payment?: { status?: string | null } | null
}

const reversalToOriginalType: Record<string, string> = {
  payment_reversal: 'payment',
  payment_rejection: 'payment',
  hr_vale_cancellation: 'hr_vale'
}

const cancelledPaymentStatuses = new Set(['CANCELLED', 'REVERSED'])

export function partitionCancelledTreasuryMovements<T extends TreasuryMovementVisibilityInput>(movements: T[]) {
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
