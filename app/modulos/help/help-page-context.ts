export interface HelpPageContext {
  label: string
  guideSlugs: string[]
  suggestedQuestions: string[]
}

interface HelpPageRule {
  matches: (path: string) => boolean
  context: HelpPageContext
}

const rules: HelpPageRule[] = [
  {
    matches: path => path.startsWith('/erp/treasury/checks'),
    context: {
      label: 'Tesorería · Cheques',
      guideSlugs: ['procesos/tesoreria/cheques'],
      suggestedQuestions: [
        '¿Cuándo se confirma un cheque propio?',
        '¿Qué hago con un cheque de tercero vencido?',
        '¿Qué significa “pendiente de asociar”?'
      ]
    }
  },
  {
    matches: path => path.startsWith('/erp/treasury/payments'),
    context: {
      label: 'Tesorería · Pagos y cobros',
      guideSlugs: ['procesos/compras/pagos', 'procesos/ventas/cobros', 'procesos/tesoreria/cheques'],
      suggestedQuestions: [
        '¿Cómo registro un pago a proveedor?',
        '¿Cómo aplico un cobro a una factura?',
        '¿Cómo agrego una retención?'
      ]
    }
  },
  {
    matches: path => path.startsWith('/erp/treasury/cash-boxes'),
    context: {
      label: 'Tesorería · Cajas',
      guideSlugs: ['procesos/tesoreria/cajas'],
      suggestedQuestions: ['¿Cómo abro o cierro una caja?', '¿Cómo registro un movimiento manual?']
    }
  },
  {
    matches: path => path.startsWith('/erp/treasury/bank-accounts'),
    context: {
      label: 'Tesorería · Bancos',
      guideSlugs: ['procesos/tesoreria/bancos', 'procesos/tesoreria/transferencias'],
      suggestedQuestions: ['¿Cómo registro una transferencia?', '¿Cómo consulto el movimiento asociado a un pago?']
    }
  },
  {
    matches: path => path.startsWith('/erp/treasury/current-accounts'),
    context: {
      label: 'Tesorería · Cuentas corrientes',
      guideSlugs: ['procesos/tesoreria/cuentas-corrientes', 'procesos/tesoreria'],
      suggestedQuestions: ['¿Cómo se calcula el saldo?', '¿Qué documentos impactan la cuenta corriente?']
    }
  },
  {
    matches: path => path.startsWith('/erp/orders'),
    context: {
      label: 'Ventas · Órdenes de venta',
      guideSlugs: ['procesos/ventas/crear-orden-de-venta', 'procesos/ventas/circuito-de-ventas'],
      suggestedQuestions: ['¿Cómo creo una orden de venta?', '¿Cuándo queda lista para despacho?', '¿Cómo asigno un responsable?']
    }
  },
  {
    matches: path => path.startsWith('/erp/budgets'),
    context: {
      label: 'Ventas · Presupuestos',
      guideSlugs: ['procesos/ventas/presupuestos', 'procesos/ventas/circuito-de-ventas'],
      suggestedQuestions: ['¿Cómo convierto un presupuesto en OV?', '¿Qué pasa al confirmar el presupuesto?']
    }
  },
  {
    matches: path => path.startsWith('/erp/remitos'),
    context: {
      label: 'Ventas · Remitos',
      guideSlugs: ['procesos/ventas/remitos', 'procesos/ventas/circuito-de-ventas'],
      suggestedQuestions: ['¿Cuándo se descuenta el stock?', '¿Cómo facturo un remito entregado?']
    }
  },
  {
    matches: path => path.startsWith('/erp/sales'),
    context: {
      label: 'Ventas · Comprobantes',
      guideSlugs: ['procesos/ventas', 'procesos/ventas/facturacion', 'procesos/ventas/cobros'],
      suggestedQuestions: ['¿Cómo creo una factura de venta?', '¿Cómo registro un cobro?', '¿Qué tipos de comprobantes puedo crear?']
    }
  },
  {
    matches: path => path.startsWith('/erp/purchases/purchases-documents'),
    context: {
      label: 'Compras · Facturas',
      guideSlugs: ['procesos/compras/facturas-de-compra', 'procesos/compras/pagos'],
      suggestedQuestions: ['¿Cómo cargo una factura de compra?', '¿Cómo se registra una bonificación?', '¿Cómo pago una factura?']
    }
  },
  {
    matches: path => path.startsWith('/erp/purchases/orders'),
    context: {
      label: 'Compras · Órdenes de compra',
      guideSlugs: ['procesos/compras/ordenes-de-compra', 'procesos/compras/recepciones'],
      suggestedQuestions: ['¿Cómo creo una orden de compra?', '¿Cómo registro la recepción?']
    }
  },
  {
    matches: path => path.startsWith('/erp/purchases/remitos'),
    context: {
      label: 'Compras · Remitos',
      guideSlugs: ['procesos/compras/recepciones'],
      suggestedQuestions: ['¿Cómo ingreso el stock desde un remito?', '¿Qué diferencia hay entre remito y factura?']
    }
  },
  {
    matches: path => path.startsWith('/erp/stakeholders'),
    context: {
      label: 'Partes interesadas',
      guideSlugs: ['configuracion/contrapartes/crear-contraparte', 'administracion/usuarios-roles-permisos/gestionar-roles'],
      suggestedQuestions: ['¿Cómo evito duplicar una parte interesada?', '¿Qué tipos de partes interesadas puedo crear?']
    }
  },
  {
    matches: path => path.startsWith('/productos'),
    context: {
      label: 'Productos',
      guideSlugs: ['configuracion/productos/crear-producto', 'configuracion/productos/precios-por-contraparte'],
      suggestedQuestions: ['¿Cómo configuro un precio por cliente?', '¿Cómo se usa el precio general?']
    }
  },
  {
    matches: path => path.startsWith('/erp/rrhh/vales'),
    context: {
      label: 'RR. HH. · Vales y comisiones',
      guideSlugs: ['procesos/rrhh/vales-y-comisiones'],
      suggestedQuestions: ['¿Cómo registro un vale?', '¿Cómo se paga un vale desde Tesorería?']
    }
  },
  {
    matches: path => path.startsWith('/erp/rrhh'),
    context: {
      label: 'RR. HH.',
      guideSlugs: ['procesos/rrhh', 'procesos/rrhh/empleados', 'procesos/rrhh/socios'],
      suggestedQuestions: ['¿Cómo gestiono empleados?', '¿Qué operaciones puedo hacer con socios?']
    }
  },
  {
    matches: path => path.startsWith('/operaciones-internacionales'),
    context: {
      label: 'Operaciones internacionales',
      guideSlugs: ['procesos/operaciones-internacionales/operaciones', 'procesos/operaciones-internacionales/contenedores'],
      suggestedQuestions: ['¿Cómo cargo un presupuesto internacional?', '¿Cómo vinculo documentos a un contenedor?']
    }
  },
  {
    matches: path => path.startsWith('/logistica/mantenimiento'),
    context: {
      label: 'Logística · Mantenimiento',
      guideSlugs: ['procesos/logistica/mantenimiento', 'procesos/logistica/flota'],
      suggestedQuestions: ['¿Cómo registro un mantenimiento?', '¿Cómo gestiono cubiertas?']
    }
  },
  {
    matches: path => path.startsWith('/logistica/viajes') || path.startsWith('/logistica/operaciones'),
    context: {
      label: 'Logística · Viajes y despachos',
      guideSlugs: ['procesos/logistica/viajes', 'procesos/logistica/ordenes-de-despacho', 'procesos/logistica/tarifas'],
      suggestedQuestions: ['¿Cómo asigno órdenes de despacho a un viaje?', '¿De dónde se toma la tarifa?', '¿Cuándo se completa un viaje?']
    }
  },
  {
    matches: path => path.startsWith('/stock'),
    context: {
      label: 'Stock',
      guideSlugs: ['procesos/stock', 'procesos/stock/reposicion', 'procesos/stock/disponibilidad'],
      suggestedQuestions: ['¿Cómo identifico productos para reponer?', '¿Cómo consulto disponibilidad?']
    }
  },
  {
    matches: path => path.startsWith('/erp/settings/document-types') || path.startsWith('/erp/settings/document-sequences'),
    context: {
      label: 'Configuración · Documentos y secuencias',
      guideSlugs: ['configuracion/documentos/tipos-de-documento', 'configuracion/documentos/secuencias'],
      suggestedQuestions: ['¿Cómo configuro una secuencia?', '¿Cómo habilito conceptos comerciales?', '¿Qué significa mostrar la OV en neto?']
    }
  },
  {
    matches: path => path.startsWith('/erp/treasury'),
    context: {
      label: 'Tesorería',
      guideSlugs: ['procesos/tesoreria', 'procesos/tesoreria/cheques', 'procesos/tesoreria/bancos', 'procesos/tesoreria/cajas'],
      suggestedQuestions: ['¿Cómo registro un pago?', '¿Cómo deposito un cheque?', '¿Cómo consulto el saldo de una cuenta?']
    }
  }
]

export function getHelpPageContext(path: string, query?: Record<string, unknown>): HelpPageContext {
  const rule = rules.find(item => item.matches(path))
  if (!rule) {
    return {
      label: 'Ayuda general',
      guideSlugs: ['', 'primeros-pasos'],
      suggestedQuestions: ['¿Cómo encuentro una función?', '¿Dónde consulto las guías del sistema?']
    }
  }

  if (path === '/erp/sales/new' && query?.category === 'ORDER') {
    return {
      label: 'Ventas · Nueva Orden de Venta',
      guideSlugs: ['procesos/ventas/crear-orden-de-venta', 'procesos/ventas/circuito-de-ventas'],
      suggestedQuestions: ['¿Cómo agrego productos?', '¿Cómo asigno un punto de venta?', '¿Qué hace que una OV quede lista para despacho?']
    }
  }
  return rule.context
}
