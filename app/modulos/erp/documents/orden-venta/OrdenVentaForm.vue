<script setup lang="ts">
import { DocumentsSalesService, type SalespersonOption } from '~/modulos/erp/sales/services/sales.service'
import { useEmployeesService } from '~/modulos/erp/employees/service/employees.service'
import { useBusinessPartiesService } from '~/modulos/logistica/master-data/bussiness-parties/bussines-parties.service'
import { useLocationsService } from '~/modulos/logistica/master-data/locations/locations.service'
import { partyContactsService } from '~/modulos/logistica/master-data/contacts/service/contacts.service'
import { useRoles } from '~/modulos/access-control/composables/useRoles'

const props = defineProps<{
  modelValue?: any
  loading?: boolean
  showActions?: boolean
  requireDeliveryAddress?: boolean
  defaultSellerToCurrent?: boolean
  partyId?: string | null
}>()

const emit = defineEmits<{
  submit: [any]
  cancel: []
  'update:modelValue': [value: Record<string, any>]
}>()

const noSellerId = '__NO_SELLER__'
const maxDeliveryPhones = 10
const phoneMaxLength = 30
const employeesService = useEmployeesService()
const businessPartiesService = useBusinessPartiesService()
const locationsService = useLocationsService()
const { hasPermission, fetchMyPermissionsIfNeeded, myPermissions } = useRoles()
const { isOwnerOrAdmin } = useCompanyRole()
const salespeople = ref<SalespersonOption[]>([])
const sellerOptionsLoading = ref(false)
const sellerOptionsFailed = ref(false)
const sellerOptions = computed(() => [
  { id: noSellerId, name: 'Sin vendedor' },
  ...salespeople.value.map(seller => ({
    id: `${seller.seller_type}:${seller.id}`,
    name: `${seller.first_name} ${seller.last_name}`.trim()
      + (seller.seller_type === 'PARTNER' ? ' · Socio' : ' · Empleado'),
  })),
])

const form = reactive({
  priority: 'MEDIA',
  seller_id: noSellerId,
  seller_type: 'EMPLOYEE' as 'EMPLOYEE' | 'PARTNER',
  delivery_address: '',
  delivery_contact: '',
  delivery_phones: [''],
  delivery_time: '',
  delivery_instructions: '',
  transport_provider: '',
  confirmed_delivery_date: ''
})
const selectedSeller = computed({
  get: () => form.seller_id === noSellerId ? noSellerId : `${form.seller_type}:${form.seller_id}`,
  set: (value: string) => {
    if (!value || value === noSellerId) {
      form.seller_id = noSellerId
      form.seller_type = 'EMPLOYEE'
      return
    }
    const [type, id] = value.split(':', 2)
    form.seller_id = id ?? noSellerId
    form.seller_type = type === 'PARTNER' ? 'PARTNER' : 'EMPLOYEE'
  },
})
const deliveryValidationVisible = ref(false)
const deliverySectionOpen = ref(false)
const deliveryPickerOpen = ref(false)
const deliveryPickerKind = ref<'location' | 'contact'>('location')
const deliveryPickerSearch = ref('')
const deliveryPickerAddingNew = ref(false)
const deliveryItemSaving = ref(false)
const deliveryItemError = ref('')
const deliveryItemSubmitted = ref(false)
const locationDraft = reactive({ label: '', address: '', city: '', province: '', country: '', postalCode: '' })
const contactDraft = reactive({ first_name: '', last_name: '', role: '', phone: '', email: '' })
const deliveryTouched = reactive({
  priority: false,
  address: false,
  contact: false,
  time: false,
  transport: false,
  date: false,
})
const phoneTouched = ref<Record<number, boolean>>({})
const savedPartyDetails = ref<any>(null)
const savedPartyDetailsLoading = ref(false)
const savedPartyDetailsFailed = ref(false)
const remoteDeliveryLocations = ref<any[]>([])
const locationsSearchLoading = ref(false)
const locationsSearchFailed = ref(false)
const permissionCheckPending = ref(false)
const permissionCheckFailed = ref(false)
let partyDetailsRequestId = 0
let locationsSearchRequestId = 0
let locationsSearchController: AbortController | null = null
let deliveryFormMounted = false
const hasDeliveryDetails = computed(() => [
  form.delivery_address,
  form.delivery_contact,
  ...form.delivery_phones,
  form.delivery_time,
  form.delivery_instructions,
  form.transport_provider,
  form.confirmed_delivery_date
].some(value => String(value ?? '').trim() !== ''))

const phoneErrors = computed(() => form.delivery_phones.map((phone, index) => {
  if ((!deliveryValidationVisible.value && !phoneTouched.value[index]) || !phone) return ''
  return phone.length > phoneMaxLength
    ? `Cada teléfono admite hasta ${phoneMaxLength} caracteres.`
    : ''
}))
const phoneCount = computed(() => form.delivery_phones.filter(phone => phone.trim()).length)
const canAddDeliveryLocation = computed(() => isOwnerOrAdmin.value || (Boolean(myPermissions.value) && hasPermission('business_parties.update') && hasPermission('locations.create')))
const canAddDeliveryContact = computed(() => isOwnerOrAdmin.value || (Boolean(myPermissions.value) && hasPermission('contacts.create')))
const canSearchDeliveryLocations = computed(() => isOwnerOrAdmin.value || (Boolean(myPermissions.value) && hasPermission('locations.read')))
const canLinkExistingDeliveryLocation = computed(() => isOwnerOrAdmin.value || (Boolean(myPermissions.value) && hasPermission('business_parties.update')))
const deliveryItemCanBeAdded = computed(() => deliveryPickerKind.value === 'location' ? canAddDeliveryLocation.value : canAddDeliveryContact.value)
const deliveryItemValidationErrors = computed(() => {
  if (deliveryPickerKind.value === 'location') {
    return {
      label: locationDraft.label.length > 100 ? 'La etiqueta admite hasta 100 caracteres.' : '',
      address: !locationDraft.address.trim() ? 'Ingresá una dirección.' : locationDraft.address.length > 255 ? 'La dirección admite hasta 255 caracteres.' : '',
      city: locationDraft.city.length > 100 ? 'La localidad admite hasta 100 caracteres.' : '',
      province: locationDraft.province.length > 100 ? 'La provincia admite hasta 100 caracteres.' : '',
      country: locationDraft.country.length > 100 ? 'El país admite hasta 100 caracteres.' : '',
      postalCode: locationDraft.postalCode.length > 20 ? 'El código postal admite hasta 20 caracteres.' : '',
    }
  }
  return {
    first_name: !contactDraft.first_name.trim() ? 'Ingresá el nombre.' : contactDraft.first_name.length > 100 ? 'El nombre admite hasta 100 caracteres.' : '',
    last_name: contactDraft.last_name.length > 100 ? 'El apellido admite hasta 100 caracteres.' : '',
    role: contactDraft.role.length > 100 ? 'El cargo admite hasta 100 caracteres.' : '',
    phone: contactDraft.phone.length > 50 ? 'El teléfono admite hasta 50 caracteres.' : '',
    email: contactDraft.email.length > 150 ? 'El email admite hasta 150 caracteres.' : contactDraft.email && !/^\S+@\S+\.\S+$/.test(contactDraft.email) ? 'Ingresá un email válido.' : '',
  }
})
const deliveryItemHasValidationErrors = computed(() => Object.values(deliveryItemValidationErrors.value).some(Boolean))

const savedDeliveryLocations = computed(() => (savedPartyDetails.value?.party_locations ?? [])
  .filter((link: any) => !link.deleted_at)
  .map((link: any) => {
    const location = link.locations ?? link.location ?? {}
    if (location.deleted_at) return null
    const address = [location.address, location.postal_code ?? location.postalCode, location.city, location.province, location.country]
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .join(', ')
    const value = address || link.label || ''
    if (!value) return null
    return {
      label: link.label || value,
      detail: link.label && address && link.label !== address ? address : '',
      value: link.id ?? link.location_id ?? value,
      locationId: link.location_id ?? location.id,
      address: value,
      isLinked: true,
    }
  })
  .filter((option: any): option is { label: string; detail: string; value: string; locationId?: string; address: string; isLinked: boolean } => Boolean(option)))

const savedDeliveryContacts = computed(() => (savedPartyDetails.value?.party_contacts ?? [])
  .filter((contact: any) => !contact.deleted_at)
  .map((contact: any) => {
    const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
    if (!name) return null
    return {
      label: name,
      value: contact.id ?? name,
      name,
      role: typeof contact.role === 'string' ? contact.role : '',
      phone: typeof contact.phone === 'string' ? contact.phone.trim() : '',
      email: typeof contact.email === 'string' ? contact.email.trim() : '',
    }
  })
  .filter((option: any): option is { label: string; value: string; name: string; role: string; phone: string; email: string } => Boolean(option)))

const deliveryPickerTitle = computed(() => deliveryPickerKind.value === 'location' ? 'Direcciones guardadas' : 'Contactos del cliente')
const deliveryPickerDescription = computed(() => deliveryPickerKind.value === 'location'
  ? 'Buscá una ubicación del catálogo o elegí una que ya esté asociada al cliente. Se copia a la OV y, con permiso, también se asocia al cliente.'
  : 'Elegí un contacto asociado al cliente. Se copiarán su nombre y, si está cargado, su teléfono principal.')
const deliveryPickerOptions = computed<any[]>(() => {
  let options: any[]
  if (deliveryPickerKind.value === 'location') {
    const linkedByLocationId = new Map<string, any>()
    for (const location of savedDeliveryLocations.value) {
      if (location.locationId) linkedByLocationId.set(location.locationId, location)
    }
    const fromCatalog = remoteDeliveryLocations.value.map((location: any) => {
      const address = [location.address, location.postal_code ?? location.postalCode, location.city, location.province, location.country]
        .filter((value: unknown): value is string => typeof value === 'string' && value.trim() !== '')
        .join(', ')
      const linked = linkedByLocationId.get(location.id)
      return {
        label: linked?.label ?? (address || 'Ubicación sin dirección'),
        detail: linked?.label && linked.label !== address ? address : (linked ? 'Asociada al cliente' : 'Catálogo de ubicaciones'),
        value: linked?.value ?? location.id,
        locationId: location.id,
        address,
        isLinked: Boolean(linked),
      }
    })
    const catalogIds = new Set(fromCatalog.map(option => option.locationId))
    options = [...fromCatalog, ...savedDeliveryLocations.value.filter((location: any) => !catalogIds.has(location.locationId))]
  } else {
    options = savedDeliveryContacts.value
  }
  const query = deliveryPickerSearch.value.trim().toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (!query) return options
  return options.filter((option: any) => [option.label, option.detail, option.address, option.role, option.phone, option.email]
    .filter(Boolean)
    .some(value => String(value).toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query)))
})
const deliveryPickerEmptyMessage = computed(() => {
  if (deliveryPickerKind.value === 'location' && !canSearchDeliveryLocations.value) return 'No tenés permiso para buscar en el catálogo de ubicaciones. Podés elegir una dirección asociada al cliente o agregar una solo para esta OV.'
  if (deliveryPickerKind.value === 'location' && locationsSearchFailed.value) return 'No se pudo consultar el catálogo de ubicaciones. Revisá tu conexión o completá la dirección manualmente.'
  if (savedPartyDetailsFailed.value) return 'No se pudieron cargar los datos guardados del cliente. Podés completar el campo manualmente o agregar un dato a su ficha si tenés permiso.'
  if (!props.partyId) return 'Seleccioná un cliente para buscar sus datos guardados o agregá un dato solo para esta OV.'
  if (deliveryPickerSearch.value.trim()) return 'No hay coincidencias. Probá con otro texto, agregá un dato a la ficha o completalo manualmente.'
  return deliveryPickerKind.value === 'location'
    ? 'Este cliente no tiene direcciones guardadas. Podés agregar una a su ficha o escribirla manualmente para esta OV.'
    : 'Este cliente no tiene contactos guardados. Podés agregar uno a su ficha o escribir el nombre y teléfono para esta OV.'
})

async function loadSavedPartyDetails(partyId?: string | null) {
  const requestId = ++partyDetailsRequestId
  savedPartyDetails.value = null
  savedPartyDetailsFailed.value = false
  if (!partyId) {
    savedPartyDetailsLoading.value = false
    return
  }

  savedPartyDetailsLoading.value = true
  try {
    const party = await businessPartiesService.findOne(partyId)
    if (requestId === partyDetailsRequestId) savedPartyDetails.value = party
  } catch {
    if (requestId === partyDetailsRequestId) savedPartyDetailsFailed.value = true
  } finally {
    if (requestId === partyDetailsRequestId) savedPartyDetailsLoading.value = false
  }
}

watch(
  [deliveryPickerOpen, deliveryPickerKind, deliveryPickerSearch, canSearchDeliveryLocations],
  ([isOpen, kind, query, canSearch], _previous, onCleanup) => {
    if (!isOpen || kind !== 'location' || !canSearch) {
      locationsSearchRequestId++
      locationsSearchController?.abort()
      locationsSearchController = null
      locationsSearchLoading.value = false
      return
    }

    const requestId = ++locationsSearchRequestId
    locationsSearchLoading.value = true
    locationsSearchFailed.value = false
    const timer = setTimeout(async () => {
      const controller = new AbortController()
      locationsSearchController = controller
      try {
        const results = await locationsService.search(String(query ?? ''), 50, controller.signal)
        if (requestId === locationsSearchRequestId) remoteDeliveryLocations.value = results
      } catch {
        if (requestId === locationsSearchRequestId && !controller.signal.aborted) locationsSearchFailed.value = true
      } finally {
        if (requestId === locationsSearchRequestId) {
          locationsSearchLoading.value = false
          if (locationsSearchController === controller) locationsSearchController = null
        }
      }
    }, 250)

    onCleanup(() => {
      clearTimeout(timer)
      locationsSearchController?.abort()
      locationsSearchController = null
    })
  }
)

async function selectDeliveryLocation(option: any) {
  if (option.isLinked) {
    applySavedDeliveryLocation(option.value)
    return
  }

  if (props.partyId && canLinkExistingDeliveryLocation.value && option.locationId) {
    try {
      await businessPartiesService.linkLocation(props.partyId, { location_id: option.locationId })
      void loadSavedPartyDetails(props.partyId)
    } catch (error: any) {
      useToast().add({
        title: 'No se pudo vincular la dirección',
        description: error?.data?.message || error?.message || 'La dirección igual se cargará en esta OV.',
        color: 'warning',
      })
    }
  }

  form.delivery_address = option.address
  deliveryTouched.address = true
  deliveryPickerOpen.value = false
}

function applySavedDeliveryLocation(locationId: string) {
  const location = savedDeliveryLocations.value.find((item: any) => item.value === locationId)
  if (!location) return
  form.delivery_address = location.address
  deliveryTouched.address = true
  deliveryPickerOpen.value = false
}

function applySavedDeliveryContact(contactId: string) {
  const contact = savedDeliveryContacts.value.find((item: any) => item.value === contactId)
  if (!contact) return
  form.delivery_contact = contact.name
  deliveryTouched.contact = true
  if (contact.phone) {
    form.delivery_phones = [contact.phone]
    phoneTouched.value = { 0: true }
  }
  deliveryPickerOpen.value = false
}

function openDeliveryPicker(kind: 'location' | 'contact') {
  deliveryPickerKind.value = kind
  deliveryPickerSearch.value = (kind === 'location' ? form.delivery_address : form.delivery_contact).trim()
  deliveryPickerAddingNew.value = false
  deliveryItemError.value = ''
  deliveryItemSubmitted.value = false
  deliveryPickerOpen.value = true
}

function closeDeliveryPicker() {
  deliveryPickerOpen.value = false
  deliveryPickerAddingNew.value = false
}

function startAddingDeliveryItem() {
  deliveryItemError.value = ''
  deliveryItemSubmitted.value = false
  const typed = deliveryPickerSearch.value.trim()
  const [firstName = '', ...lastName] = typed.split(/\s+/)
  Object.assign(locationDraft, { label: '', address: typed, city: '', province: '', country: '', postalCode: '' })
  Object.assign(contactDraft, { first_name: firstName, last_name: lastName.join(' '), role: '', phone: form.delivery_phones.find(phone => phone.trim())?.trim() ?? '', email: '' })
  deliveryPickerAddingNew.value = true
}

function useDeliveryItemForOrder() {
  deliveryItemSubmitted.value = true
  deliveryItemError.value = ''
  if (deliveryItemHasValidationErrors.value) return

  if (deliveryPickerKind.value === 'location') {
    form.delivery_address = [locationDraft.address, locationDraft.postalCode, locationDraft.city, locationDraft.province, locationDraft.country]
      .map(value => value.trim()).filter(Boolean).join(', ')
    deliveryTouched.address = true
  } else {
    form.delivery_contact = [contactDraft.first_name, contactDraft.last_name].map(value => value.trim()).filter(Boolean).join(' ')
    deliveryTouched.contact = true
    if (contactDraft.phone.trim()) {
      form.delivery_phones = [contactDraft.phone.trim()]
      phoneTouched.value = { 0: true }
    }
  }
  closeDeliveryPicker()
}

async function saveDeliveryItem() {
  deliveryItemSubmitted.value = true
  deliveryItemError.value = ''
  if (!props.partyId) {
    deliveryItemError.value = 'Seleccioná un cliente antes de guardar datos en su ficha.'
    return
  }
  if (!deliveryItemCanBeAdded.value) {
    deliveryItemError.value = deliveryPickerKind.value === 'location'
      ? 'No tenés permisos para modificar la ficha del cliente y crear ubicaciones.'
      : 'No tenés permiso para crear contactos.'
    return
  }
  if (deliveryItemHasValidationErrors.value) return

  deliveryItemSaving.value = true
  try {
    if (deliveryPickerKind.value === 'location') {
      const created = await businessPartiesService.addLocation(props.partyId, {
        label: locationDraft.label.trim() || undefined,
        address: locationDraft.address.trim(),
        city: locationDraft.city.trim() || undefined,
        province: locationDraft.province.trim() || undefined,
        country: locationDraft.country.trim() || undefined,
        postalCode: locationDraft.postalCode.trim() || undefined,
      })
      const location = created?.locations ?? created?.location ?? {}
      const address = [location.address, location.postal_code ?? location.postalCode, location.city, location.province, location.country]
        .filter((value: unknown): value is string => typeof value === 'string' && value.trim() !== '')
        .join(', ')
      if (address) {
        form.delivery_address = address
        deliveryTouched.address = true
        deliveryPickerOpen.value = false
        deliveryPickerAddingNew.value = false
      } else {
        deliveryPickerAddingNew.value = false
      }
      void loadSavedPartyDetails(props.partyId)
    } else {
      const created = await partyContactsService.create({
        party_id: props.partyId,
        first_name: contactDraft.first_name.trim(),
        last_name: contactDraft.last_name.trim(),
        role: contactDraft.role.trim() || undefined,
        phone: contactDraft.phone.trim() || undefined,
        email: contactDraft.email.trim() || undefined,
      })
      form.delivery_contact = [created?.first_name ?? contactDraft.first_name.trim(), created?.last_name ?? contactDraft.last_name.trim()].filter(Boolean).join(' ')
      deliveryTouched.contact = true
      const phone = created?.phone ?? contactDraft.phone.trim()
      if (phone) {
        form.delivery_phones = [phone]
        phoneTouched.value = { 0: true }
      }
      deliveryPickerOpen.value = false
      deliveryPickerAddingNew.value = false
      void loadSavedPartyDetails(props.partyId)
    }
  } catch (error: any) {
    deliveryItemError.value = error?.data?.message || error?.message || 'No se pudo guardar en la ficha del cliente.'
  } finally {
    deliveryItemSaving.value = false
  }
}

function touchDeliveryField(field: keyof typeof deliveryTouched) {
  deliveryTouched[field] = true
}

function touchPhone(index: number) {
  phoneTouched.value[index] = true
}

function deliveryItemFieldError(field: string) {
  return deliveryItemSubmitted.value
    ? (deliveryItemValidationErrors.value as any)[field] || ''
    : ''
}

function counterClass(value: string, limit: number) {
  if (value.length > limit) return 'text-error'
  if (value.length >= limit * 0.9) return 'text-warning'
  return 'text-muted'
}

watch(() => props.partyId, (partyId) => {
  if (deliveryFormMounted) void loadSavedPartyDetails(partyId)
})

onMounted(() => {
  deliveryFormMounted = true
  permissionCheckPending.value = true
  void fetchMyPermissionsIfNeeded()
    .catch(() => { permissionCheckFailed.value = true })
    .finally(() => { permissionCheckPending.value = false })
  void loadSavedPartyDetails(props.partyId)
})

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const deliveryErrors = computed(() => {
  const validPriorities = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE']
  const dateIsValid = !form.confirmed_delivery_date || isValidDateOnly(form.confirmed_delivery_date)
  const show = (field: keyof typeof deliveryTouched) => deliveryValidationVisible.value || deliveryTouched[field]

  return {
    priority: !show('priority') || validPriorities.includes(form.priority) ? '' : 'Elegí una prioridad válida.',
    address: !show('address') ? '' : form.delivery_address.length > 300
      ? 'La dirección admite hasta 300 caracteres.'
      : props.requireDeliveryAddress && !form.delivery_address.trim()
        ? 'Ingresá la dirección de entrega.'
        : '',
    contact: !show('contact') || form.delivery_contact.length <= 100 ? '' : 'El contacto admite hasta 100 caracteres.',
    time: !show('time') || form.delivery_time.length <= 100 ? '' : 'El tiempo de entrega admite hasta 100 caracteres.',
    transport: !show('transport') || form.transport_provider.length <= 100 ? '' : 'El transporte admite hasta 100 caracteres.',
    date: !show('date') || dateIsValid ? '' : 'Ingresá una fecha de entrega válida.',
  }
})
const deliverySectionBadge = computed(() => {
  if (props.requireDeliveryAddress && !form.delivery_address.trim()) {
    return {
      label: deliveryErrors.value.address ? 'Falta completar dirección' : 'Dirección requerida',
      color: 'warning' as const,
    }
  }
  if (form.delivery_address.trim()) return { label: 'Destino cargado', color: 'success' as const }
  return { label: hasDeliveryDetails.value ? 'Datos opcionales cargados' : 'Datos opcionales', color: 'neutral' as const }
})

function deliveryPhoneValues(value: any, legacyValue: any): string[] {
  if (Array.isArray(value)) {
    const phones = value.map((phone: unknown) => typeof phone === 'string' ? phone : '')
    if (phones.length) return phones.slice(0, maxDeliveryPhones)
  }
  if (typeof legacyValue === 'string' && legacyValue.trim()) return [legacyValue]
  return ['']
}

function addDeliveryPhone() {
  if (form.delivery_phones.length < maxDeliveryPhones) form.delivery_phones.push('')
}

function removeDeliveryPhone(index: number) {
  if (form.delivery_phones.length > 1) form.delivery_phones.splice(index, 1)
  else form.delivery_phones[0] = ''
  const nextTouched: Record<number, boolean> = {}
  for (const [rawIndex, touched] of Object.entries(phoneTouched.value)) {
    const phoneIndex = Number(rawIndex)
    if (phoneIndex < index) nextTouched[phoneIndex] = touched
    else if (phoneIndex > index) nextTouched[phoneIndex - 1] = touched
  }
  phoneTouched.value = nextTouched
}

function onDeliverySectionToggle(event: Event) {
  deliverySectionOpen.value = (event.currentTarget as HTMLDetailsElement).open
}

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return

    const nextValues = {
      priority: val.priority ?? 'MEDIA',
      seller_id: val.seller_type === 'PARTNER'
        ? val.seller_partner_id ?? val.seller_id ?? noSellerId
        : val.seller_id ?? noSellerId,
      seller_type: val.seller_type === 'PARTNER' ? 'PARTNER' : 'EMPLOYEE',
      delivery_address: val.delivery_address ?? '',
      delivery_contact: val.delivery_contact ?? '',
      delivery_phones: deliveryPhoneValues(val.delivery_phones, val.delivery_phone),
      delivery_time: val.delivery_time ?? '',
      delivery_instructions: val.delivery_instructions ?? '',
      transport_provider: val.transport_provider ?? '',
      confirmed_delivery_date: val.confirmed_delivery_date ? String(val.confirmed_delivery_date).slice(0, 10) : ''
    }
    for (const [key, nextValue] of Object.entries(nextValues)) {
      const currentValue = (form as any)[key]
      const equal = Array.isArray(nextValue) && Array.isArray(currentValue)
        ? nextValue.length === currentValue.length && nextValue.every((item, index) => item === currentValue[index])
        : nextValue === currentValue
      if (!equal) (form as any)[key] = nextValue
    }
    if (hasDeliveryDetails.value) deliverySectionOpen.value = true
  },
  { immediate: true }
)

onMounted(async () => {
  sellerOptionsLoading.value = true
  sellerOptionsFailed.value = false
  try {
    salespeople.value = await DocumentsSalesService.getSalespeople()
  } catch {
    sellerOptionsFailed.value = true
    return
  } finally {
    sellerOptionsLoading.value = false
  }

  if (!props.defaultSellerToCurrent || form.seller_id !== noSellerId) return
  try {
    const currentEmployee = await employeesService.findCurrentUser()
    if (currentEmployee?.is_salesperson && salespeople.value.some(seller => seller.seller_type === 'EMPLOYEE' && seller.id === currentEmployee.id)) {
      form.seller_id = currentEmployee.id
      form.seller_type = 'EMPLOYEE'
    }
  } catch {
    // La asignación automática es una ayuda; el vendedor se puede elegir manualmente.
  }
})

watch(form, (value) => {
  const currentModel = props.modelValue ?? {}
  const hasDifferences = Object.entries(value).some(([key, nextValue]) => {
    const currentValue = (currentModel as any)[key]
    return Array.isArray(nextValue) && Array.isArray(currentValue)
      ? nextValue.length !== currentValue.length || nextValue.some((item, index) => item !== currentValue[index])
      : nextValue !== currentValue
  })
  if (hasDifferences) emit('update:modelValue', { ...currentModel, ...value })
}, { deep: true, immediate: true })

// Expose form data for parent to read
const validateDeliveryInfo = () => {
  deliveryValidationVisible.value = true
  deliverySectionOpen.value = true
  const errors = deliveryErrors.value
  return !errors.priority
    && !errors.address
    && !errors.contact
    && !errors.time
    && !errors.transport
    && !errors.date
    && form.delivery_phones.length <= maxDeliveryPhones
    && phoneErrors.value.every(error => !error)
}

const getDeliveryValidationMessage = () => {
  const errors = deliveryErrors.value
  return errors.priority
    || errors.address
    || errors.contact
    || phoneErrors.value.find(Boolean)
    || (form.delivery_phones.length > maxDeliveryPhones ? `Podés cargar hasta ${maxDeliveryPhones} teléfonos.` : '')
    || errors.time
    || errors.transport
    || errors.date
    || 'Revisá los datos de entrega marcados en el formulario.'
}

const getFormData = () => {
  const phones = form.delivery_phones.map(phone => phone.trim()).filter(Boolean)
  const data: Record<string, any> = {
    priority: form.priority,
    seller_id: form.seller_id === noSellerId ? null : form.seller_id,
    seller_type: form.seller_id === noSellerId ? null : form.seller_type,
    delivery_address: form.delivery_address,
    delivery_contact: form.delivery_contact,
    delivery_phone: phones[0] ?? '',
    delivery_phones: phones,
    delivery_time: form.delivery_time,
    delivery_instructions: form.delivery_instructions,
    transport_provider: form.transport_provider,
    confirmed_delivery_date: form.confirmed_delivery_date
  }
  // Los inputs date vacíos entregan ""; el backend espera una fecha ISO
  // válida o que la propiedad no sea enviada.
  if (!data.confirmed_delivery_date) data.confirmed_delivery_date = undefined
  return data
}
const isDeliveryInfoEmpty = () => !hasDeliveryDetails.value
defineExpose({ getFormData, validateDeliveryInfo, getDeliveryValidationMessage, isDeliveryInfoEmpty })
</script>

<template>
  <div class="flex flex-col gap-3">
    <UCard>
      <div class="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(16rem,1fr)] sm:items-center">
        <div>
          <h3 class="font-semibold">Vendedor de la venta</h3>
          <p class="mt-1 text-xs text-muted">Identifica quién realizó esta OV para consultar las ventas por vendedor. Las comisiones se administran desde RR. HH.</p>
        </div>
        <div class="flex flex-col gap-2">
          <USelectMenu
            v-model="selectedSeller"
            :items="sellerOptions"
            label-key="name"
            value-key="id"
            placeholder="Seleccionar vendedor"
            class="w-full"
            :loading="sellerOptionsLoading"
            :disabled="sellerOptionsLoading || sellerOptionsFailed"
          />
          <p v-if="sellerOptionsFailed" class="text-xs text-error">No se pudo cargar la lista de vendedores.</p>
          <p v-else-if="!sellerOptionsLoading && salespeople.length === 0" class="text-xs text-muted">No hay empleados ni socios activos habilitados como vendedores.</p>
          <p v-else class="text-xs text-muted">Si tu usuario está vinculado a un vendedor, se preselecciona al crear la OV.</p>
        </div>
      </div>
    </UCard>

      <details :open="deliverySectionOpen" @toggle="onDeliverySectionToggle" class="group overflow-hidden rounded-xl border border-default bg-default transition-all group-open:border-primary/40 group-open:shadow-sm">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 border-l-4 border-primary/60 bg-primary/5 px-4 py-3.5 transition-colors hover:bg-primary/10 [&::-webkit-details-marker]:hidden">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UIcon name="i-lucide-truck" class="size-5" />
        </span>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-semibold">Información de entrega</h3>
            <UBadge :label="deliverySectionBadge.label" :color="deliverySectionBadge.color" variant="subtle" size="xs" />
          </div>
          <p class="mt-0.5 text-xs text-muted">Podés elegir o guardar direcciones y contactos en la ficha del cliente, o completar estos datos solo para esta OV.</p>
        </div>
      </div>
      <span class="flex shrink-0 items-center gap-2 rounded-lg border border-default bg-default/70 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors group-open:border-primary/20 group-open:bg-primary/10 group-open:text-primary">
        <span class="group-open:hidden">Completar</span>
        <span class="hidden group-open:inline">Contraer</span>
        <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <div class="flex flex-col gap-4 border-t border-default bg-elevated/20 px-4 py-5 sm:px-5">
      <div class="flex flex-col gap-3 rounded-2xl border border-default bg-default/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <span class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><UIcon name="i-lucide-gauge" class="size-4" /></span>
          <div>
            <p class="text-sm font-semibold">Prioridad del pedido</p>
            <p class="text-xs text-muted">Ayuda a organizar la preparación y la entrega.</p>
          </div>
        </div>
        <UFormField name="priority" :error="deliveryErrors.priority || undefined" class="sm:w-64">
          <USelectMenu
            v-model="form.priority"
            :items="[
              { label: 'Baja', value: 'BAJA' },
              { label: 'Media', value: 'MEDIA' },
              { label: 'Alta', value: 'ALTA' },
              { label: 'Urgente', value: 'URGENTE' }
            ]"
            value-key="value"
            class="w-full"
            @update:model-value="touchDeliveryField('priority')"
          />
        </UFormField>
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
        <section class="flex min-w-0 flex-col gap-4 rounded-2xl border border-default bg-default/70 p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><UIcon name="i-lucide-map-pin" class="size-4" /></span>
            <div>
              <h4 class="text-sm font-semibold">Destino</h4>
              <p class="mt-0.5 text-xs text-muted">Dirección y coordinación de la entrega.</p>
            </div>
          </div>

          <UFormField
            label="Dirección de entrega"
            name="delivery_address"
            :required="requireDeliveryAddress"
            :error="deliveryErrors.address || undefined"
            :description="requireDeliveryAddress ? 'Requerida según el Circuito de ventas.' : 'Opcional.'"
          >
            <template #hint><span :class="counterClass(form.delivery_address, 300)">{{ form.delivery_address.length }}/300</span></template>
            <div class="flex min-w-0 gap-2">
              <UInput v-model="form.delivery_address" maxlength="300" placeholder="Calle, número, localidad" class="min-w-0 flex-1" @blur="touchDeliveryField('address')" />
              <UButton
                label="Buscar o agregar"
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                class="shrink-0"
                :title="props.partyId ? 'Buscar o agregar una dirección del cliente' : 'Agregar una dirección para esta OV'"
                @click="openDeliveryPicker('location')"
              />
            </div>
          </UFormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Tiempo de entrega" name="delivery_time" :error="deliveryErrors.time || undefined">
              <template #hint><span :class="counterClass(form.delivery_time, 100)">{{ form.delivery_time.length }}/100</span></template>
              <UInput v-model="form.delivery_time" maxlength="100" placeholder="Ej: 7-10 días" class="w-full" @blur="touchDeliveryField('time')" />
            </UFormField>
            <UFormField label="Fecha comprometida" name="confirmed_delivery_date" :error="deliveryErrors.date || undefined">
              <UInput v-model="form.confirmed_delivery_date" type="date" class="w-full" @blur="touchDeliveryField('date')" />
            </UFormField>
          </div>

          <UFormField label="Transporte" name="transport_provider" :error="deliveryErrors.transport || undefined">
            <template #hint><span :class="counterClass(form.transport_provider, 100)">{{ form.transport_provider.length }}/100</span></template>
            <UInput v-model="form.transport_provider" maxlength="100" placeholder="Nombre del transporte" class="w-full" @blur="touchDeliveryField('transport')" />
          </UFormField>
        </section>

        <section class="flex min-w-0 flex-col gap-4 rounded-2xl border border-default bg-default/70 p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500"><UIcon name="i-lucide-contact-round" class="size-4" /></span>
            <div>
              <h4 class="text-sm font-semibold">Contacto de entrega</h4>
              <p class="mt-0.5 text-xs text-muted">Podés elegir o guardar un contacto en la ficha del cliente, o completarlo solo para esta OV.</p>
            </div>
          </div>

          <UFormField label="Nombre del contacto" name="delivery_contact" :error="deliveryErrors.contact || undefined">
            <template #hint><span :class="counterClass(form.delivery_contact, 100)">{{ form.delivery_contact.length }}/100</span></template>
            <div class="flex min-w-0 gap-2">
              <UInput v-model="form.delivery_contact" maxlength="100" placeholder="Nombre y apellido" class="min-w-0 flex-1" @blur="touchDeliveryField('contact')" />
              <UButton
                label="Buscar o agregar"
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                class="shrink-0"
                :title="props.partyId ? 'Buscar o agregar un contacto del cliente' : 'Agregar un contacto para esta OV'"
                @click="openDeliveryPicker('contact')"
              />
            </div>
          </UFormField>

          <div class="rounded-xl border border-default bg-elevated/40 p-3 sm:p-4">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-phone" class="size-4 text-muted" />
                <span class="text-sm font-semibold">Teléfonos</span>
                <UBadge :label="`${phoneCount}/${maxDeliveryPhones}`" :color="phoneCount >= maxDeliveryPhones ? 'warning' : 'neutral'" variant="subtle" size="xs" />
              </div>
              <UButton label="Agregar" icon="i-lucide-plus" size="xs" variant="soft" :disabled="form.delivery_phones.length >= maxDeliveryPhones" @click="addDeliveryPhone" />
            </div>
            <div class="flex flex-col gap-3">
              <div v-for="(phone, index) in form.delivery_phones" :key="index" class="flex items-start gap-2">
                <UFormField class="min-w-0 flex-1" :label="`Teléfono ${index + 1}`" :name="`delivery_phone_${index}`" :error="phoneErrors[index] || undefined">
                  <template #hint><span :class="counterClass(phone, phoneMaxLength)">{{ phone.length }}/{{ phoneMaxLength }}</span></template>
                  <UInput v-model="form.delivery_phones[index]" :maxlength="phoneMaxLength" :placeholder="index === 0 ? '11-1234-5678' : 'Otro teléfono'" class="w-full" @blur="touchPhone(index)" />
                </UFormField>
                <UButton
                  v-if="form.delivery_phones.length > 1"
                  class="mt-7"
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :aria-label="`Quitar teléfono ${index + 1}`"
                  @click="removeDeliveryPhone(index)"
                />
              </div>
            </div>
            <p v-if="deliveryValidationVisible && form.delivery_phones.length > maxDeliveryPhones" class="mt-2 text-xs text-error">Podés cargar hasta {{ maxDeliveryPhones }} teléfonos.</p>
            <p class="mt-2 text-xs text-muted">Hasta {{ maxDeliveryPhones }} números; cada uno admite {{ phoneMaxLength }} caracteres.</p>
          </div>
        </section>
      </div>

      <UFormField label="Instrucciones para la entrega" name="delivery_instructions" description="Aclaraciones de horario, acceso o manipulación del pedido.">
        <UTextarea v-model="form.delivery_instructions" placeholder="Ej: entregar por la mañana y llamar al llegar" class="w-full" :rows="3" />
      </UFormField>
    </div>
    </details>

    <UModal v-model:open="deliveryPickerOpen" :title="deliveryPickerTitle" :description="deliveryPickerDescription" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-2 sm:flex-row">
            <UInput v-model="deliveryPickerSearch" icon="i-lucide-search" :placeholder="deliveryPickerKind === 'location' ? 'Buscar por dirección, localidad o etiqueta…' : 'Buscar por nombre, teléfono o email…'" autofocus class="min-w-0 flex-1" />
            <UButton
              :label="deliveryPickerAddingNew ? 'Volver a buscar' : (deliveryPickerKind === 'location' ? 'Agregar dirección' : 'Agregar contacto')"
              :icon="deliveryPickerAddingNew ? 'i-lucide-search' : 'i-lucide-plus'"
              color="primary"
              variant="soft"
              class="shrink-0"
              @click="deliveryPickerAddingNew ? deliveryPickerAddingNew = false : startAddingDeliveryItem()"
            />
          </div>
          <p v-if="props.partyId && !isOwnerOrAdmin && permissionCheckPending" class="text-xs text-muted">Verificando permisos para guardar datos en la ficha del cliente…</p>
          <p v-else-if="props.partyId && permissionCheckFailed" class="text-xs text-warning">No se pudieron verificar los permisos; podés seguir buscando y usar un dato solo en esta OV.</p>
          <p v-else-if="props.partyId && myPermissions && !deliveryItemCanBeAdded" class="text-xs text-muted">
            {{ deliveryPickerKind === 'location' ? 'Para guardar una dirección en la ficha necesitás business_parties.update y locations.create. Podés usarla solo en esta OV.' : 'Para guardar un contacto en la ficha necesitás contacts.create. Podés usarlo solo en esta OV.' }}
          </p>
          <p v-if="props.partyId && deliveryPickerKind === 'location' && canSearchDeliveryLocations && !canLinkExistingDeliveryLocation" class="text-xs text-muted">Las direcciones del catálogo se pueden usar en esta OV; para asociarlas a la ficha necesitás business_parties.update.</p>
          <UAlert v-if="deliveryItemError && !deliveryPickerAddingNew" color="warning" variant="subtle" icon="i-lucide-circle-alert" :description="deliveryItemError" />

          <form v-if="deliveryPickerAddingNew" novalidate class="flex max-h-[min(60vh,34rem)] flex-col gap-3 overflow-y-auto rounded-xl border border-default bg-elevated/30 p-4" @submit.prevent="props.partyId && deliveryItemCanBeAdded ? saveDeliveryItem() : useDeliveryItemForOrder()">
            <div>
              <h4 class="font-semibold">{{ deliveryPickerKind === 'location' ? 'Nueva dirección' : 'Nuevo contacto' }}</h4>
              <p class="mt-1 text-xs text-muted">Podés usar este dato solo en la OV o guardarlo en la ficha del cliente si tenés permiso.</p>
            </div>
            <template v-if="deliveryPickerKind === 'location'">
              <UFormField label="Etiqueta" :error="deliveryItemFieldError('label') || undefined">
                <UInput v-model="locationDraft.label" maxlength="100" placeholder="Ej: Depósito, local, sucursal" class="w-full" />
              </UFormField>
              <UFormField label="Dirección" required :error="deliveryItemFieldError('address') || undefined">
                <UInput v-model="locationDraft.address" maxlength="255" placeholder="Calle y número" class="w-full" />
              </UFormField>
              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField label="Localidad" :error="deliveryItemFieldError('city') || undefined"><UInput v-model="locationDraft.city" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="Provincia" :error="deliveryItemFieldError('province') || undefined"><UInput v-model="locationDraft.province" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="País" :error="deliveryItemFieldError('country') || undefined"><UInput v-model="locationDraft.country" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="Código postal" :error="deliveryItemFieldError('postalCode') || undefined"><UInput v-model="locationDraft.postalCode" maxlength="20" class="w-full" /></UFormField>
              </div>
            </template>
            <template v-else>
              <div class="grid gap-3 sm:grid-cols-2">
                <UFormField label="Nombre" required :error="deliveryItemFieldError('first_name') || undefined"><UInput v-model="contactDraft.first_name" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="Apellido" :error="deliveryItemFieldError('last_name') || undefined"><UInput v-model="contactDraft.last_name" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="Cargo" :error="deliveryItemFieldError('role') || undefined"><UInput v-model="contactDraft.role" maxlength="100" class="w-full" /></UFormField>
                <UFormField label="Teléfono" :error="deliveryItemFieldError('phone') || undefined"><UInput v-model="contactDraft.phone" maxlength="50" class="w-full" /></UFormField>
                <UFormField label="Email" :error="deliveryItemFieldError('email') || undefined" class="sm:col-span-2"><UInput v-model="contactDraft.email" type="email" maxlength="150" class="w-full" /></UFormField>
              </div>
            </template>
            <UAlert v-if="deliveryItemError" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="deliveryItemError" />
            <div class="flex justify-end gap-2">
              <UButton label="Cancelar" color="neutral" variant="ghost" type="button" :disabled="deliveryItemSaving" @click="deliveryPickerAddingNew = false" />
              <UButton label="Usar en esta OV" icon="i-lucide-check" color="neutral" variant="soft" type="button" :disabled="deliveryItemSaving" @click="useDeliveryItemForOrder" />
              <UButton v-if="props.partyId && deliveryItemCanBeAdded" :label="deliveryPickerKind === 'location' ? 'Guardar dirección en ficha' : 'Guardar contacto en ficha'" icon="i-lucide-save" type="submit" :loading="deliveryItemSaving" />
            </div>
          </form>

          <div v-else-if="savedPartyDetailsLoading || (deliveryPickerKind === 'location' && canSearchDeliveryLocations && locationsSearchLoading)" class="flex items-center justify-center gap-2 rounded-xl border border-dashed border-default px-5 py-8 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" /> {{ deliveryPickerKind === 'location' ? 'Buscando ubicaciones…' : 'Cargando los datos del cliente…' }}
          </div>
          <div v-else-if="deliveryPickerOptions.length" class="flex max-h-[min(55vh,28rem)] flex-col gap-2 overflow-y-auto pr-1">
            <button
              v-for="option in deliveryPickerOptions"
              :key="option.value"
              type="button"
              class="flex w-full items-start gap-3 rounded-xl border border-default bg-default px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
              @click="deliveryPickerKind === 'location' ? selectDeliveryLocation(option) : applySavedDeliveryContact(option.value)"
            >
              <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon :name="deliveryPickerKind === 'location' ? 'i-lucide-map-pin' : 'i-lucide-user-round'" class="size-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium">{{ option.label }}</span>
                <span v-if="deliveryPickerKind === 'location' && option.detail" class="mt-0.5 block text-xs text-muted">{{ option.detail }}</span>
                <span v-else-if="deliveryPickerKind === 'contact'" class="mt-0.5 block text-xs text-muted">{{ [option.role, option.phone, option.email].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</span>
              </span>
              <UIcon name="i-lucide-arrow-up-left" class="mt-1 size-4 shrink-0 text-muted" />
            </button>
          </div>
          <div v-else class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-default bg-elevated/30 px-5 py-8 text-center">
            <span class="flex size-10 items-center justify-center rounded-full bg-elevated text-muted"><UIcon name="i-lucide-search-x" class="size-5" /></span>
            <p class="max-w-sm text-sm text-muted">{{ deliveryPickerEmptyMessage }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <p class="mr-auto text-xs text-muted">Elegir o usar un dato lo copia a esta OV. Guardarlo en la ficha permite reutilizarlo.</p>
        <UButton label="Cerrar" color="neutral" variant="ghost" @click="closeDeliveryPicker" />
      </template>
    </UModal>
  </div>
</template>
