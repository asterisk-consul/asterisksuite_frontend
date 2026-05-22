import type { Account } from '../types/accounts.types'

export interface AccountTreeNode extends Account {
  children: AccountTreeNode[]
  level: number
}

/**
 * Construye un árbol jerárquico de cuentas
 */
export const buildAccountTree = (
  accounts: Account[]
): AccountTreeNode[] => {
  const map = new Map<string, AccountTreeNode>()

  // =========================
  // CREATE MAP
  // =========================

  for (const account of accounts) {
    map.set(account.id, {
      ...account,
      children: [],
      level: 0
    })
  }

  const roots: AccountTreeNode[] = []

  // =========================
  // BUILD TREE
  // =========================

  for (const account of map.values()) {
    if (account.parent_id) {
      const parent = map.get(account.parent_id)

      if (parent) {
        account.level = parent.level + 1

        parent.children.push(account)
      } else {
        roots.push(account)
      }
    } else {
      roots.push(account)
    }
  }

  // =========================
  // SORT RECURSIVE
  // =========================

  const sortTree = (nodes: AccountTreeNode[]) => {
    nodes.sort((a, b) =>
      a.code.localeCompare(b.code)
    )

    for (const node of nodes) {
      sortTree(node.children)
    }
  }

  sortTree(roots)

  return roots
}

/**
 * Convierte árbol -> lista plana
 */
export const flattenAccountTree = (
  tree: AccountTreeNode[]
): AccountTreeNode[] => {
  const result: AccountTreeNode[] = []

  const walk = (nodes: AccountTreeNode[]) => {
    for (const node of nodes) {
      result.push(node)

      if (node.children.length) {
        walk(node.children)
      }
    }
  }

  walk(tree)

  return result
}

/**
 * Busca todos los hijos recursivos
 */
export const getDescendantAccounts = (
  accountId: string,
  accounts: Account[]
): Account[] => {
  const result: Account[] = []

  const walk = (parentId: string) => {
    const children = accounts.filter(
      (a) => a.parent_id === parentId
    )

    for (const child of children) {
      result.push(child)

      walk(child.id)
    }
  }

  walk(accountId)

  return result
}

/**
 * Obtiene todas las cuentas hoja
 * (sin hijos)
 */
export const getLeafAccounts = (
  accounts: Account[]
): Account[] => {
  const parentIds = new Set(
    accounts
      .filter((a) => a.parent_id)
      .map((a) => a.parent_id)
  )

  return accounts.filter(
    (a) => !parentIds.has(a.id)
  )
}
