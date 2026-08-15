<script setup lang="ts">
const props = defineProps<{
  type: 'sale' | 'purchase'
  number: string
  date: string
  company: { name: string; tax_id?: string; address?: string; phone?: string; iva_condition?: string }
  customer: { name: string; tax_id?: string; address?: string; iva_condition?: string }
  items: { code: string; description: string; quantity: number; unit_price: number; total: number }[]
  totals?: { subtotal: number; total: number }
  observations?: string
  point_of_sale?: string
  document?: any
}>()

const formattedNumber = computed(() => {
  const pv = String(props.point_of_sale ?? '0001').padStart(4, '0')
  const nro = String(props.number).padStart(8, '0')
  return `${pv}-${nro}`
})

const valeType = computed(() => {
  const t = props.document?.ref
  const map: Record<string, string> = {
    SUELDO: 'Sueldo',
    ADELANTO: 'Adelanto de Sueldo',
    EXTRAS: 'Bonuses / Horas Extras / Comisiones',
    RETIRO: 'Retiro de Socio',
    APORTE: 'Aporte de Capital',
    REEMBOLSO: 'Reembolso de Gastos',
    PRESTAMO: 'Préstamo',
  }
  return map[t] ?? t ?? '—'
})

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}
</script>

<template>
  <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; max-width: 210mm; margin: 0 auto;">

    <!-- HEADER: Empresa + Tipo -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="width: 45%; vertical-align: top; padding-right: 16px;">
          <div style="font-size: 16px; font-weight: 700;">{{ company.name }}</div>
          <div style="font-size: 11px; color: #555; margin-top: 4px;">
            <div>CUIT: {{ company.tax_id ?? '—' }}</div>
            <div v-if="company.address">{{ company.address }}</div>
            <div v-if="company.phone">Tel: {{ company.phone }}</div>
          </div>
        </td>
        <td style="width: 10%; text-align: center; vertical-align: top;">
          <div style="border: 2px solid #111; border-radius: 6px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin: 0 auto;">
            VALE
          </div>
        </td>
        <td style="width: 45%; vertical-align: top; text-align: right;">
          <div style="font-size: 16px; font-weight: 700; color: #111;">RECIBO DE SUELDO / VALE</div>
          <div style="font-size: 11px; margin-top: 6px;">
            <div>Punto de Venta: <strong>{{ point_of_sale ?? '0001' }}</strong></div>
            <div>Comp. Número: <strong>{{ formattedNumber }}</strong></div>
            <div>Fecha: {{ date }}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- DATOS DEL BENEFICIARIO -->
    <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #f5f5f5;">
        <td colspan="4" style="padding: 6px 10px; font-weight: 600; font-size: 11px; border-bottom: 1px solid #ddd;">
          DATOS DEL BENEFICIARIO
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">Nombre</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px; font-weight: 600;">{{ customer.name || '—' }}</td>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">CUIT/DNI</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px;">{{ customer.tax_id || '—' }}</td>
      </tr>
    </table>

    <!-- DETALLE DEL VALE -->
    <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #f5f5f5;">
        <td colspan="4" style="padding: 6px 10px; font-weight: 600; font-size: 11px; border-bottom: 1px solid #ddd;">
          DETALLE
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 25%; font-size: 11px; color: #555;">Concepto</td>
        <td style="padding: 6px 10px; width: 75%; font-size: 11px; font-weight: 600;">{{ valeType }}</td>
      </tr>
      <tr v-if="observations">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Descripción</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ observations }}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 25%; font-size: 11px; color: #555;">Monto</td>
        <td style="padding: 6px 10px; font-size: 16px; font-weight: 700; color: #111;">{{ fmt(totals?.total ?? 0) }}</td>
      </tr>
    </table>

    <!-- FIRMA -->
    <table style="width: 100%; margin-top: 50px; border-top: 1px solid #ddd;">
      <tr>
        <td style="width: 50%; padding-top: 30px;">
          <div style="border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px;">
            Firma del Beneficiario
          </div>
        </td>
        <td style="width: 50%; padding-top: 30px;">
          <div style="border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px;">
            Aclaración
          </div>
        </td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div style="text-align: center; margin-top: 30px; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 10px;">
      {{ company.name }} — {{ company.address }}
    </div>
  </div>
</template>
