export function usePrint() {
  const printElement = (elementId: string, options?: { title?: string }) => {
    const element = document.getElementById(elementId)
    if (!element) {
      console.error('Element not found:', elementId)
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      console.error('Could not open print window')
      return
    }

    const title = options?.title || 'Documento'

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page {
            margin: 12mm;
            size: A4;
          }

          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #1a1a1a;
            line-height: 1.4;
            background: white;
          }

          /* ===== INVOICE CONTAINER ===== */
          .invoice {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
          }

          /* ===== HEADER ===== */
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 16px;
            border-bottom: 3px solid #1a1a1a;
            margin-bottom: 20px;
          }
          .invoice-header-left {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .invoice-logo {
            width: 48px;
            height: 48px;
            background: #f3f4f6;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #374151;
          }
          .company-name {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          }
          .company-detail {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.5;
          }
          .invoice-header-right { text-align: right; }
          .invoice-type-badge {
            display: inline-block;
            background: #111827;
            color: white;
            padding: 4px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .invoice-number {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
          }
          .invoice-meta { font-size: 11px; }
          .meta-row {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
            align-items: center;
            margin-bottom: 2px;
          }
          .meta-label { color: #9ca3af; font-weight: 500; }
          .meta-value { color: #374151; font-weight: 600; }

          /* ===== CUSTOMER ===== */
          .invoice-customer {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 14px 16px;
            margin-bottom: 20px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .customer-label {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #9ca3af;
            margin-bottom: 4px;
          }
          .customer-value {
            font-size: 12px;
            font-weight: 500;
            color: #111827;
          }

          /* ===== ITEMS TABLE ===== */
          .invoice-items { margin-bottom: 20px; }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .items-table thead {
            background: #111827;
            color: white;
          }
          .items-table th {
            padding: 8px 10px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table th.col-qty,
          .items-table th.col-price,
          .items-table th.col-tax,
          .items-table th.col-total { text-align: right; }
          .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
          }
          .items-table td.col-qty,
          .items-table td.col-price,
          .items-table td.col-tax,
          .items-table td.col-total { text-align: right; }
          .items-table tbody tr:nth-child(even) { background: #f9fafb; }
          .item-name { font-weight: 500; }
          .tax-badge {
            display: inline-block;
            font-size: 9px;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 3px;
            padding: 1px 5px;
            margin: 1px 2px;
            color: #6b7280;
          }

          /* ===== BOTTOM (OBS + TOTALS) ===== */
          .invoice-bottom {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            margin-bottom: 24px;
          }
          .invoice-observations {
            padding: 14px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
          }
          .obs-label {
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #9ca3af;
            margin-bottom: 6px;
          }
          .obs-text { font-size: 11px; color: #374151; }
          .obs-ref { font-size: 10px; color: #6b7280; margin-top: 4px; }
          .invoice-totals { display: flex; justify-content: flex-end; }
          .totals-box {
            width: 100%;
            border: 2px solid #1a1a1a;
            border-radius: 6px;
            overflow: hidden;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 14px;
            font-size: 11px;
          }
          .totals-row:nth-child(even) { background: #f9fafb; }
          .totals-divider { height: 2px; background: #1a1a1a; }
          .totals-row.grand-total {
            background: #111827;
            color: white;
            font-weight: 700;
            font-size: 15px;
            padding: 10px 14px;
          }

          /* ===== FOOTER BLOCK ===== */
          .invoice-footer-block {
            display: grid;
            grid-template-columns: 160px 1fr;
            gap: 20px;
            align-items: end;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-bottom: 20px;
          }
          .footer-qr { text-align: center; }
          .qr-placeholder {
            width: 120px;
            height: 120px;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin: 0 auto;
          }
          .qr-label {
            font-size: 8px;
            color: #9ca3af;
            text-transform: uppercase;
          }
          .footer-signatures {
            display: flex;
            justify-content: space-around;
            gap: 20px;
          }
          .signature-box { text-align: center; flex: 1; }
          .signature-line {
            width: 100%;
            height: 1px;
            background: #1a1a1a;
            margin-bottom: 6px;
          }
          .signature-label { font-size: 9px; color: #6b7280; }

          /* ===== FINAL FOOTER ===== */
          .invoice-final-footer {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
          }
          .invoice-final-footer p:first-child {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 2px;
          }

          /* ===== VISIBILITY ===== */
          .screen-only { display: none !important; }
          .print-only { display: block !important; }

          /* ===== PRINT OVERRIDES ===== */
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .invoice { box-shadow: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  return { printElement }
}
