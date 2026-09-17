import { apiProxy } from '../../utils/api-proxy'

/**
 * Proxy dinámico multitenant con traducción de paths.
 *
 * Frontend llama /api/backend/* → proxy traduce al path correcto del backend NestJS.
 * Mapping basado en los proxies viejos (recuperados de git HEAD).
 *
 * Si un path no está en el mapping, se usa el path tal cual (sin prefijo /api/backend/).
 */

// ── Mapping: frontend path → backend path ──────────────────────────────────────
// Solo incluye paths donde el backend difiere del path del frontend.
// Si un path no está aquí, se usa tal cual.

const PATH_MAP: Record<string, string> = {
  // ── Contabilidad ────────────────────────────────────────────────────────────
  'accounts': '/accounts',

  // ── ERP (sin prefijo en frontend) ──────────────────────────────────────────
  'bank-accounts': '/erp/bank-accounts',
  'bank-concepts': '/erp/bank-concepts',
  'checks': '/erp/checks',
  'current-accounts': '/erp/current-accounts',
  'dashboard': '/erp/dashboard',
  'document-sequences': '/erp/document-sequences',
  'employees': '/erp/employees',
  'fiscal': '/erp/fiscal',
  'partners': '/erp/partners',
  'payments': '/erp/payments',
  'payment-reports': '/erp/payment-reports',
  'reports': '/erp/reports',
  'sales-flow': '/erp/sales-flow',
  'treasury': '/erp/treasury',
  'taxes': '/taxes',
  'currencies': '/currencies',
  'currencies-rate': '/currency-rates',
  'tax-engine/calculate-preview': '/tax-engine/calculate-preview',
  'tax-engine/company-settings': '/company-tax-settings',
  'tax-engine/tax-categories': '/tax-categories',

  // ── ERP documents ──────────────────────────────────────────────────────────
  'documents/sales': '/documents/sales',
  'documents/sales/generate': '/documents/sales/generate-from-all-completed-trips',
  'documents/purchases': '/documents/purchases-documents',
  'documents/purchases/generate': '/documents/purchases-documents/generate-from-all-completed-trips',
  'documents/documents-types': '/documents-types',
  'documents/assignment': '/documents/assignment',

  // ── ERP pricing ────────────────────────────────────────────────────────────
  'pricing/exchange': '/exchange',
  'pricing/party-prices': '/pricing/party-prices',

  // ── ERP reports ────────────────────────────────────────────────────────────
  'sales-reports': '/sales-reports',
  'purchases': '/purchases',
  'hr': '/hr',

  // ── Delivery notes ─────────────────────────────────────────────────────────
  'delivery-notes': '/delivery-notes',

  // ── International operations ───────────────────────────────────────────────
  'international-operations': '/international-operations',

  // ── Logística (sin prefijo en frontend) ────────────────────────────────────
  'cash-boxes': '/logistica/cash-boxes',
  'cash-box-movements': '/logistica/cash-box-movements',
  'cash-box-renditions': '/logistica/cash-box-renditions',
  'cash-box-transfers': '/logistica/cash-box-transfers',
  'maintenance': '/logistica/maintenance',
  'maintenance/dashboard/tires': '/logistica/maintenance/reports/tires',
  'vehicles': '/logistica/vehicles',
  'picking': '/logistica/picking',
  'dispatch-orders': '/dispatch-orders',
  'logistica/transfer-rate': '/transfer-rates',
  'transfer-rate': '/transfer-rates',
  'reports/choferes': '/reportes/choferes',

  // ── Logística master-data ──────────────────────────────────────────────────
  'business-parties': '/master-data/business-parties',
  'master-data/business-parties': '/master-data/business-parties',
  'master-data/contacts': '/party-contacts',
  'master-data/cost-templates': '/cost-templates',
  'master-data/product-attribute-values': '/product-attribute-values',
  'master-data/product-categories': '/product-categories',
  'master-data/product-components': '/product-components',
  'master-data/product-prices': '/product-prices',
  'master-data/product-tags': '/erp/product-tags',
  'master-data/product-variants': '/erp/product-variants',
  'master-data/variant-costs': '/erp/variant-costs',
  'master-data/variant-prices': '/variant-prices',
  'master-data/costing': '/products/costing',
  'master-data/engineering': '/erp/engineering',
  'master-data/products': '/master-data/products',

  // ── Logística transport ────────────────────────────────────────────────────
  'transport/corridors': '/corridors',
  'transport/drivers': '/transport/drivers',
  'transport/locations': '/locations',
  'transport/trips': '/trips',
  'transport/vehicles-combinations': '/vehicle-combinations',
  'transport/vehicles': '/logistica/vehicles',
  'transport/transfer-rate': '/transfer-rates',

  // ── Logística warehouse ────────────────────────────────────────────────────
  'warehouse/warehouses': '/warehouses',
  'warehouse/stock': '/warehouse/stock',
  'warehouse/pallets': '/warehouse/pallets',

  // ── Erp con prefijo (algunos services usan /erp/...) ──────────────────────
  'erp/treasury': '/erp/treasury',
  'erp/bank-accounts': '/erp/bank-accounts',
  'erp/checks': '/erp/checks',
  'erp/employees': '/erp/employees',
  'erp/partners': '/erp/partners',
  'erp/current-accounts': '/erp/current-accounts',
  'erp/dashboard': '/erp/dashboard',
  'erp/fiscal': '/erp/fiscal',
  'erp/payments': '/erp/payments',
  'erp/sales-flow': '/erp/sales-flow',
  'erp/taxes': '/taxes',
  'erp/currencies': '/currencies',
  'erp/currencies-rate': '/currency-rates',
  'erp/documents/sales': '/documents/sales',
  'erp/documents/purchases': '/documents/purchases-documents',
  'erp/documents/documents-types': '/documents-types',
  'erp/pricing/exchange': '/exchange',
  'erp/pricing/party-prices': '/pricing/party-prices',
  'erp/sales-reports': '/sales-reports',
  'erp/purchases': '/purchases',
  'erp/hr': '/hr',
  'erp/tax-engine/calculate-preview': '/tax-engine/calculate-preview',
  'erp/tax-engine/company-settings': '/company-tax-settings',
  'erp/tax-engine/tax-categories': '/tax-categories',
  'erp/international-operations': '/international-operations',
}

// Prefijos ordenados de más largo a más corto (para matching correcto)
const PREFIX_KEYS = Object.keys(PATH_MAP).sort((a, b) => b.length - a.length)

function translatePath(frontendPath: string): string {
  // 1. Buscar match exacto primero
  if (PATH_MAP[frontendPath]) {
    return PATH_MAP[frontendPath]
  }

  // 2. Buscar prefijo más largo que coincida
  for (const prefix of PREFIX_KEYS) {
    if (frontendPath === prefix || frontendPath.startsWith(prefix + '/')) {
      const rest = frontendPath.slice(prefix.length)
      return PATH_MAP[prefix] + rest
    }
  }

  // 3. Sin mapping → usar el path tal cual (sin /api/backend/)
  return '/' + frontendPath
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const rawPath = event.context.params?.path

  if (!rawPath) {
    throw createError({ statusCode: 400, statusMessage: 'Falta el path' })
  }

  // Protección contra path traversal
  const decoded = decodeURIComponent(rawPath)
  if (decoded.includes('..') || decoded.includes('%2e%2e')) {
    throw createError({ statusCode: 400, statusMessage: 'Path inválido' })
  }

  // Normalizar: quitar barra inicial si existe
  const frontendPath = decoded.replace(/^\/+/, '')

  const method = getMethod(event)

  // Traducir al path correcto del backend
  const backendPath = translatePath(frontendPath)

  const options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: any
    query?: Record<string, string>
    rawResponse?: boolean
  } = { method }

  // Body para POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const contentType = getRequestHeader(event, 'content-type') || ''

      if (contentType.includes('multipart/form-data')) {
        const formData = await readMultipartFormData(event)
        options.body = formData
      } else {
        options.body = await readRawBody(event).catch(() => null)
      }
    } catch {
      // Sin body
    }
  }

  // Query params
  const query = getQuery(event)
  if (query && Object.keys(query).length > 0) {
    options.query = query as Record<string, string>
  }

  // Detectar descargas binarias (Excel, PDF, imágenes)
  // window.open no envía Accept header → detectamos por query params y path
  const accept = getRequestHeader(event, 'accept') || ''
  const url = new URL(event.node.req.url || '', 'http://localhost')
  const queryStr = url.search
  const isBinary = accept.includes('application/octet-stream') ||
    accept.includes('application/pdf') ||
    accept.includes('image/') ||
    queryStr.includes('format=xlsx') ||
    queryStr.includes('format=csv') ||
    queryStr.includes('format=pdf') ||
    backendPath.includes('/export')

  if (isBinary) {
    options.rawResponse = true
  }

  return apiProxy(event, backendPath, options)
})
