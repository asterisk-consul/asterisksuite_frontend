export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface Account {
  id: string

  code: string
  name: string

  account_type: AccountType

  parent_id?: string | null

  active?: boolean

  parent?: Account | null
  children?: Account[]

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CreateAccountInput {
  code: string
  name: string

  account_type: AccountType

  parent_id?: string

  active?: boolean
}

export interface UpdateAccountInput
  extends Partial<CreateAccountInput> {}
