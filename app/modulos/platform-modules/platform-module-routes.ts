const moduleRoutes: Array<{ moduleCode: string; patterns: RegExp[] }> = [
  { moduleCode: 'MAINTENANCE', patterns: [/^\/logistica\/mantenimiento(?:\/|$)/] },
  { moduleCode: 'INTERNATIONAL_OPERATIONS', patterns: [/^\/operaciones-internacionales(?:\/|$)/] },
  { moduleCode: 'REPORTS', patterns: [/^\/erp\/reports(?:\/|$)/] },
  { moduleCode: 'WHATSAPP', patterns: [/^\/settings\/whatsapp(?:\/|$)/] },
  { moduleCode: 'MCP', patterns: [/^\/settings\/connected-apps(?:\/|$)/, /^\/mcp\/authorize(?:\/|$)/] },
  { moduleCode: 'MANUFACTURING', patterns: [/^\/(?:fabricacion|bom)(?:\/|$)/] },
  { moduleCode: 'ACCOUNTING', patterns: [/^\/erp\/contabilidad(?:\/|$)/] },
  { moduleCode: 'HR', patterns: [/^\/erp\/rrhh(?:\/|$)/] },
  { moduleCode: 'TREASURY', patterns: [/^\/erp\/treasury(?:\/|$)/] },
  { moduleCode: 'PURCHASES', patterns: [/^\/erp\/purchases(?:\/|$)/] },
  {
    moduleCode: 'SALES',
    patterns: [/^\/(?:mis-ventas|erp\/(?:sales|orders|budgets|remitos))(?:\/|$)/]
  },
  { moduleCode: 'LOGISTICS', patterns: [/^\/logistica(?:\/|$)/] },
  { moduleCode: 'INVENTORY', patterns: [/^\/stock(?:\/|$)/, /^\/productos\/warehouses(?:\/|$)/] },
  { moduleCode: 'MASTER_DATA', patterns: [/^\/productos(?:\/|$)/, /^\/erp\/stakeholders(?:\/|$)/] }
]

export function resolvePlatformModuleForRoute(path: string) {
  return moduleRoutes.find((entry) => entry.patterns.some((pattern) => pattern.test(path)))?.moduleCode ?? null
}
