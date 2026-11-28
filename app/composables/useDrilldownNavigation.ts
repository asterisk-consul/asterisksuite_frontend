import type { DrilldownNode } from '~/data/navigationTree'
import { navigationTree } from '~/data/navigationTree'
import { useRoles } from '~/modulos/access-control/composables/useRoles'
import { useCompanyRole } from '~/composables/useCompanyRole'
import { useCurrentUserEmployee } from '~/composables/useCurrentUserEmployee'
import { usePlatformModulesStore } from '~/modulos/platform-modules/platform-modules.store'
import { useAuthStore } from '~/modulos/auth/auth.store'

// Tipo de nivel en el stack: nodos + referencia al nodo padre
export interface StackLevel {
  nodes: DrilldownNode[]
  parentNode?: DrilldownNode
}

interface SharedTaskNavigationAccess {
  companyId: string | null
  userId: string | null
  available: boolean
  loaded: boolean
  loading: boolean
}

function matchesPath(node: DrilldownNode, path: string, fullPath = path): boolean {
  const target = node.to
  if (!target) return false
  if (target.startsWith('http')) return false

  const targetPath = target.split('?')[0]
  if (target.includes('?')) {
    const expected = new URLSearchParams(target.split('?')[1])
    const actual = new URLSearchParams(fullPath.split('?')[1] ?? '')
    return path === targetPath && [...expected.entries()].every(([key, value]) => actual.get(key) === value)
  }
  if (node.exact) return path === targetPath
  return path === targetPath || path.startsWith(`${targetPath}/`)
}

// Prioriza la ruta coincidente más específica; la profundidad resuelve empates.
function findBranch(nodes: DrilldownNode[], path: string, fullPath = path): DrilldownNode[] {
  let best: DrilldownNode[] = []
  let bestTargetLength = -1

  const walk = (list: DrilldownNode[], chain: DrilldownNode[]) => {
    for (const node of list) {
      const next = [...chain, node]
      if (node.to && matchesPath(node, path, fullPath)) {
        const targetLocation = node.to.replace(/\/$/, '')
        const isMoreSpecific = targetLocation.length > bestTargetLength
        const isDeeperTie = targetLocation.length === bestTargetLength && next.length > best.length

        if (isMoreSpecific || isDeeperTie) {
          best = next
          bestTargetLength = targetLocation.length
        }
      }
      if (node.children?.length) {
        walk(node.children, next)
      }
    }
  }

  walk(nodes, [])
  return best
}

function findFirstDestination(nodes: DrilldownNode[]): DrilldownNode | null {
  for (const node of nodes) {
    if (node.to) return node
    if (node.children?.length) {
      const destination = findFirstDestination(node.children)
      if (destination) return destination
    }
  }
  return null
}

function moveRootNodeAfter(nodes: DrilldownNode[], label: string, anchorLabel: string): DrilldownNode[] {
  const result = [...nodes]
  const nodeIndex = result.findIndex(node => node.label === label)
  const anchorIndex = result.findIndex(node => node.label === anchorLabel)
  if (nodeIndex < 0 || anchorIndex < 0 || nodeIndex === anchorIndex) return result
  const [node] = result.splice(nodeIndex, 1)
  const nextAnchorIndex = result.findIndex(item => item.label === anchorLabel)
  result.splice(nextAnchorIndex + 1, 0, node!)
  return result
}

// Filtrar nodos recursivamente por permisos y condiciones de visibilidad
function filterNavigationTree(
  nodes: DrilldownNode[],
  hasPermission: (code: string) => boolean,
  hasModule: (code: string) => boolean,
  isOwnerOrAdmin: boolean,
  isSalesperson: boolean,
  isPlatformAdmin: boolean,
  isOwner: boolean,
  hasIntercompany: boolean
): DrilldownNode[] {
  return nodes.flatMap(node => {
    const bypassPermissions = isOwnerOrAdmin && !node.strictPermissions
    if (node.to === '/settings/trash' && !isOwner && !hasPermission('trash.read')) {
      return []
    }
    if (node.permission && !bypassPermissions && !hasPermission(node.permission)) {
      return []
    }
    if (node.permissions?.length && !bypassPermissions && !node.permissions.some(hasPermission)) {
      return []
    }
    if (node.visibleIf === 'is_salesperson' && !isSalesperson) {
      return []
    }
    if (node.visibleIf === 'is_platform_admin' && !isPlatformAdmin) return []
    if (node.visibleIf === 'has_intercompany' && !hasIntercompany) return []
    const moduleAvailable = !node.moduleCode || hasModule(node.moduleCode)
    if (node.children?.length) {
      const filteredChildren = filterNavigationTree(
        node.children,
        hasPermission,
        hasModule,
        isOwnerOrAdmin,
        isSalesperson,
        isPlatformAdmin,
        isOwner,
        hasIntercompany
      )
      return moduleAvailable && filteredChildren.length > 0 ? [{ ...node, children: filteredChildren }] : []
    }
    return moduleAvailable ? [node] : []
  })
}

export const useDrilldownNavigation = () => {
  const route = useRoute()
  const { hasPermission } = useRoles()
  const { isOwnerOrAdmin, isOwner } = useCompanyRole()
  const { isSalesperson, fetchIfNeeded } = useCurrentUserEmployee()
  const platformModules = usePlatformModulesStore()
  const auth = useAuthStore()
  const { visible: hasIntercompany } = useIntercompanyVisibility()
  const taskBoardLinks = useState<{ companyId: string | null; items: Array<{ id: string; name: string }> }>('task-sidebar-board-links', () => ({ companyId: null, items: [] }))
  const sharedTaskAccess = useState<SharedTaskNavigationAccess>('shared-task-navigation-access', () => ({ companyId: null, userId: null, available: false, loaded: false, loading: false }))
  const navigationWithTaskBoards = computed(() => navigationTree.flatMap(node => {
    if (node.label !== 'Tareas') return [node]
    const companyId = auth.selectedCompany?.id
    const userId = auth.user?.id
    const hasSharedTasks = !!companyId && !!userId
      && sharedTaskAccess.value.companyId === companyId
      && sharedTaskAccess.value.userId === userId
      && sharedTaskAccess.value.loaded
      && sharedTaskAccess.value.available
    const canReadCrmTasks = !!companyId && !!userId
      && platformModules.loadedCompanyId === companyId
      && !platformModules.error
      && platformModules.hasModule('CRM')
      && (isOwner.value || hasPermission('tasks.read'))

    if (!canReadCrmTasks) {
      return hasSharedTasks
        ? [{ ...node, label: 'Tareas compartidas', icon: 'i-lucide-share-2', moduleCode: undefined, permission: undefined, to: '/erp/tasks/shared', children: undefined }]
        : []
    }
    return [{
      ...node,
      children: [
        { label: 'Todos los tableros', icon: 'i-lucide-layout-dashboard', to: '/erp/tasks' },
        ...(hasSharedTasks
          ? [{ label: 'Tareas compartidas', icon: 'i-lucide-share-2', to: '/erp/tasks/shared' }]
          : []),
        ...(taskBoardLinks.value.companyId === companyId ? taskBoardLinks.value.items : []).map(board => ({
          label: board.name,
          icon: 'i-lucide-kanban',
          to: `/erp/tasks?board_id=${encodeURIComponent(board.id)}`,
        })),
      ],
    }]
  }))
  const isPlatformAdmin = computed(() => ['PLATFORM_OWNER', 'PLATFORM_ADMIN'].includes(auth.user?.role ?? ''))
  const hasAvailableModule = (code: string) => {
    const companyId = auth.selectedCompany?.id
    // Durante una carga fallida o sin empresa activa se conserva la navegación;
    // el backend sigue siendo la autoridad para permitir o rechazar la operación.
    if (!companyId || platformModules.loadedCompanyId !== companyId || platformModules.error) return true
    return platformModules.hasModule(code)
  }

  async function refreshSharedTaskAccess() {
    if (!import.meta.client) return
    const companyId = auth.selectedCompany?.id ?? null
    const userId = auth.user?.id ?? null
    if (sharedTaskAccess.value.companyId !== companyId || sharedTaskAccess.value.userId !== userId) {
      sharedTaskAccess.value = { companyId, userId, available: false, loaded: false, loading: false }
    }
    if (!companyId || !userId || platformModules.loadedCompanyId !== companyId || platformModules.error) return
    if (sharedTaskAccess.value.loaded || sharedTaskAccess.value.loading) return

    sharedTaskAccess.value = { companyId, userId, available: false, loaded: false, loading: true }
    const requestAccess = sharedTaskAccess.value
    const isCurrentRequest = () => sharedTaskAccess.value === requestAccess
      && auth.selectedCompany?.id === companyId && auth.user?.id === userId
    try {
      const available = await $fetch<boolean>('/api/backend/erp/tasks/shared/available')
      if (isCurrentRequest()) sharedTaskAccess.value = { companyId, userId, available, loaded: true, loading: false }
    } catch {
      if (isCurrentRequest()) sharedTaskAccess.value = { companyId, userId, available: false, loaded: true, loading: false }
    }
  }

  watch(() => [auth.selectedCompany?.id, auth.user?.id, platformModules.loadedCompanyId, platformModules.error], () => { void refreshSharedTaskAccess() }, { immediate: true })

  // Cargar el empleado del usuario actual (define is_salesperson para visibleIf)
  // Solo hace el fetch una vez; el watch de filteredTree reconstruye el nav cuando llega
  onMounted(() => {
    fetchIfNeeded()
  })

  const filteredTree = computed(() => {
    const visibleNodes = filterNavigationTree(
      navigationWithTaskBoards.value,
      hasPermission,
      hasAvailableModule,
      isOwnerOrAdmin.value,
      isSalesperson.value,
      isPlatformAdmin.value,
      isOwner.value,
      hasIntercompany.value
    )
    const taskLabel = visibleNodes.some(node => node.label === 'Tareas') ? 'Tareas' : 'Tareas compartidas'
    return moveRootNodeAfter(
      moveRootNodeAfter(visibleNodes, taskLabel, 'Tesorería'),
      'Reportes',
      'Stock',
    )
  })

  // Stack: cada nivel tiene nodos + referencia al nodo padre
  const stackState = useState<StackLevel[]>('drilldown-stack', () => [{ nodes: filteredTree.value }])

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
    const chain = findBranch(filteredTree.value, path, route.fullPath)
    return chain[chain.length - 1]?.to ?? null
  })

  const isActive = (node: DrilldownNode) => {
    const target = node.to
    if (!target) return false
    if (activeTo.value === null) return false
    if (node.exact) return matchesPath(node, route.path, route.fullPath)
    return target === activeTo.value
  }

  const push = (node: DrilldownNode) => {
    if (node.children?.length) {
      const filteredChildren = filterNavigationTree(
        node.children,
        hasPermission,
        hasAvailableModule,
        isOwnerOrAdmin.value,
        isSalesperson.value,
        isPlatformAdmin.value,
        isOwner.value,
        hasIntercompany.value
      )
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

    const parentNode = poppedLevel?.parentNode
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
      const filteredChildren = filterNavigationTree(
        node.children,
        hasPermission,
        hasAvailableModule,
        isOwnerOrAdmin.value,
        isSalesperson.value,
        isPlatformAdmin.value,
        isOwner.value,
        hasIntercompany.value
      )
      const destination = findFirstDestination(filteredChildren)
      if (destination?.to) {
        void navigateTo(destination.to)
      }
    } else if (node.to) {
      void navigateTo(node.to)
    }
  }

  // Sync con la ruta: deep-link / refresh abren el nivel correcto
  watch(
    () => route.fullPath,
    () => {
      const chain = findBranch(filteredTree.value, route.path, route.fullPath)
      const levels: StackLevel[] = [{ nodes: filteredTree.value }]
      for (const node of chain) {
        if (node.children?.length) {
          levels.push({
            nodes: filterNavigationTree(
              node.children,
              hasPermission,
              hasAvailableModule,
              isOwnerOrAdmin.value,
              isSalesperson.value,
              isPlatformAdmin.value,
              isOwner.value,
              hasIntercompany.value
            ),
            parentNode: node
          })
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
      const chain = findBranch(filteredTree.value, route.path, route.fullPath)
      const levels: StackLevel[] = [{ nodes: filteredTree.value }]
      for (const node of chain) {
        if (node.children?.length) {
          levels.push({
            nodes: filterNavigationTree(
              node.children,
              hasPermission,
              hasAvailableModule,
              isOwnerOrAdmin.value,
              isSalesperson.value,
              isPlatformAdmin.value,
              isOwner.value,
              hasIntercompany.value
            ),
            parentNode: node
          })
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
