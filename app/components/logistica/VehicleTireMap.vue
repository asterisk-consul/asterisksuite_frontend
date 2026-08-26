<script setup lang="ts">
interface TirePosition {
  id: string
  position_number: number
  axle: number
  side: 'LEFT' | 'RIGHT'
  position_type?: string | null
  tires: Array<{
    id: string
    serial_number: string
    product?: { name: string } | null
    accumulated_km?: number | null
    status?: string
  }>
}

interface Props {
  vehicleType: 'CAMION' | 'SEMI'
  positions: TirePosition[]
  axleCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  axleCount: 2,
})

const emit = defineEmits<{
  tireClick: [tireId: string]
  positionClick: [positionId: string]
}>()

interface TireSlot {
  positionId: string
  positionNumber: number
  axle: number
  side: string
  tire: TirePosition['tires'][0] | null
  x: number
  y: number
}

const svgWidth = 820
const svgHeight = 320

const bodyY = 40
const bodyHeight = 140
const wheelY = 220
const wheelRadius = 28
const wheelGap = 8

const tireSlots = computed<TireSlot[]>(() => {
  const slots: TireSlot[] = []
  const sorted = [...props.positions].sort((a, b) => a.position_number - b.position_number)

  if (props.vehicleType === 'CAMION') {
    const frontAxleStart = 80
    const rearAxleStart = props.axleCount === 2 ? 480 : 400
    const rearAxleSpacing = props.axleCount === 2 ? 100 : 90

    for (const pos of sorted) {
      const isFront = pos.axle === 1
      const rearIndex = pos.axle - 2
      const axleX = isFront ? frontAxleStart : rearAxleStart + rearIndex * rearAxleSpacing

      const sideOffset = pos.side === 'LEFT' ? -wheelRadius - wheelGap / 2 : wheelGap / 2
      const x = axleX + sideOffset
      const y = wheelY

      slots.push({
        positionId: pos.id,
        positionNumber: pos.position_number,
        axle: pos.axle,
        side: pos.side,
        tire: pos.tires?.[0] ?? null,
        x,
        y,
      })
    }
  } else {
    const firstAxleX = 160
    const axleSpacing = 100

    for (const pos of sorted) {
      const rearIndex = pos.axle - 1
      const axleX = firstAxleX + rearIndex * axleSpacing

      const sideOffset = pos.side === 'LEFT' ? -wheelRadius - wheelGap / 2 : wheelGap / 2
      const x = axleX + sideOffset
      const y = wheelY

      slots.push({
        positionId: pos.id,
        positionNumber: pos.position_number,
        axle: pos.axle,
        side: pos.side,
        tire: pos.tires?.[0] ?? null,
        x,
        y,
      })
    }
  }

  return slots
})

function tireColor(slot: TireSlot): string {
  if (!slot.tire) return '#d1d5db'
  switch (slot.tire.status) {
    case 'INSTALLED': return '#22c55e'
    case 'IN_REPAIR': return '#eab308'
    case 'SCRAPPED': return '#ef4444'
    default: return '#d1d5db'
  }
}

function tireStroke(slot: TireSlot): string {
  if (!slot.tire) return '#9ca3af'
  return '#1f2937'
}

function axleLabelY(): number {
  return wheelY + wheelRadius + 24
}
</script>

<template>
  <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" class="w-full max-w-3xl mx-auto" xmlns="http://www.w3.org/2000/svg">
    <!-- ═══ VEHICLE BODY ═══ -->
    <g v-if="vehicleType === 'CAMION'">
      <!-- Cab -->
      <rect x="20" :y="bodyY" width="140" :height="bodyHeight" rx="12" fill="#475569" />
      <rect x="28" :y="bodyY + 16" width="48" height="40" rx="6" fill="#93c5fd" opacity="0.7" />
      <rect x="28" :y="bodyY + 64" width="48" height="24" rx="4" fill="#64748b" />
      <!-- Exhaust -->
      <rect x="16" :y="bodyY + 100" width="8" height="30" rx="3" fill="#6b7280" />
      <!-- Cargo body -->
      <rect x="180" :y="bodyY" :width="axleCount === 2 ? 560 : 520" :height="bodyHeight" rx="8" fill="#334155" />
      <rect x="188" :y="bodyY + 8" :width="axleCount === 2 ? 544 : 504" :height="bodyHeight - 16" rx="4" fill="#1e293b" />
      <!-- Cargo lines -->
      <line v-for="i in 6" :key="i" :x1="188 + i * (axleCount === 2 ? 90 : 84)" :y1="bodyY + 12" :x2="188 + i * (axleCount === 2 ? 90 : 84)" :y2="bodyY + bodyHeight - 12" stroke="#334155" stroke-width="1.5" />
      <!-- Coupling area -->
      <rect x="155" :y="bodyY + bodyHeight - 30" width="28" height="30" rx="4" fill="#475569" />
    </g>

    <g v-else>
      <!-- Semi trailer body -->
      <rect x="20" :y="bodyY" width="760" :height="bodyHeight" rx="8" fill="#334155" />
      <rect x="28" :y="bodyY + 8" width="744" :height="bodyHeight - 16" rx="4" fill="#1e293b" />
      <!-- Cargo lines -->
      <line v-for="i in 9" :key="i" :x1="28 + i * 82" :y1="bodyY + 12" :x2="28 + i * 82" :y2="bodyY + bodyHeight - 12" stroke="#334155" stroke-width="1.5" />
      <!-- Kingpin area -->
      <rect x="60" :y="bodyY + bodyHeight" width="40" height="16" rx="4" fill="#475569" />
      <!-- Front support legs -->
      <rect x="80" :y="bodyY + bodyHeight" width="8" height="20" rx="2" fill="#6b7280" />
    </g>

    <!-- ═══ CHASSIS LINE ═══ -->
    <line x1="20" :y1="wheelY - wheelRadius - 10" :x2="vehicleType === 'CAMION' ? 740 : 780" :y2="wheelY - wheelRadius - 10" stroke="#64748b" stroke-width="3" />

    <!-- ═══ AXLE LINES ═══ -->
    <template v-if="vehicleType === 'CAMION'">
      <line v-for="axle in axleCount" :key="`axle-${axle}`"
        :x1="axle === 1 ? 80 : 480 + (axle - 2) * 100"
        :y1="wheelY - wheelRadius - 8"
        :x2="axle === 1 ? 80 : 480 + (axle - 2) * 100"
        :y2="wheelY - wheelRadius + 2"
        stroke="#94a3b8" stroke-width="2" />
    </template>
    <template v-else>
      <line v-for="axle in axleCount" :key="`axle-${axle}`"
        :x1="160 + (axle - 1) * 100"
        :y1="wheelY - wheelRadius - 8"
        :x2="160 + (axle - 1) * 100"
        :y2="wheelY - wheelRadius + 2"
        stroke="#94a3b8" stroke-width="2" />
    </template>

    <!-- ═══ TIRES ═══ -->
    <g v-for="slot in tireSlots" :key="slot.positionId">
      <!-- Tire shadow -->
      <circle :cx="slot.x" :cy="slot.y + 3" :r="wheelRadius" fill="rgba(0,0,0,0.15)" />

      <!-- Tire body -->
      <circle
        :cx="slot.x"
        :cy="slot.y"
        :r="wheelRadius"
        :fill="tireColor(slot)"
        :stroke="tireStroke(slot)"
        stroke-width="2.5"
        class="cursor-pointer transition-all duration-200 hover:stroke-[3px] hover:brightness-110"
        @click="slot.tire ? emit('tireClick', slot.tire.id) : emit('positionClick', slot.positionId)"
      />

      <!-- Tire inner hub -->
      <circle :cx="slot.x" :cy="slot.y" :r="wheelRadius * 0.35" fill="#374151" stroke="#1f2937" stroke-width="1" />

      <!-- Tire hub dots -->
      <circle v-for="d in 4" :key="d"
        :cx="slot.x + Math.cos((d * Math.PI) / 2) * wheelRadius * 0.22"
        :cy="slot.y + Math.sin((d * Math.PI) / 2) * wheelRadius * 0.22"
        r="2" fill="#6b7280" />

      <!-- Empty position indicator -->
      <g v-if="!slot.tire">
        <line :x1="slot.x - 8" :y1="slot.y - 8" :x2="slot.x + 8" :y2="slot.y + 8" stroke="#9ca3af" stroke-width="2" />
        <line :x1="slot.x + 8" :y1="slot.y - 8" :x2="slot.x - 8" :y2="slot.y + 8" stroke="#9ca3af" stroke-width="2" />
      </g>

      <!-- Tire serial text -->
      <text v-if="slot.tire" :x="slot.x" :y="slot.y + 1" text-anchor="middle" dominant-baseline="middle"
        font-size="7" font-weight="bold" fill="white" class="pointer-events-none select-none">
        {{ slot.tire.serial_number?.slice(-4) ?? '' }}
      </text>

      <!-- Position label -->
      <text :x="slot.x" :y="slot.y + wheelRadius + 14" text-anchor="middle"
        font-size="8" fill="#94a3b8" class="pointer-events-none select-none">
        {{ slot.side === 'LEFT' ? 'Izq' : 'Der' }}
      </text>
    </g>

    <!-- ═══ AXLE LABELS ═══ -->
    <template v-if="vehicleType === 'CAMION'">
      <text :x="80" :y="axleLabelY()" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">
        Eje 1 (Dirección)
      </text>
      <text v-for="rear in axleCount - 1" :key="`rear-label-${rear}`"
        :x="480 + (rear - 1) * 100" :y="axleLabelY()" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">
        Eje {{ rear + 1 }} (Trasero)
      </text>
    </template>
    <template v-else>
      <text v-for="axle in axleCount" :key="`axle-label-${axle}`"
        :x="160 + (axle - 1) * 100" :y="axleLabelY()" text-anchor="middle" font-size="10" fill="#64748b" font-weight="500">
        Eje {{ axle }}
      </text>
    </template>

    <!-- ═══ DIRECTION ARROW ═══ -->
    <g v-if="vehicleType === 'CAMION'" transform="translate(14, 160)">
      <polygon points="0,-8 12,0 0,8" fill="#64748b" />
      <text x="16" y="4" font-size="8" fill="#64748b">Frente</text>
    </g>
  </svg>
</template>
