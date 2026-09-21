<script setup lang="ts">
import { useCashBoxes } from '~/modulos/erp/cash-boxes/composables/useCashBoxes'
import { useCurrencies } from '~/modulos/erp/currencies/composables/useCurrencies'
import type { CreateCashBoxInput, CashBoxUserRole } from '~/modulos/erp/cash-boxes/types/cash-boxes.types'

export interface CashBoxFormData {
  name: string
  currency_code: string
  type: string
  opening_balance: number
  is_main: boolean
  active: boolean
}

interface BoxUser {
  userId: string
  userName: string
  userEmail: string
  role: string
}

const props = defineProps<{
  modelValue?: CashBoxFormData
  isEdit?: boolean
  boxId?: string
  loading?: boolean
  canSetInitialBalance?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [CashBoxFormData]
  submit: [CashBoxFormData]
  cancel: []
}>()

const { addUserRole, removeUserRole } = useCashBoxes()
const { init: initCurrencies, codeSelectItems: currencyOptions } = useCurrencies()
const toast = useToast()

const defaultForm: CashBoxFormData = {
  name: '',
  currency_code: 'ARS',
  type: 'FIXED',
  opening_balance: 0,
  is_main: false,
  active: true
}

const form = reactive<CashBoxFormData>({ ...defaultForm })

const boxUsers = ref<BoxUser[]>([])
const pendingUsers = ref<BoxUser[]>([])
const userSearch = ref('')
const userResults = ref<{ id: string; name: string; email: string }[]>([])
const userSearchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const showAllUsers = ref(false)
const allUsersList = ref<{ id: string; name: string; email: string }[]>([])

const showRemoveModal = ref(false)
const userToRemove = ref<BoxUser | null>(null)

const userRoleOptions = [
  { label: 'Responsable', value: 'RESPONSIBLE' },
  { label: 'Operador', value: 'OPERATOR' },
  { label: 'Visor', value: 'VIEWER' }
]

const selectedUserRole = computed({
  get: () => userRoleOptions.find(o => o.value === selectedUserRoleRaw.value) ?? userRoleOptions[1],
  set: (val: any) => { selectedUserRoleRaw.value = val?.value ?? 'OPERATOR' }
})
const selectedUserRoleRaw = ref('OPERATOR')

const boxTypes = [
  { label: 'Principal', value: 'MAIN' },
  { label: 'Fija', value: 'FIXED' },
  { label: 'Caja registradora', value: 'REGISTER' }
]

const selectedType = computed({
  get: () => boxTypes.find(o => o.value === form.type) ?? boxTypes[1],
  set: (val: any) => { form.type = val?.value ?? 'FIXED' }
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      Object.assign(form, { ...defaultForm })
      return
    }
    Object.assign(form, val)
  },
  { immediate: true }
)

watch(form, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })

onMounted(() => {
  initCurrencies()
})

const searchUsers = () => {
  if (userSearchTimeout.value) clearTimeout(userSearchTimeout.value)
  userSearchTimeout.value = setTimeout(async () => {
    const q = userSearch.value.trim()
    if (q.length < 2) {
      userResults.value = []
      return
    }
    try {
      const users = await $fetch<{ id: string; name: string; email: string }[]>('/api/access-control/users/search', {
        query: { q }
      })
      const existingIds = new Set([
        ...boxUsers.value.map(u => u.userId),
        ...pendingUsers.value.map(u => u.userId)
      ])
      userResults.value = users.filter(u => !existingIds.has(u.id))
    } catch {
      userResults.value = []
    }
  }, 300)
}

const loadAllUsers = async () => {
  try {
    allUsersList.value = await $fetch<{ id: string; name: string; email: string }[]>('/api/access-control/users/all')
  } catch {
    allUsersList.value = []
  }
}

watch(showAllUsers, async (val) => {
  if (val && allUsersList.value.length === 0) {
    await loadAllUsers()
  }
})

const filteredAllUsers = computed(() => {
  const q = userSearch.value.toLowerCase().trim()
  const existingIds = new Set([
    ...boxUsers.value.map(u => u.userId),
    ...pendingUsers.value.map(u => u.userId)
  ])
  let users = allUsersList.value.filter(u => !existingIds.has(u.id))
  if (q) {
    users = users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
  }
  return users
})

const addUser = async (user: { id: string; name: string; email: string }) => {
  const newUser: BoxUser = {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: selectedUserRoleRaw.value
  }

  if (props.isEdit && props.boxId) {
    try {
      await addUserRole(props.boxId, user.id, selectedUserRoleRaw.value)
      boxUsers.value.push(newUser)
      toast.add({ title: `${user.name || user.email} agregado`, color: 'success' })
    } catch (e: any) {
      console.error('Error adding user role:', e)
      toast.add({ title: 'Error al agregar usuario', description: e?.data?.message || e?.message, color: 'error', icon: 'i-lucide-alert-circle' })
    }
  } else {
    pendingUsers.value.push(newUser)
    toast.add({ title: `${user.name || user.email} agregado`, color: 'success' })
  }
  userSearch.value = ''
  userResults.value = []
}

const confirmRemoveUser = (user: BoxUser) => {
  userToRemove.value = user
  showRemoveModal.value = true
}

const executeRemoveUser = async () => {
  if (!userToRemove.value) return

  const user = userToRemove.value

  if (props.isEdit && props.boxId) {
    try {
      await removeUserRole(props.boxId, user.userId)
      boxUsers.value = boxUsers.value.filter(u => u.userId !== user.userId)
      toast.add({ title: `${user.userName || user.userEmail} removido`, color: 'success' })
    } catch (e: any) {
      console.error('Error removing user role:', e)
      toast.add({ title: 'Error al remover usuario', description: e?.data?.message || e?.message, color: 'error', icon: 'i-lucide-alert-circle' })
    }
  } else {
    pendingUsers.value = pendingUsers.value.filter(u => u.userId !== user.userId)
    toast.add({ title: `${user.userName || user.userEmail} removido`, color: 'success' })
  }

  showRemoveModal.value = false
  userToRemove.value = null
}

const setBoxUsers = (users: CashBoxUserRole[]) => {
  const ids = users.map(u => u.user_id).filter(Boolean)
  console.log('[setBoxUsers] user_roles:', users, 'ids:', ids)
  if (ids.length === 0) {
    boxUsers.value = users.map(u => ({
      userId: u.user_id,
      userName: u.user_id,
      userEmail: '',
      role: u.role
    }))
    return
  }

  $fetch<{ id: string; name: string; email: string }[]>('/api/access-control/users/batch', {
    query: { ids: ids.join(',') }
  }).then((userDetails) => {
    console.log('[setBoxUsers] batch response:', userDetails)
    const userMap = new Map(userDetails.map(u => [u.id, u]))
    boxUsers.value = users.map(u => {
      const detail = userMap.get(u.user_id)
      return {
        userId: u.user_id,
        userName: detail?.name ?? u.user_id,
        userEmail: detail?.email ?? '',
        role: u.role
      }
    })
    console.log('[setBoxUsers] boxUsers set to:', boxUsers.value)
  }).catch((e) => {
    console.error('[setBoxUsers] batch error:', e)
    boxUsers.value = users.map(u => ({
      userId: u.user_id,
      userName: u.user_id,
      userEmail: '',
      role: u.role
    }))
  })
}

defineExpose({ pendingUsers, setBoxUsers, boxUsers })

const handleSubmit = () => {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <UPageCard>
      <div class="space-y-6">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-wallet-cards" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Datos de la caja</h2>
            <p class="mt-0.5 text-sm text-muted">Información general y saldo con el que comienza a operar.</p>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <UFormField label="Nombre" name="name" required description="Usá un nombre fácil de reconocer.">
            <UInput v-model="form.name" placeholder="Ej: Caja administración" class="w-full" icon="i-lucide-wallet" />
          </UFormField>
          <UFormField label="Tipo" name="type" description="Define cómo se utilizará esta caja.">
            <USelectMenu v-model="selectedType" :items="boxTypes" class="w-full" />
          </UFormField>
          <UFormField label="Moneda" name="currency_code" required description="Moneda en la que registrará sus movimientos.">
            <USelect
              v-model="form.currency_code"
              :items="currencyOptions"
              placeholder="Seleccioná una moneda"
              :disabled="isEdit"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="isEdit ? 'Saldo inicial' : 'Saldo de apertura (opcional)'"
            name="opening_balance"
            :description="isEdit && canSetInitialBalance
              ? 'Será el primer movimiento de la caja y sólo puede registrarse una vez.'
              : isEdit
                ? 'El saldo inicial ya no puede modificarse porque la caja comenzó a operar.'
                : 'Podés dejarlo en cero y establecerlo después, antes del primer movimiento.'"
          >
            <UInput
              v-model.number="form.opening_balance"
              type="number"
              min="0"
              step="0.01"
              class="w-full"
              icon="i-lucide-banknote"
              :disabled="isEdit && !canSetInitialBalance"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="isEdit && canSetInitialBalance"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Esta caja todavía no comenzó a operar"
          description="Podés registrar ahora el dinero disponible. Se asentará como el primer movimiento y luego quedará bloqueado."
        />

        <div class="flex items-center justify-between gap-4 rounded-lg border border-default bg-elevated/50 p-4">
          <div>
            <p class="text-sm font-medium text-highlighted">Caja activa</p>
            <p class="text-xs text-muted">Estará disponible para registrar operaciones.</p>
          </div>
          <USwitch v-model="form.active" color="success" aria-label="Caja activa" />
        </div>

        <!-- Configuración temporalmente oculta hasta definir el circuito de caja principal.
        <UCheckbox v-model="form.is_main" label="Caja principal" />
        -->
      </div>
    </UPageCard>

    <!-- USER ROLES -->
    <UPageCard>
      <div class="space-y-5">
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
            <UIcon name="i-lucide-users" class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">Usuarios con acceso</h2>
            <p class="mt-0.5 text-sm text-muted">Asigná quién puede administrar, operar o consultar esta caja.</p>
          </div>
        </div>

      <!-- Existing users -->
      <div v-if="boxUsers.length > 0" class="space-y-2">
        <div
          v-for="ur in boxUsers"
          :key="ur.userId"
          class="flex items-center gap-3 p-2 rounded border border-default"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium">{{ ur.userName || ur.userEmail || ur.userId }}</span>
            <span v-if="ur.userEmail && ur.userName" class="text-xs text-muted ml-1">({{ ur.userEmail }})</span>
            <UBadge
              :label="userRoleOptions.find(o => o.value === ur.role)?.label ?? ur.role"
              :color="ur.role === 'RESPONSIBLE' ? 'success' : ur.role === 'OPERATOR' ? 'primary' : 'gray'"
              size="xs"
              class="ml-2"
            />
          </div>
          <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="confirmRemoveUser(ur)" />
        </div>
      </div>

      <!-- Pending users (creating) -->
      <div v-if="pendingUsers.length > 0" class="space-y-2">
        <div
          v-for="p in pendingUsers"
          :key="p.userId"
          class="flex items-center gap-3 p-2 rounded border border-dashed border-primary"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium">{{ p.userName || p.userEmail || p.userId }}</span>
            <span v-if="p.userEmail && p.userName" class="text-xs text-muted ml-1">({{ p.userEmail }})</span>
            <UBadge
              :label="userRoleOptions.find(o => o.value === p.role)?.label ?? p.role"
              :color="p.role === 'RESPONSIBLE' ? 'success' : p.role === 'OPERATOR' ? 'primary' : 'gray'"
              size="xs"
              class="ml-2"
            />
            <UBadge label="Pendiente" color="info" size="xs" class="ml-1" />
          </div>
          <UButton icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="confirmRemoveUser(p)" />
        </div>
      </div>

      <div v-if="boxUsers.length === 0 && pendingUsers.length === 0" class="rounded-lg border border-dashed border-default px-4 py-6 text-center">
        <UIcon name="i-lucide-user-plus" class="mx-auto mb-2 size-6 text-dimmed" />
        <p class="text-sm font-medium text-highlighted">Todavía no hay usuarios asignados</p>
        <p class="mt-1 text-xs text-muted">Podés agregarlos ahora o hacerlo más adelante.</p>
      </div>

      <!-- Add user section -->
      <div class="border-t border-default pt-3 space-y-2">
        <div class="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <UFormField label="Buscar usuario" class="flex-1">
            <UInput v-model="userSearch" placeholder="Nombre o email..." class="w-full" icon="i-lucide-search" @input="searchUsers" />
          </UFormField>
          <UFormField label="Rol">
            <USelectMenu v-model="selectedUserRole" :items="userRoleOptions" class="w-full" />
          </UFormField>
        </div>

        <div v-if="userResults.length > 0" class="border border-default rounded p-2 space-y-1 max-h-40 overflow-y-auto">
          <div
            v-for="u in userResults"
            :key="u.id"
            class="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
            @click="addUser(u)"
          >
            <span class="text-sm font-medium">{{ u.name || u.email }}</span>
            <span v-if="u.name" class="text-xs text-muted">{{ u.email }}</span>
          </div>
        </div>

        <UButton
          v-if="userResults.length === 0 && !showAllUsers"
          label="Ver todos los usuarios"
          variant="ghost"
          size="xs"
          icon="i-lucide-users"
          @click="() => { showAllUsers = true }"
        />
        <UButton
          v-if="showAllUsers"
          label="Ocultar lista"
          variant="ghost"
          size="xs"
          icon="i-lucide-chevron-up"
          @click="() => { showAllUsers = false }"
        />

        <div v-if="showAllUsers && allUsersList.length > 0" class="border border-default rounded p-2 space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="u in filteredAllUsers"
            :key="u.id"
            class="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
            @click="addUser(u)"
          >
            <span class="text-sm font-medium">{{ u.name || u.email }}</span>
            <span v-if="u.name" class="text-xs text-muted">{{ u.email }}</span>
          </div>
          <div v-if="filteredAllUsers.length === 0" class="text-xs text-muted p-2 text-center">
            No hay más usuarios disponibles
          </div>
        </div>
      </div>
      </div>
    </UPageCard>

    <div class="sticky bottom-0 z-20 -mx-2 flex flex-col-reverse gap-3 border-t border-default bg-default/95 px-2 py-4 shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.45)] backdrop-blur sm:flex-row sm:justify-end">
      <UButton label="Cancelar" variant="ghost" color="neutral" :disabled="loading" class="justify-center" @click="emit('cancel')" />
      <UButton :label="isEdit ? 'Guardar cambios' : 'Crear caja'" type="submit" icon="i-lucide-check" :loading="loading" class="justify-center" />
    </div>
  </form>

  <UModal v-model:open="showRemoveModal" title="Remover usuario">
    <template #body>
      <p class="text-sm">
        Vas a remover a <strong>{{ userToRemove?.userName || userToRemove?.userEmail }}</strong> de esta caja.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancelar" variant="ghost" @click="showRemoveModal = false" />
        <UButton label="Confirmar" color="error" @click="executeRemoveUser" />
      </div>
    </template>
  </UModal>
</template>
