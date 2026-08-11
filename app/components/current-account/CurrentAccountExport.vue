<script setup lang="ts">
import { ENTRY_TYPE_CONFIG } from '~/modulos/erp/current-accounts/columns'
import { useExcelExport } from '~/composables/useExcelExport'
import { resolveSide } from '~/modulos/erp/current-accounts/utils'
import { balanceChartColor } from '~/modulos/erp/current-accounts/balance-utils'

const props = defineProps<{
  entries: any[]
  account: any
  partyTypeLabel?: string
}>()

const { exportToExcel } = useExcelExport()

const formatCurrency = (amount: number) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num)
}

// Exportar a Excel
const exportEntries = () => {
  const partyName = props.account?.party?.name ?? 'tercero'
  const sorted = [...props.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  exportToExcel({
    filename: `movimientos_${partyName.replace(/\s+/g, '_')}`,
    sheetName: 'Movimientos',
    columns: [
      { key: 'date', label: 'Fecha', width: 18, format: (v: any) => v ? new Date(v).toLocaleDateString('es-AR') : '' },
      { key: 'type_label', label: 'Tipo', width: 20 },
      { key: 'original_amount', label: 'Monto original', width: 15 },
      { key: 'currency_code', label: 'Moneda', width: 10 },
      { key: 'exchange_rate', label: 'Tipo cambio', width: 12 },
      { key: 'debit', label: 'Débito', width: 15, format: (v: any) => v ? formatCurrency(v) : '' },
      { key: 'credit', label: 'Crédito', width: 15, format: (v: any) => v ? formatCurrency(v) : '' },
      { key: 'balance_after', label: 'Saldo', width: 15, format: (v: any) => formatCurrency(v) },
      { key: 'description', label: 'Descripción', width: 30 },
    ],
    data: sorted.map(e => ({
      ...e,
      type_label: ENTRY_TYPE_CONFIG[e.type]?.label ?? e.type,
      original_amount: `${e.currency_code || 'ARS'} ${Number(e.amount).toFixed(2)}`,
      debit: resolveSide(e.type, props.account?.party_type ?? '') === 'debit' ? Number(e.converted_amount ?? e.amount) : null,
      credit: resolveSide(e.type, props.account?.party_type ?? '') === 'credit' ? Number(e.converted_amount ?? e.amount) : null,
    }))
  })
}

// Imprimir
const printStatement = () => {
  const partyName = props.account?.party?.name ?? 'Tercero'
  const sorted = [...props.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const entriesHtml = sorted.map(e => {
    const config = ENTRY_TYPE_CONFIG[e.type]
    const isDebit = resolveSide(e.type, props.account?.party_type ?? '') === 'debit'
    const amountInBase = Number(e.converted_amount ?? e.amount)
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${new Date(e.date).toLocaleDateString('es-AR')}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${config?.label ?? e.type}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${e.currency_code || 'ARS'} ${Number(e.amount).toFixed(2)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${isDebit ? formatCurrency(amountInBase) : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${!isDebit ? formatCurrency(amountInBase) : ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold">${formatCurrency(e.balance_after)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${e.description || ''}</td>
    </tr>`
  }).join('')

  const balance = Number(props.account?.balance ?? 0)
  const balanceClass = `color:${balanceChartColor(balance, props.account?.party_type)}`

  const html = `<!DOCTYPE html><html><head><title>Estado de Cuenta - ${partyName}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:6px 8px;border-bottom:2px solid #ddd;text-align:left}.header{display:flex;justify-content:space-between;margin-bottom:20px}.balance{font-size:18px;font-weight:bold}</style>
  </head><body>
    <div class="header">
      <div><h2>Estado de Cuenta</h2><p>${partyName}</p><p>${props.partyTypeLabel || ''}</p></div>
      <div style="text-align:right"><p>Fecha: ${new Date().toLocaleDateString('es-AR')}</p><p class="balance" style="${balanceClass}">Saldo: ${formatCurrency(balance)}</p></div>
    </div>
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Monto original</th><th style="text-align:right">Débito</th><th style="text-align:right">Crédito</th><th style="text-align:right">Saldo</th><th>Descripción</th></tr></thead><tbody>${entriesHtml}</tbody></table>
  </body></html>`

  const printWindow = window.open('', '_blank')
  printWindow?.document.write(html)
  printWindow?.document.close()
  printWindow?.print()
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      label="Exportar Excel"
      icon="i-lucide-download"
      variant="outline"
      size="sm"
      @click="exportEntries"
    />
    <UButton
      label="Imprimir"
      icon="i-lucide-printer"
      variant="outline"
      size="sm"
      @click="printStatement"
    />
  </div>
</template>
