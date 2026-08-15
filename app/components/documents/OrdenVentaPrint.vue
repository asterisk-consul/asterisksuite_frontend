<script setup lang="ts">
const props = defineProps<{
  type: 'sale' | 'purchase'
  number: string
  date: string
  company: { name: string; tax_id?: string; address?: string; phone?: string; iva_condition?: string }
  customer: { name: string; tax_id?: string; address?: string; iva_condition?: string; sale_condition?: string }
  items: { code: string; description: string; quantity: number; unit_price: number; total: number }[]
  totals: { subtotal: number; taxes: { name: string; amount: number }[]; total: number }
  observations?: string
  point_of_sale?: string
  document?: any
}>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const formattedNumber = computed(() => {
  const pv = String(props.point_of_sale ?? '0001').padStart(4, '0')
  const nro = String(props.number).padStart(8, '0')
  return `${pv}-${nro}`
})

const ov = computed(() => props.document?.orden_venta_doc)
</script>

<template>
  <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; max-width: 210mm; margin: 0 auto;">

    <!-- BLOQUE 1: HEADER -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="width: 45%; vertical-align: top; padding-right: 16px;">
          <div style="font-size: 16px; font-weight: 700;">{{ company.name }}</div>
          <div style="font-size: 11px; color: #555; margin-top: 4px;">
            <div>CUIT: {{ company.tax_id ?? '—' }}</div>
            <div>Condición: {{ company.iva_condition ?? '—' }}</div>
            <div v-if="company.address">{{ company.address }}</div>
            <div v-if="company.phone">Tel: {{ company.phone }}</div>
          </div>
        </td>
        <td style="width: 10%; text-align: center; vertical-align: top;">
          <div style="border: 2px solid #111; border-radius: 6px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; margin: 0 auto;">
            OV
          </div>
        </td>
        <td style="width: 45%; vertical-align: top; text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">ORDEN DE VENTA</div>
          <div style="font-size: 11px; margin-top: 6px;">
            <div>Punto de Venta: <strong>{{ point_of_sale ?? '0001' }}</strong></div>
            <div>Comp. Número: <strong>{{ formattedNumber }}</strong></div>
            <div>Fecha: {{ date }}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- BLOQUE 2: CLIENTE + ENTREGA -->
    <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #f5f5f5;">
        <td colspan="4" style="padding: 6px 10px; font-weight: 600; font-size: 11px; border-bottom: 1px solid #ddd;">
          CLIENTE Y ENTREGA
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">Cliente</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px; font-weight: 600;">{{ customer.name || '—' }}</td>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">CUIT/DNI</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px;">{{ customer.tax_id || '—' }}</td>
      </tr>
      <tr v-if="ov?.delivery_address">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Dirección entrega</td>
        <td colspan="3" style="padding: 6px 10px; font-size: 11px;">{{ ov.delivery_address }}</td>
      </tr>
      <tr v-if="ov?.delivery_contact">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Contacto</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ ov.delivery_contact }}</td>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Teléfono</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ ov.delivery_phone || '—' }}</td>
      </tr>
      <tr v-if="ov?.confirmed_delivery_date">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Fecha comprometida</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ ov.confirmed_delivery_date }}</td>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Transporte</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ ov.transport_provider || '—' }}</td>
      </tr>
      <tr v-if="ov?.priority">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Prioridad</td>
        <td colspan="3" style="padding: 6px 10px; font-size: 11px;">{{ ov.priority }}</td>
      </tr>
      <tr v-if="ov?.seller">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Vendedor</td>
        <td style="padding: 6px 10px; font-size: 11px; font-weight: 600;">{{ ov.seller.first_name }} {{ ov.seller.last_name }}</td>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Comisión</td>
        <td style="padding: 6px 10px; font-size: 11px;">
          {{ ov.commission_rate }}%
          <template v-if="ov.commission_rate && document?.subtotal">
            — {{ fmt(Number(document.subtotal) * Number(ov.commission_rate) / 100) }}
          </template>
        </td>
      </tr>
    </table>

    <!-- BLOQUE 3: ITEMS -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #111; color: #fff;">
          <th style="padding: 6px 10px; text-align: left; font-size: 11px; width: 15%;">Código</th>
          <th style="padding: 6px 10px; text-align: left; font-size: 11px; width: 40%;">Descripción</th>
          <th style="padding: 6px 10px; text-align: center; font-size: 11px; width: 10%;">Cant.</th>
          <th style="padding: 6px 10px; text-align: right; font-size: 11px; width: 17%;">P. Unitario</th>
          <th style="padding: 6px 10px; text-align: right; font-size: 11px; width: 18%;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in items" :key="i" :style="{ background: i % 2 === 1 ? '#fafafa' : '#fff' }">
          <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.code }}</td>
          <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.description }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: center; border-bottom: 1px solid #eee;">{{ item.quantity }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(item.unit_price) }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee; font-weight: 600;">{{ fmt(item.total) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- BLOQUE 4: INSTRUCCIONES + TOTALES -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="width: 58%; vertical-align: top; padding-right: 16px;">
          <div v-if="ov?.delivery_instructions" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px;">
            <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px;">INSTRUCCIONES DE ENTREGA</div>
            <div style="font-size: 11px; white-space: pre-wrap;">{{ ov.delivery_instructions }}</div>
          </div>
          <div v-if="observations" style="border: 1px solid #ddd; padding: 10px;">
            <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px;">OBSERVACIONES</div>
            <div style="font-size: 11px; white-space: pre-wrap;">{{ observations }}</div>
          </div>
        </td>
        <td style="width: 42%; vertical-align: top;">
          <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #eee;">Subtotal</td>
              <td style="padding: 6px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(totals.subtotal) }}</td>
            </tr>
            <tr v-for="tax in totals.taxes" :key="tax.name">
              <td style="padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ tax.name }}</td>
              <td style="padding: 6px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(tax.amount) }}</td>
            </tr>
            <tr style="background: #111; color: #fff;">
              <td style="padding: 8px 10px; font-size: 13px; font-weight: 700;">TOTAL</td>
              <td style="padding: 8px 10px; font-size: 13px; font-weight: 700; text-align: right;">{{ fmt(totals.total) }}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- FIRMA -->
    <table style="width: 100%; margin-top: 30px;">
      <tr>
        <td style="width: 50%; text-align: center; padding-top: 40px; border-top: 1px solid #111;">
          <div style="font-size: 11px;">Firma y aclaración</div>
        </td>
        <td style="width: 50%; text-align: center; padding-top: 40px; border-top: 1px solid #111;">
          <div style="font-size: 11px;">Recv. conformidad</div>
        </td>
      </tr>
    </table>
  </div>
</template>
