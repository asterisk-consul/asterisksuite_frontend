import type { DrilldownNode } from '~/data/navigationTree'
import { navigationTree } from '~/data/navigationTree'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCurrentUserEmployee } from '~/composables/useCurrentUserEmployee'

// Tipo de nivel en el stack: nodos + referencia al nodo padre
export interface StackLevel {
  nodes: DrilldownNode[]
  parentNode?: DrilldownNode
}

function matchesPath(node: DrilldownNode, path: string): boolean {
  const target = node.to
  if (!target) return false
  if (target.startsWith('http')) return false

  const targetPath = target.split('?')[0]
  if (node.exact) return path === targetPath
  return path === targetPath || path.startsWith(`${targetPath}/`)
}

// Encuentra la cadena más profunda de nodos cuyo subtree matchea la ruta
function findBranch(nodes: DrilldownNode[], path: string): DrilldownNode[] {
  let best: DrilldownNode[] = []

  const walk = (list: DrilldownNode[], chain: DrilldownNode[]) => {
    for (const node of list) {
      const next = [...chain, node]
      if (node.to && matchesPath(node, path) && next.length > best.length) {
        best = next
      }
      if (node.children?.length) {
        walk(node.children, next)
      }
    }
  }

  walk(nodes, [])
  return best
}

// Filtrar nodos recursivamente por permisos y condiciones de visibilidad
function filterByPermissions(
  nodes: DrilldownNode[],
  hasPermission: (code: string) => boolean,
  isOwnerOrAdmin: boolean,
  isSalesperson: boolean
): DrilldownNode[] {
  return nodes.filter(node => {
    if (node.permission && !isOwnerOrAdmin && !hasPermission(node.permission)) {
      return false
    }
    if (node.visibleIf === 'is_salesperson' && !isSalesperson) {
      return false
    }
    if (node.children?.length) {
      const filteredChildren = filterByPermissions(node.children, hasPermission, isOwnerOrAdmin, isSalesperson)
      return filteredChildren.length > 0
    }
    return true
  })
}

export const useDrilldownNavigation = () => {
  const route = useRoute()
  const { hasPermission } = useRoles()
  const { isOwnerOrAdmin } = useCompanyRole()
  const { isSalesperson, fetchIfNeeded } = useCurrentUserEmployee()

  // Cargar el empleado del usuario actual (define is_salesperson para visibleIf)
  // Solo hace el fetch una vez; el watch de filteredTree reconstruye el nav cuando llega
  onMounted(() => {
    fetchIfNeeded()
  })

  const filteredTree = computed(() => filterByPermissions(navigationTree, hasPermission, isOwnerOrAdmin.value, isSalesperson.value))

  // Stack: cada nivel tiene nodos + referencia al nodo padre
  const stackState = useState<StackLevel[]>('drilldown-stack', () => [{ nodes: navigationTree }])

  const stack = computed<StackLevel[]>({
    get: () => stackState.value,
    set: (v) => { stackState.value = v }
  })

  const currentLevel = computed<DrilldownNode[]>(() => {
    const s = stack.value
    return s[s.length - 1]?.nodes ?? []
  })

  const isRoot = computed(() => stack.value.length <= 1)

  const activeTo = computed(() => {
    const path = route.path
    const chain = findBranch(navigationTree, path)
    return chain[chain.length - 1]?.to ?? null
  })

  const isActive = (node: DrilldownNode) => {
    const target = node.to
    if (!target) return false
    if (activeTo.value === null) return false
    if (node.exact) return matchesPath(node, route.path)
    return target === activeTo.value
  }

  const push = (node: DrilldownNode) => {
    if (node.children?.length) {
      const filteredChildren = filterByPermissions(node.children, hasPermission, isOwnerOrAdmin.value, isSalesperson.value)
      stack.value = [...stack.value, { nodes: filteredChildren, parentNode: node }]
    }
  }

  const back = () => {
    if (stack.value.length <= 1) {
      navigateTo('/')
      return
    }

    const poppedLevel = stack.value[stack.value.length - 1]
    stack.value = stack.value.slice(0, -1)

    if (stack.value.length <= 1) {
      navigateTo('/')
      return
    }

    const parentNode = poppedLevel.parentNode
    if (parentNode?.to) {
      navigateTo(parentNode.to)
    }
  }

  const goHome = () => {
    stackState.value = [{ nodes: filteredTree.value }]
  }

  const select = (node: DrilldownNode) => {
    if (node.children?.length) {
      push(node)
      const filteredChildren = filterByPermissions(node.children, hasPermission, isOwnerOrAdmin.value, isSalesperson.value)
      const resumen = filteredChildren.find(child => child.to)
      if (resumen?.to) {
        navigateTo(resumen.to)
      }
    } else if (node.to) {
      navigateTo(node.to)
    }
  }

  // Sync con la ruta: deep-link / refresh abren el nivel correcto
  watch(
    () => route.path,
    () => {
      const chain = findBranch(navigationTree, route.path)
      const levels: StackLevel[] = [{ nodes: filteredTree.value }]
      for (const node of chain) {
        if (node.children?.length) {
          levels.push({ nodes: filterByPermissions(node.children, hasPermission, isOwnerOrAdmin.value, isSalesperson.value), parentNode: node })
        }
      }
      stackState.value = levels
    },
    { immediate: true }
  )

  // Rebuild stack cuando cambian los permisos (myPermissions carga async)
  watch(
    () => filteredTree.value,
    () => {
      const chain = findBranch(navigationTree, route.path)
      const levels: StackLevel[] = [{ nodes: filteredTree.value }]
      for (const node of chain) {
        if (node.children?.length) {
          levels.push({ nodes: filterByPermissions(node.children, hasPermission, isOwnerOrAdmin.value, isSalesperson.value), parentNode: node })
        }
      }
      stackState.value = levels
    },
    { immediate: true }
  )

  return {
    stack,
    currentLevel,
    isRoot,
    activeTo,
    isActive,
    filteredTree,
    push,
    back,
    goHome,
    select
  }
}
