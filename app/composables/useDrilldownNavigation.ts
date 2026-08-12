import type { DrilldownNode } from '~/data/navigationTree'
import { navigationTree } from '~/data/navigationTree'

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

export const useDrilldownNavigation = () => {
  const route = useRoute()

  // Estado compartido de la pila de niveles (persiste entre montajes de layout)
  const stackState = useState<DrilldownNode[][]>('drilldown-stack', () => [navigationTree])

  // stack[0] = raíz; cada push agrega un nivel con los children del nodo
  const stack = computed<DrilldownNode[][]>({
    get: () => stackState.value,
    set: (v) => { stackState.value = v }
  })

  const currentLevel = computed<DrilldownNode[]>(() => {
    const s = stack.value
    return s[s.length - 1] ?? []
  })

  const isRoot = computed(() => stack.value.length <= 1)

  // Nodo activo = el más profundo que matchea la ruta actual
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
      stack.value = [...stack.value, node.children]
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

    const parentLevel = stack.value[stack.value.length - 2]
    const currentLevel = stack.value[stack.value.length - 1]
    const parentNode = parentLevel?.find(n => n.children === currentLevel)

    if (parentNode?.to) {
      navigateTo(parentNode.to)
    }
  }

  const goHome = () => {
    stack.value = [navigationTree]
  }

  // Seleccionar item: si tiene children profundiza Y navega al primer hijo con `to`; si tiene `to` navega
  const select = (node: DrilldownNode) => {
    if (node.children?.length) {
      push(node)
      const resumen = node.children.find(child => child.to)
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
    (path) => {
      const chain = findBranch(navigationTree, path)
      const levels: DrilldownNode[][] = [navigationTree]
      for (const node of chain) {
        if (node.children?.length) {
          levels.push(node.children)
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
    push,
    back,
    goHome,
    select
  }
}
