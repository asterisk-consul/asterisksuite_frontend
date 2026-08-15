<script setup lang="ts">
const props = defineProps<{
  type: 'sale' | 'purchase'
  number: string
  date: string
  company: { name: string; tax_id?: string; address?: string; phone?: string; iva_condition?: string }
  customer: { name: string; tax_id?: string; address?: string; iva_condition?: string }
  items: { code: string; description: string; quantity: number }[]
  observations?: string
  point_of_sale?: string
  document?: any
}>()

const isPurchase = computed(() => props.type === 'purchase')

const formattedNumber = computed(() => {
  const pv = String(props.point_of_sale ?? '0001').padStart(4, '0')
  const nro = String(props.number).padStart(8, '0')
  return `${pv}-${nro}`
})

// Para purchase: proveedor arriba, empresa abajo
// Para sale: empresa arriba, cliente abajo
const headerLeft = computed(() => {
  if (isPurchase.value) {
    return { label: 'Proveedor', name: props.customer.name, tax_id: props.customer.tax_id, address: props.customer.address }
  }
  return { label: 'Empresa', name: props.company.name, tax_id: props.company.tax_id, address: props.company.address }
})

const headerRight = computed(() => {
  if (isPurchase.value) {
    return { label: 'Empresa', name: props.company.name, tax_id: props.company.tax_id, address: props.company.address, phone: props.company.phone }
  }
  return { label: 'Cliente', name: props.customer.name, tax_id: props.customer.tax_id, address: props.customer.address }
})
</script>

<template>
  <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111; max-width: 210mm; margin: 0 auto;">

    <!-- BLOQUE 1: HEADER -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <tr>
        <td style="width: 45%; vertical-align: top; padding-right: 16px;">
          <div style="font-size: 16px; font-weight: 700;">{{ headerLeft.name }}</div>
          <div style="font-size: 11px; color: #555; margin-top: 4px;">
            <div>CUIT: {{ headerLeft.tax_id ?? '—' }}</div>
            <div v-if="headerLeft.address">{{ headerLeft.address }}</div>
          </div>
        </td>
        <td style="width: 10%; text-align: center; vertical-align: top;">
          <div style="border: 2px solid #111; border-radius: 6px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; margin: 0 auto;">
            REM
          </div>
        </td>
        <td style="width: 45%; vertical-align: top; text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: #111;">REMITO</div>
          <div style="font-size: 11px; margin-top: 6px;">
            <div>Punto de Venta: <strong>{{ point_of_sale ?? '0001' }}</strong></div>
            <div>Comp. Número: <strong>{{ formattedNumber }}</strong></div>
            <div>Fecha: {{ date }}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- BLOQUE 2: DATOS DE ENTREGA -->
    <table style="width: 100%; border: 1px solid #ddd; border-collapse: collapse; margin-bottom: 16px;">
      <tr style="background: #f5f5f5;">
        <td colspan="4" style="padding: 6px 10px; font-weight: 600; font-size: 11px; border-bottom: 1px solid #ddd;">
          DATOS DE ENTREGA
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">{{ isPurchase ? 'Proveedor' : 'Cliente' }}</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px; font-weight: 600;">{{ headerRight.name || '—' }}</td>
        <td style="padding: 6px 10px; width: 15%; font-size: 11px; color: #555;">CUIT/DNI</td>
        <td style="padding: 6px 10px; width: 35%; font-size: 11px;">{{ headerRight.tax_id || '—' }}</td>
      </tr>
      <tr v-if="document?.orden_venta_doc?.delivery_address">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Dirección</td>
        <td colspan="3" style="padding: 6px 10px; font-size: 11px;">{{ document.orden_venta_doc.delivery_address }}</td>
      </tr>
      <tr v-if="document?.orden_venta_doc?.delivery_contact">
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Contacto</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ document.orden_venta_doc.delivery_contact }}</td>
        <td style="padding: 6px 10px; font-size: 11px; color: #555;">Teléfono</td>
        <td style="padding: 6px 10px; font-size: 11px;">{{ document.orden_venta_doc.delivery_phone || '—' }}</td>
      </tr>
    </table>

    <!-- BLOQUE 3: ITEMS (sin precios) -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #111; color: #fff;">
          <th style="padding: 6px 10px; text-align: left; font-size: 11px; width: 20%;">Código</th>
          <th style="padding: 6px 10px; text-align: left; font-size: 11px; width: 55%;">Descripción</th>
          <th style="padding: 6px 10px; text-align: center; font-size: 11px; width: 25%;">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in items" :key="i" :style="{ background: i % 2 === 1 ? '#fafafa' : '#fff' }">
          <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.code }}</td>
          <td style="padding: 5px 10px; font-size: 11px; border-bottom: 1px solid #eee;">{{ item.description }}</td>
          <td style="padding: 5px 10px; font-size: 11px; text-align: center; border-bottom: 1px solid #eee; font-weight: 600;">{{ item.quantity }}</td>
        </tr>
      </tbody>
    </table>

    <!-- BLOQUE 4: OBSERVACIONES -->
    <div v-if="observations" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 16px;">
      <div style="font-weight: 600; font-size: 11px; margin-bottom: 6px;">OBSERVACIONES</div>
      <div style="font-size: 11px; white-space: pre-wrap;">{{ observations }}</div>
    </div>

    <!-- BLOQUE 5: FIRMA DE RECEPCIÓN -->
    <table style="width: 100%; margin-top: 40px; border-top: 1px solid #ddd;">
      <tr>
        <td style="width: 50%; padding-top: 30px;">
          <table style="width: 100%;">
            <tr>
              <td style="border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px; width: 50%;">
                Firma
              </td>
              <td style="border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px; width: 50%;">
                Aclaración
              </td>
            </tr>
          </table>
        </td>
        <td style="width: 50%; padding-top: 30px;">
          <div style="border-top: 1px solid #111; padding-top: 6px; text-align: center; font-size: 11px;">
            Fecha de recepción: _______________
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
