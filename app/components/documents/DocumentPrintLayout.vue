<script setup lang="ts">
import QRCode from 'qrcode'

interface Company {
  name: string
  tax_id?: string
  address?: string
  phone?: string
  iva_condition?: string
  gross_income?: string
  activity_start?: string
}

interface Party {
  name: string
  tax_id?: string
  address?: string
  iva_condition?: string
  sale_condition?: string
}

interface DocumentItem {
  code?: string
  description: string
  quantity: number
  unit_price: number
  tax_rate?: number
  tax_amount?: number
  total: number
}

interface DocumentTotals {
  subtotal: number
  taxes: { name: string; amount: number }[]
  total: number
}

interface Props {
  type: 'sale' | 'purchase'
  letter?: 'A' | 'B' | 'C' | 'X'
  number: string
  date: string
  company: Company
  customer: Party
  items: DocumentItem[]
  totals: DocumentTotals
  observations?: string
  cae?: string
  cae_due?: string
  point_of_sale?: string
}

const props = withDefaults(defineProps<Props>(), {
  letter: 'A',
  observations: '',
  cae: '',
  cae_due: '',
  point_of_sale: '0001'
})

function fmt(n: any) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(n ?? 0))
}

function parseLocalDate(d: any): Date {
  if (!d) return new Date()
  if (d instanceof Date) return d
  const str = String(d)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(str)
}

function formatDate(d: any) {
  if (!d) return '—'
  return parseLocalDate(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toAfipDate(d: any) {
  const date = parseLocalDate(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const codigoCmpMap: Record<string, string> = { A: '01', B: '06', C: '11', X: '00' }
const tipoCmpMap: Record<string, number> = { A: 1, B: 6, C: 11, X: 0 }

const formattedNumber = computed(() => {
  const pv = String(props.point_of_sale).padStart(4, '0')
  const nro = String(props.number).replace(/\D/g, '').padStart(8, '0')
  return `${pv}-${nro}`
})

const receiverDoc = computed(() => {
  const taxId = (props.customer.tax_id || '').replace(/\D/g, '')
  if (taxId.length === 11) return { tipo: 80, nro: Number(taxId) }
  if (taxId.length > 0) return { tipo: 96, nro: Number(taxId) }
  return { tipo: 99, nro: 0 }
})

const qrValue = computed(() => {
  const payload = {
    ver: 1,
    fecha: toAfipDate(props.date),
    cuit: Number((props.company.tax_id || '').replace(/\D/g, '')) || 0,
    ptoVta: Number(props.point_of_sale) || 0,
    tipoCmp: tipoCmpMap[props.letter] ?? 0,
    nroCmp: Number(String(props.number).replace(/\D/g, '')) || 0,
    importe: Number(props.totals.total) || 0,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: receiverDoc.value.tipo,
    nroDocRec: receiverDoc.value.nro,
    tipoCodAut: 'E',
    codAut: Number(props.cae) || 0
  }
  const json = JSON.stringify(payload)
  const base64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(json))) : ''
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`
})

const qrDataUrl = ref('')

async function generateQr() {
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrValue.value, {
      width: 110,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch {
    qrDataUrl.value = ''
  }
}

watch(qrValue, generateQr, { immediate: true })
</script>

<template>
  <table
    style="
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    "
  >
    <tr>
      <td style="padding: 20px">
        <!-- BLOQUE 1: HEADER -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #111111; margin-bottom: 18px">
          <tr>
            <td style="width: 38%; vertical-align: top; padding: 2px 16px 16px 0; text-align: left">
              <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: 700; color: #111111; letter-spacing: 0.2px">
                {{ company.name }}
              </p>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #555555">
                {{ company.iva_condition || 'Responsable Inscripto' }}
              </p>
              <p v-if="company.address" style="margin: 0 0 2px 0; font-size: 11px; color: #555555">
                {{ company.address }}
              </p>
              <p v-if="company.phone" style="margin: 0; font-size: 11px; color: #555555">Tel: {{ company.phone }}</p>
            </td>
            <td style="width: 100px; vertical-align: middle; padding: 2px 10px 16px 10px; text-align: center">
              <table style="margin: 0 auto; border-collapse: collapse">
                <tr>
                  <td
                    style="
                      width: 50px;
                      height: 50px;
                      border: 2px solid #111111;
                      border-radius: 6px;
                      text-align: center;
                      vertical-align: middle;
                      font-size: 30px;
                      font-weight: 800;
                      color: #111111;
                      background: #fafafa;
                    "
                  >
                    {{ letter }}
                  </td>
                </tr>
                <tr>
                  <td
                    style="
                      text-align: center;
                      padding-top: 6px;
                      font-size: 9px;
                      font-weight: 700;
                      color: #111111;
                      letter-spacing: 0.5px;
                    "
                  >
                    COD. {{ codigoCmpMap[letter] }}
                  </td>
                </tr>
              </table>
            </td>
            <td style="width: 38%; vertical-align: top; padding: 2px 0 16px 16px; text-align: right">
              <p style="margin: 0 0 9px 0; font-size: 23px; font-weight: 800; letter-spacing: 1.5px; color: #111111">
                FACTURA
              </p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #333333">
                <b style="color: #111111">Punto de Venta:</b>
                {{ String(point_of_sale).padStart(4, '0') }} &nbsp;&nbsp;
                <b style="color: #111111">Comp. Nº:</b>
                {{ formattedNumber }}
              </p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #333333">
                <b style="color: #111111">Fecha de Emisión:</b>
                {{ formatDate(date) }}
              </p>
              <p v-if="company.tax_id" style="margin: 0 0 4px 0; font-size: 11px; color: #333333">
                <b style="color: #111111">CUIT:</b>
                {{ company.tax_id }}
              </p>
              <p v-if="company.gross_income" style="margin: 0 0 4px 0; font-size: 11px; color: #333333">
                <b style="color: #111111">Ingresos Brutos:</b>
                {{ company.gross_income }}
              </p>
              <p v-if="company.activity_start" style="margin: 0; font-size: 11px; color: #333333">
                <b style="color: #111111">Inicio de Actividades:</b>
                {{ formatDate(company.activity_start) }}
              </p>
            </td>
          </tr>
        </table>

        <!-- BLOQUE 2: CLIENTE / PROVEEDOR -->
        <table
          style="
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            margin-bottom: 18px;
          "
        >
          <tr>
            <td
              style="
                width: 1%;
                white-space: nowrap;
                padding: 8px 12px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #8a8a8a;
                background: #fafafa;
                border-bottom: 1px solid #e5e5e5;
                border-right: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              {{ type === 'sale' ? 'Razón Social' : 'Proveedor' }}
            </td>
            <td
              style="
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #111111;
                border-bottom: 1px solid #e5e5e5;
                border-right: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              {{ customer.name }}
            </td>
            <td
              style="
                width: 1%;
                white-space: nowrap;
                padding: 8px 12px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #8a8a8a;
                background: #fafafa;
                border-bottom: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              CUIT / DNI
            </td>
            <td
              style="
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #111111;
                border-bottom: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              {{ customer.tax_id || '—' }}
            </td>
          </tr>
          <tr>
            <td
              style="
                width: 1%;
                white-space: nowrap;
                padding: 8px 12px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #8a8a8a;
                background: #fafafa;
                border-bottom: 1px solid #e5e5e5;
                border-right: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              Domicilio
            </td>
            <td
              style="
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #111111;
                border-bottom: 1px solid #e5e5e5;
                border-right: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              {{ customer.address || '—' }}
            </td>
            <td
              style="
                width: 1%;
                white-space: nowrap;
                padding: 8px 12px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #8a8a8a;
                background: #fafafa;
                border-bottom: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              Condición IVA
            </td>
            <td
              style="
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 500;
                color: #111111;
                border-bottom: 1px solid #e5e5e5;
                vertical-align: top;
              "
            >
              {{ customer.iva_condition || '—' }}
            </td>
          </tr>
          <tr>
            <td
              style="
                width: 1%;
                white-space: nowrap;
                padding: 8px 12px;
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #8a8a8a;
                background: #fafafa;
                vertical-align: top;
              "
            >
              Cond. de Venta
            </td>
            <td
              colspan="3"
              style="padding: 8px 12px; font-size: 12px; font-weight: 500; color: #111111; vertical-align: top"
            >
              {{ customer.sale_condition || 'Contado' }}
            </td>
          </tr>
        </table>

        <!-- BLOQUE 3: ITEMS -->
        <table
          style="
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 11px;
          "
        >
          <tr
            style="
              background: #111111 !important;
              background-color: #111111 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            "
          >
            <th
              style="
                padding: 9px 12px;
                text-align: left;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-right: 1px solid #333333;
              "
            >
              Código
            </th>
            <th
              style="
                padding: 9px 12px;
                text-align: left;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-right: 1px solid #333333;
              "
            >
              Descripción
            </th>
            <th
              style="
                padding: 9px 12px;
                text-align: right;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-right: 1px solid #333333;
              "
            >
              Cant.
            </th>
            <th
              style="
                padding: 9px 12px;
                text-align: right;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-right: 1px solid #333333;
              "
            >
              P. Unitario
            </th>
            <th
              style="
                padding: 9px 12px;
                text-align: right;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
                border-right: 1px solid #333333;
              "
            >
              IVA
            </th>
            <th
              style="
                padding: 9px 12px;
                text-align: right;
                color: #ffffff !important;
                font-size: 9px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.4px;
              "
            >
              Importe
            </th>
          </tr>
          <tr v-for="(item, idx) in items" :key="idx" :style="idx % 2 === 1 ? 'background:#fafafa;' : ''">
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                border-bottom: 1px solid #eeeeee;
                border-right: 1px solid #f0f0f0;
              "
            >
              {{ item.code || '—' }}
            </td>
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                border-bottom: 1px solid #eeeeee;
                border-right: 1px solid #f0f0f0;
              "
            >
              {{ item.description }}
            </td>
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                text-align: right;
                border-bottom: 1px solid #eeeeee;
                border-right: 1px solid #f0f0f0;
              "
            >
              {{ item.quantity }}
            </td>
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                text-align: right;
                border-bottom: 1px solid #eeeeee;
                border-right: 1px solid #f0f0f0;
              "
            >
              {{ fmt(item.unit_price) }}
            </td>
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                text-align: right;
                border-bottom: 1px solid #eeeeee;
                border-right: 1px solid #f0f0f0;
              "
            >
              {{ item.tax_rate ? item.tax_rate + '%' : '—' }}
            </td>
            <td
              style="
                padding: 9px 12px;
                color: #222222;
                text-align: right;
                border-bottom: 1px solid #eeeeee;
                font-weight: 500;
              "
            >
              {{ fmt(item.total) }}
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="6" style="padding: 20px; text-align: center; color: #9ca3af">Sin ítems</td>
          </tr>
        </table>

        <!-- BLOQUE 4: OBSERVACIONES + TOTALES -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px">
          <tr>
            <td
              style="
                width: 58%;
                vertical-align: top;
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                padding: 14px 16px;
                background: #fafafa;
              "
            >
              <p
                style="
                  margin: 0 0 6px 0;
                  font-size: 9px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                  color: #8a8a8a;
                "
              >
                Observaciones
              </p>
              <p style="margin: 0; font-size: 11px; color: #333333; white-space: pre-line">
                {{ observations || 'Sin observaciones' }}
              </p>
            </td>
            <td style="width: 20px"></td>
            <td style="width: 42%; vertical-align: top">
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                  border: 1px solid #111111;
                  border-radius: 4px;
                  overflow: hidden;
                "
              >
                <tr>
                  <td style="padding: 8px 16px; font-size: 11px; color: #333333; border-bottom: 1px solid #e5e5e5">
                    Subtotal
                  </td>
                  <td
                    style="
                      padding: 8px 16px;
                      font-size: 11px;
                      color: #333333;
                      text-align: right;
                      border-bottom: 1px solid #e5e5e5;
                    "
                  >
                    {{ fmt(totals.subtotal) }}
                  </td>
                </tr>
                <tr v-for="tax in totals.taxes" :key="tax.name">
                  <td style="padding: 8px 16px; font-size: 11px; color: #333333; border-bottom: 1px solid #e5e5e5">
                    {{ tax.name }}
                  </td>
                  <td
                    style="
                      padding: 8px 16px;
                      font-size: 11px;
                      color: #333333;
                      text-align: right;
                      border-bottom: 1px solid #e5e5e5;
                    "
                  >
                    {{ fmt(tax.amount) }}
                  </td>
                </tr>
                <tr>
                  <td
                    style="
                      padding: 12px 16px;
                      font-size: 15px;
                      font-weight: 700;
                      background: #111111 !important;
                      background-color: #111111 !important;
                      color: #ffffff !important;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    "
                  >
                    TOTAL
                  </td>
                  <td
                    style="
                      padding: 12px 16px;
                      font-size: 15px;
                      font-weight: 700;
                      background: #111111 !important;
                      background-color: #111111 !important;
                      color: #ffffff !important;
                      text-align: right;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    "
                  >
                    {{ fmt(totals.total) }}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- BLOQUE 5: CAE + QR + FIRMA -->
        <table style="width: 100%; border-collapse: collapse; border-top: 2px solid #111111; margin-bottom: 14px">
          <tr>
            <td style="width: 130px; vertical-align: bottom; padding: 18px 12px 0 0">
              <img
                v-if="qrDataUrl"
                :src="qrDataUrl"
                width="110"
                height="110"
                alt="QR Code"
                style="display: block; border: 1px solid #eeeeee; border-radius: 4px; padding: 4px"
              />
              <div
                v-else
                style="
                  width: 110px;
                  height: 110px;
                  border: 2px dashed #d1d5db;
                  border-radius: 4px;
                  text-align: center;
                  color: #d1d5db;
                  font-size: 11px;
                  display: table;
                "
              >
                <div style="display: table-cell; vertical-align: middle; text-align: center">QR</div>
              </div>
            </td>
            <td style="vertical-align: bottom; padding: 18px 12px 0 12px">
              <template v-if="cae">
                <p style="margin: 0 0 9px 0">
                  <span
                    style="
                      display: block;
                      font-size: 9px;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.3px;
                      color: #8a8a8a;
                    "
                  >
                    CAE Nº
                  </span>
                  <span
                    style="font-size: 13px; font-weight: 700; color: #111111; font-family: 'Courier New', monospace"
                  >
                    {{ cae }}
                  </span>
                </p>
                <p v-if="cae_due" style="margin: 0">
                  <span
                    style="
                      display: block;
                      font-size: 9px;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 0.3px;
                      color: #8a8a8a;
                    "
                  >
                    Fecha de Vto. de CAE
                  </span>
                  <span
                    style="font-size: 13px; font-weight: 700; color: #111111; font-family: 'Courier New', monospace"
                  >
                    {{ formatDate(cae_due) }}
                  </span>
                </p>
              </template>
            </td>
            <td style="width: 180px; text-align: center; vertical-align: bottom; padding: 18px 0 0 12px">
              <div style="width: 100%; height: 1px; background: #111111; margin-bottom: 6px"></div>
              <p style="margin: 0; font-size: 9px; color: #8a8a8a">Firma y Aclaración</p>
            </td>
          </tr>
        </table>

        <!-- BLOQUE 6: FOOTER -->
        <p style="text-align: center; margin: 10px 0 0 0; font-size: 8.5px; color: #999999">
          Comprobante autorizado. Esta Administración Federal no se responsabiliza por los datos ingresados en el
          detalle de la operación
        </p>
      </td>
    </tr>
  </table>
</template>
