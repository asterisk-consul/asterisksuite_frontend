export interface SettingsEntry {
  label: string
  description: string
  icon: string
  to: string
  permission?: string
  advanced?: boolean
}

export interface SettingsGroup {
  id: string
  label: string
  description: string
  icon: string
  order: number
  entries: SettingsEntry[]
}

export const settingsCatalog: SettingsGroup[] = [
  {
    id: 'company', label: 'Empresa', description: 'Identidad, domicilios y parámetros generales.', icon: 'i-lucide-building-2', order: 10,
    entries: [
      { label: 'Datos de la empresa', description: 'Razón social, identificación y datos institucionales.', icon: 'i-lucide-building', to: '/settings/company', permission: 'companies.read' },
      { label: 'Perfil fiscal', description: 'Condición fiscal, IIBB y jurisdicciones de la empresa.', icon: 'i-lucide-landmark', to: '/settings/fiscal-config', permission: 'companies.read' },
      { label: 'Locaciones', description: 'Sucursales, depósitos y domicilios operativos.', icon: 'i-lucide-map-pin', to: '/ajustes/locaciones', permission: 'locations.read' },
      { label: 'Monedas', description: 'Monedas habilitadas y tipos de cambio.', icon: 'i-lucide-banknote', to: '/settings/monedas', permission: 'currencies.read' }
    ]
  },
  {
    id: 'documents', label: 'Documentos', description: 'Comprobantes, numeración y circuitos comerciales.', icon: 'i-lucide-files', order: 20,
    entries: [
      { label: 'Centro de documentos', description: 'Recorrido guiado para ventas, compras y entregas.', icon: 'i-lucide-layout-dashboard', to: '/settings/documents', permission: 'document_types.read' },
      { label: 'Tipos de documento', description: 'Comportamiento, impuestos, stock y cuentas corrientes.', icon: 'i-lucide-file-cog', to: '/erp/settings/document-types', permission: 'document_types.read', advanced: true },
      { label: 'Puntos de venta y series', description: 'Numeración independiente para cada comprobante.', icon: 'i-lucide-hash', to: '/erp/settings/document-sequences', permission: 'document_sequences.read', advanced: true },
      { label: 'Circuito de ventas', description: 'Deuda, cobros, facturación y reglas de entrega.', icon: 'i-lucide-git-branch', to: '/settings/sales-flow', permission: 'document_types.read' },
      { label: 'Autorizaciones fiscales', description: 'CAI, CAE, vigencias, rangos y alertas.', icon: 'i-lucide-badge-check', to: '/settings/fiscal-authorizations', permission: 'fiscal-authorizations.read' }
    ]
  },
  {
    id: 'fiscal', label: 'Fiscal e impuestos', description: 'Reglas impositivas y cumplimiento fiscal.', icon: 'i-lucide-percent', order: 30,
    entries: [
      { label: 'Impuestos', description: 'IVA y otros impuestos disponibles.', icon: 'i-lucide-receipt-text', to: '/settings/taxes', permission: 'taxes.read' },
      { label: 'Reglas fiscales', description: 'Percepciones y retenciones por jurisdicción.', icon: 'i-lucide-list-checks', to: '/settings/fiscal-rules', permission: 'taxes.read' },
      { label: 'Configuración fiscal', description: 'Inscripciones y parámetros fiscales de la empresa.', icon: 'i-lucide-landmark', to: '/settings/fiscal-config', permission: 'companies.read' }
    ]
  },
  {
    id: 'treasury', label: 'Tesorería', description: 'Parámetros para fondos, bancos y medios de pago.', icon: 'i-lucide-wallet-cards', order: 40,
    entries: [
      { label: 'Conceptos bancarios', description: 'Clasificación de movimientos bancarios.', icon: 'i-lucide-landmark', to: '/erp/treasury/bank-concepts', permission: 'bank_accounts.read' },
      { label: 'Cajas', description: 'Crear cajas y definir monedas y responsables.', icon: 'i-lucide-wallet', to: '/erp/treasury/cash-boxes', permission: 'cash_boxes.read' },
      { label: 'Cuentas bancarias', description: 'Bancos, monedas y saldos iniciales.', icon: 'i-lucide-building-2', to: '/erp/treasury/bank-accounts', permission: 'bank_accounts.read' },
      { label: 'Cheques', description: 'Alertas y anticipación de vencimientos.', icon: 'i-lucide-square-check', to: '/erp/treasury/checks', permission: 'payments.read' }
    ]
  },
  {
    id: 'inventory', label: 'Productos y stock', description: 'Catálogos, depósitos y estructura de productos.', icon: 'i-lucide-package-open', order: 50,
    entries: [
      { label: 'Configuración de productos', description: 'Categorías, unidades, atributos y etiquetas.', icon: 'i-lucide-package-cog', to: '/productos/settings', permission: 'products.read' },
      { label: 'Depósitos', description: 'Depósitos habilitados y existencias.', icon: 'i-lucide-warehouse', to: '/productos/warehouses', permission: 'warehouses.read' }
    ]
  },
  {
    id: 'logistics', label: 'Logística', description: 'Documentación y tarifas de transporte.', icon: 'i-lucide-route', order: 60,
    entries: [
      { label: 'Documentación de transporte', description: 'Tipos de documentos y vencimientos.', icon: 'i-lucide-book-open-check', to: '/logistica/configuraciones/transport-document', permission: 'transport_document_types.read' },
      { label: 'Tarifas', description: 'Tarifas y reglas de transferencia.', icon: 'i-lucide-badge-dollar-sign', to: '/logistica/configuraciones/tarifas', permission: 'transfer_rates.read' },
      { label: 'Operaciones internacionales', description: 'Parámetros de importación y contenedores.', icon: 'i-lucide-ship', to: '/operaciones-internacionales/configuracion', permission: 'international_operations.update' }
    ]
  },
  {
    id: 'access', label: 'Usuarios y seguridad', description: 'Accesos, permisos y preferencias.', icon: 'i-lucide-shield-check', order: 70,
    entries: [
      { label: 'Usuarios', description: 'Altas, accesos y vinculaciones.', icon: 'i-lucide-users', to: '/settings/users', permission: 'roles.read' },
      { label: 'Roles y permisos', description: 'Definir qué puede consultar y operar cada perfil.', icon: 'i-lucide-key-round', to: '/settings/roles', permission: 'roles.read' },
      { label: 'Seguridad', description: 'Contraseña y seguridad de la cuenta.', icon: 'i-lucide-lock-keyhole', to: '/settings/security' },
      { label: 'Notificaciones', description: 'Preferencias generales de avisos.', icon: 'i-lucide-bell-ring', to: '/settings/notifications' },
      { label: 'Papelera', description: 'Recuperación de registros eliminados.', icon: 'i-lucide-trash-2', to: '/settings/trash', permission: 'trash.read', advanced: true }
    ]
  }
]
