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
  printTemplate?: any
}>()

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0)
}

const formattedNumber = computed(() => {
  const pv = String(props.point_of_sale ?? '0001').padStart(4, '0')
  const nro = String(props.number).padStart(8, '0')
  return `${pv}-${nro}`
})

const doc = computed(() => props.document?.presupuesto_doc)
const config = computed(() => props.printTemplate?.config ?? {})
const title = computed(() => props.printTemplate?.title || 'PRESUPUESTO')
const showCode = computed(() => config.value.show_code !== false)
const showUnitPrice = computed(() => config.value.show_unit_price !== false)
const showTaxes = computed(() => config.value.show_taxes !== false)
const showSignature = computed(() => config.value.show_signature !== false)
const depositPercentage = computed(() => Number(config.value.deposit_percentage ?? 0))
const depositAmount = computed(() => props.totals.total * depositPercentage.value / 100)
const remainingAfterDeposit = computed(() => Math.max(0, props.totals.total - depositAmount.value))
function blockOrder(block: string, fallback: number) {
  const index = Array.isArray(config.value.blocks) ? config.value.blocks.indexOf(block) : -1
  return index >= 0 ? index + 1 : fallback
}
</script>

<template>
  <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; max-width: 210mm; margin: 0 auto; display: flex; flex-direction: column;">

    <!-- BLOQUE 1: HEADER -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <!-- Empresa -->
        <td style="width: 45%; vertical-align: top; padding-right: 16px;">
          <div style="font-size: 16px; font-weight: 700;">{{ company.name }}</div>
          <div style="font-size: 11px; color: #555; margin-top: 4px;">
            <div>CUIT: {{ company.tax_id ?? '—' }}</div>
            <div>Condición: {{ company.iva_condition ?? '—' }}</div>
            <div v-if="company.address">{{ company.address }}</div>
            <div v-if="company.phone">Tel: {{ company.phone }}</div>
          </div>
        </td>

        <!-- Tipo comprobante -->
        <td style="width: 10%; text-align: center; vertical-align: top;">
          <div style="border: 2px solid #111; border-radius: 6px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; margin: 0 auto;">
            PRES
          </div>
        </td>

        <!-- Datos comprobante -->
        <td style="width: 45%; vertical-align: top; text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">{{ title }}</div>
          <div style="font-size: 11px; margin-top: 6px;">
            <div>Punto de Venta: <strong>{{ point_of_sale ?? '0001' }}</strong></div>
            <div>Comp. Número: <strong>{{ formattedNumber }}</strong></div>
            <div>Fecha de emisión: {{ date }}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- BLOQUE 2: CLIENTE -->
    <table :style="{ order: blockOrder('customer', 1) }" style="width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #f5f5f5;">
        <td colspan="4" style="padding: 6px 10px; font-weight: 600; font-size: 11px; border-bottom: 1px solid #ddd;">
          DATOS DEL CLIENTE
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 25%; font-size: 11px; color: #555;">Razón Social</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px; font-weight: 600;">{{ customer.name || '—' }}</td>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">CUIT/DNI</td>
        <td style="padding: 6px 10px; width: 25%; font-size: 11px;">{{ customer.tax_id || '—' }}</td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Cond. IVA</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ customer.iva_condition || '—' }}</td>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Cond. Venta</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ customer.sale_condition || 'Contado' }}</td>
      </tr>
    </table>

    <!-- BLOQUE 3: ITEMS -->
    <table :style="{ order: blockOrder('items', 2) }" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #111; color: #fff;">
          <th v-if="showCode" style="padding: 6px 10px; text-align: left; font-size: 11px; width: 15%;">Código</th>
          <th style="padding: 6px 10px; text-align: left; font-size: 11px; width: 40%;">Descripción</th>
          <th style="padding: 6px 10px; text-align: center; font-size: 11px; width: 10%;">Cant.</th>
          <th v-if="showUnitPrice" style="padding: 6px 10px; text-align: right; font-size: 11px; width: 17%;">P. Unitario</th>
          <th style="padding: 6px 10px; text-align: right; font-size: 11px; width: 18%;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in items" :key="i" :style="{ background: i % 2 === 1 ? '#fafafa' : '#fff' }">
          <td v-if="showCode" style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.code }}</td>
          <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.description }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: center; border-bottom: 1px solid #eee;">{{ item.quantity }}</td>
          <td v-if="showUnitPrice" style="padding: 5px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(item.unit_price) }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee; font-weight: 600;">{{ fmt(item.total) }}</td>
        </tr>
        <tr v-if="items.length === 0">
          <td :colspan="3 + Number(showCode) + Number(showUnitPrice)" style="padding: 10px; text-align: center; color: #999; font-size: 11px;">Sin ítems</td>
        </tr>
      </tbody>
    </table>

    <!-- BLOQUE 4: OBSERVACIONES + TOTALES -->
    <table :style="{ order: blockOrder('totals', 5) }" style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <!-- Observaciones -->
        <td style="width: 58%; vertical-align: top; padding-right: 16px;">
          <div style="border: 1px solid #ddd; padding: 10px; min-height: 100px;">
            <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px;">OBSERVACIONES</div>
            <div style="font-size: 11px; white-space: pre-wrap;">{{ observations || 'Sin observaciones' }}</div>

            <div v-if="doc?.warranty_info" style="margin-top: 10px;">
              <div style="font-weight: 600; font-size: 11px;">Garantía:</div>
              <div style="font-size: 11px;">{{ doc.warranty_info }}</div>
            </div>

            <div v-if="doc?.exclusions" style="margin-top: 10px;">
              <div style="font-weight: 600; font-size: 11px;">Exclusiones:</div>
              <div style="font-size: 11px;">{{ doc.exclusions }}</div>
            </div>

            <div v-if="doc?.validity_date" style="margin-top: 10px;">
              <div style="font-weight: 600; font-size: 11px;">Validez:</div>
              <div style="font-size: 11px;">Presupuesto válido hasta el {{ doc.validity_date }}</div>
            </div>
          </div>
        </td>

        <!-- Totales -->
        <td style="width: 42%; vertical-align: top;">
          <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #eee;">Subtotal</td>
              <td style="padding: 6px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(totals.subtotal) }}</td>
            </tr>
            <tr v-for="tax in (showTaxes ? totals.taxes : [])" :key="tax.name">
              <td style="padding: 6px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ tax.name }}</td>
              <td style="padding: 6px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid #eee;">{{ fmt(tax.amount) }}</td>
            </tr>
            <tr v-if="config.show_deposit && depositPercentage > 0">
              <td style="padding: 7px 10px; font-size: 11px; font-weight: 600;">Seña requerida ({{ depositPercentage }}%)</td>
              <td style="padding: 7px 10px; font-size: 11px; font-weight: 600; text-align: right;">{{ fmt(depositAmount) }}</td>
            </tr>
            <tr style="background: #111; color: #fff;">
              <td style="padding: 8px 10px; font-size: 13px; font-weight: 700;">TOTAL</td>
              <td style="padding: 8px 10px; font-size: 13px; font-weight: 700; text-align: right;">{{ fmt(totals.total) }}</td>
            </tr>
            <tr v-if="config.show_deposit && config.deduct_deposit_from_total && depositPercentage > 0" style="background: #f3f4f6;">
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 700;">SALDO DESPUÉS DE LA SEÑA</td>
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 700; text-align: right;">{{ fmt(remainingAfterDeposit) }}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <div v-if="doc?.product_specifications || config.specifications_text" :style="{ order: blockOrder('specifications', 3) }" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px; text-transform: uppercase;">{{ config.specifications_title || 'Especificaciones de productos' }}</div>
      <div style="font-size: 10px; white-space: pre-wrap;">{{ doc?.product_specifications || config.specifications_text }}</div>
    </div>

    <div v-if="config.transport_text || config.currency_note" :style="{ order: blockOrder('commercial_terms', 4) }" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 16px;">
      <div v-if="config.transport_text" style="font-size: 10px; white-space: pre-wrap;">{{ config.transport_text }}</div>
      <div v-if="config.currency_note" style="font-size: 10px; font-weight: 600; white-space: pre-wrap; margin-top: 6px;">{{ config.currency_note }}</div>
    </div>

    <!-- BLOQUE 5: TÉRMINOS Y CONDICIONES -->
    <div v-if="doc?.terms_and_conditions" :style="{ order: blockOrder('commercial_terms', 4) }" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px;">TÉRMINOS Y CONDICIONES</div>
      <div style="font-size: 10px; white-space: pre-wrap;">{{ doc.terms_and_conditions }}</div>
    </div>

    <!-- BLOQUE 6: FIRMA -->
    <table v-if="showSignature" :style="{ order: blockOrder('signatures', 6) }" style="width: 100%; margin-top: 30px;">
      <tr>
        <td style="width: 50%; text-align: center; padding-top: 40px; border-top: 1px solid #111;">
          <div style="font-size: 11px;">Firma del vendedor</div>
        </td>
        <td style="width: 50%; text-align: center; padding-top: 40px; border-top: 1px solid #111;">
          <div style="font-size: 11px;">Aclaración y firma del cliente</div>
        </td>
      </tr>
    </table>
    <div v-if="config.footer_text" :style="{ order: blockOrder('footer', 7) }" style="margin-top: 18px; text-align: center; font-size: 9px; color: #666;">{{ config.footer_text }}</div>
  </div>
</template>
