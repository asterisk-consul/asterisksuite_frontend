<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: string; disabled?: boolean; editing?: boolean; members?: Array<{ id: string; name: string }> }>(), { disabled: false, editing: false, members: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:editing': [value: boolean] }>()
const toast = useToast()

const editor = ref<HTMLElement | null>(null)
const heading = ref({ tag: 'p', label: 'Texto normal' })
const showFormatGuide = ref(false)
const savedRange = ref<Range | null>(null)
const activeFormats = reactive({ bold: false, italic: false, strike: false, code: false, bulletList: false, orderedList: false })

const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'S', 'DEL', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'CODE', 'A', 'IMG', 'HR', 'SPAN'])
const taskMentionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeHtml(value: string) {
  if (!import.meta.client) return value
  const doc = new DOMParser().parseFromString(value, 'text/html')
  const clean = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      const element = child as HTMLElement
      clean(element)
      const mentionId = element.tagName === 'SPAN' ? element.getAttribute('data-user-id') : null
      const isTaskMention = element.tagName === 'SPAN'
        && element.getAttribute('data-task-mention') === 'true'
        && !!mentionId
        && taskMentionIdPattern.test(mentionId)
      if (!allowedTags.has(element.tagName) || (element.tagName === 'SPAN' && !isTaskMention)) {
        element.replaceWith(...element.childNodes)
        continue
      }
      const href = element.tagName === 'A' ? element.getAttribute('href') : null
      const src = element.tagName === 'IMG' ? element.getAttribute('src') : null
      const alt = element.tagName === 'IMG' ? element.getAttribute('alt') : null
      const mentionName = isTaskMention ? element.getAttribute('data-user-name') : null
      for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name)
      if (element.tagName === 'A' && href && /^(https?:|mailto:)/i.test(href)) {
        element.setAttribute('href', href)
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noopener noreferrer')
      }
      if (element.tagName === 'IMG' && src && /^https?:/i.test(src)) {
        element.setAttribute('src', src)
        if (alt) element.setAttribute('alt', alt.slice(0, 300))
        element.setAttribute('loading', 'lazy')
        element.setAttribute('referrerpolicy', 'no-referrer')
      } else if (element.tagName === 'IMG') {
        element.remove()
      }
      if (isTaskMention && mentionId) {
        element.setAttribute('data-task-mention', 'true')
        element.setAttribute('data-user-id', mentionId)
        element.setAttribute('data-user-name', (mentionName || element.textContent || '').slice(0, 120))
        element.setAttribute('class', 'task-description-mention')
      }
    }
  }
  clean(doc.body)
  return doc.body.innerHTML
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function toEditorHtml(value: string) {
  if (!value) return ''
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return sanitizeHtml(value)
  return `<p>${escapeHtml(value).replaceAll('\n', '<br>')}</p>`
}

watch(() => props.modelValue, (value) => {
  if (!props.editing || !editor.value || editor.value.innerHTML === toEditorHtml(value)) return
  editor.value.innerHTML = toEditorHtml(value)
}, { immediate: true, flush: 'post' })

async function startEditing() {
  if (props.disabled) return
  emit('update:editing', true)
  await nextTick()
  if (editor.value) {
    editor.value.innerHTML = toEditorHtml(props.modelValue)
    editor.value.focus()
    updateActiveFormats()
  }
}

function updateActiveFormats() {
  const selection = document.getSelection()
  if (!editor.value) return
  const selectedRange = selection?.anchorNode && editor.value.contains(selection.anchorNode)
    ? selection.rangeCount ? selection.getRangeAt(0) : null
    : savedRange.value && editor.value.contains(savedRange.value.commonAncestorContainer) ? savedRange.value : null
  if (!selectedRange) return
  const anchor = selection?.anchorNode && editor.value.contains(selection.anchorNode)
    ? selection.anchorNode
    : selectedRange.startContainer

  let element = anchor.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor.parentElement
  const inside = (tags: string[]) => {
    let current = element
    while (current && current !== editor.value) {
      if (tags.includes(current.tagName)) return true
      current = current.parentElement
    }
    return false
  }

  const queryState = (commandName: string) => {
    try { return document.queryCommandState(commandName) } catch { return false }
  }
  Object.assign(activeFormats, {
    bold: queryState('bold') || inside(['B', 'STRONG']),
    italic: queryState('italic') || inside(['I', 'EM']),
    strike: queryState('strikeThrough') || inside(['S', 'DEL']),
    code: inside(['CODE', 'PRE']),
    bulletList: queryState('insertUnorderedList') || inside(['UL']),
    orderedList: queryState('insertOrderedList') || inside(['OL'])
  })
}

onMounted(() => document.addEventListener('selectionchange', updateActiveFormats))
onBeforeUnmount(() => document.removeEventListener('selectionchange', updateActiveFormats))

function saveSelection() {
  const selection = document.getSelection()
  if (!selection?.rangeCount || !editor.value?.contains(selection.anchorNode)) return
  savedRange.value = selection.getRangeAt(0).cloneRange()
}

function focusEditor(restore = false) {
  editor.value?.focus()
  if (!restore || !savedRange.value) return
  const selection = document.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(savedRange.value)
}

function command(name: string, value?: string) {
  if (props.disabled) return
  focusEditor(true)
  document.execCommand(name, false, value)
  saveSelection()
  updateActiveFormats()
  requestAnimationFrame(updateActiveFormats)
  syncValue()
}

function toggleFormat(name: string, key: 'bold' | 'italic' | 'strike') {
  const next = !activeFormats[key]
  command(name)
  activeFormats[key] = next
  requestAnimationFrame(updateActiveFormats)
}

function toggleList(ordered: boolean) {
  const key = ordered ? 'orderedList' : 'bulletList'
  const next = !activeFormats[key]
  command(ordered ? 'insertOrderedList' : 'insertUnorderedList')
  activeFormats.orderedList = ordered && next
  activeFormats.bulletList = !ordered && next
  requestAnimationFrame(updateActiveFormats)
}

function setHeading(tag: string, label: string) {
  heading.value = { tag, label }
  command('formatBlock', tag)
}

function addLink() {
  if (props.disabled) return
  const url = window.prompt('Pegá el enlace')?.trim()
  if (!url) return
  const safeUrl = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`
  focusEditor(true)
  document.execCommand('createLink', false, safeUrl)
  saveSelection()
  syncValue()
}

function addImage() {
  if (props.disabled) return
  const url = window.prompt('Pegá la URL de la imagen')?.trim()
  if (!url || !/^https?:/i.test(url)) {
    if (url) toast.add({ title: 'Enlace no válido', description: 'La imagen debe tener una URL http o https.', color: 'warning' })
    return
  }
  focusEditor(true)
  document.execCommand('insertImage', false, url)
  saveSelection()
  syncValue()
}

function insertText(value: string) {
  if (props.disabled) return
  focusEditor(true)
  document.execCommand('insertText', false, value)
  saveSelection()
  syncValue()
}

function insertMention(member: { id: string; name: string }) {
  if (props.disabled || !taskMentionIdPattern.test(member.id)) return
  focusEditor(true)
  const selection = document.getSelection()
  if (!editor.value || !selection?.rangeCount || !editor.value.contains(selection.anchorNode)) {
    insertText(`@${member.name} `)
    return
  }
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const mention = document.createElement('span')
  mention.setAttribute('data-task-mention', 'true')
  mention.setAttribute('data-user-id', member.id)
  mention.setAttribute('data-user-name', member.name.slice(0, 120))
  mention.className = 'task-description-mention'
  mention.textContent = `@${member.name}`
  range.insertNode(mention)
  const trailingSpace = document.createTextNode(' ')
  mention.after(trailingSpace)
  range.setStart(trailingSpace, 1)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  saveSelection()
  syncValue()
}

function insertEmoji(emoji: string) {
  insertText(emoji)
}

function insertCodeBlock() {
  if (props.disabled) return
  focusEditor(true)
  document.execCommand('formatBlock', false, 'pre')
  saveSelection()
  syncValue()
}

function syncValue() {
  if (!editor.value) return
  emit('update:modelValue', sanitizeHtml(editor.value.innerHTML))
}

function toggleFormatGuide() { showFormatGuide.value = !showFormatGuide.value }

function onInput() {
  if (!editor.value) return
  saveSelection()
  updateActiveFormats()
  const text = editor.value.innerText ?? ''
  if (text.length > 10000) {
    editor.value.innerText = text.slice(0, 10000)
    toast.add({ title: 'Descripción extensa', description: 'El máximo es 10.000 caracteres.', color: 'warning' })
  }
  syncValue()
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') { event.preventDefault(); command('bold') }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i') { event.preventDefault(); command('italic') }
}

const formatItems = [
  { label: 'Texto normal', icon: 'i-lucide-type', onSelect: () => setHeading('p', 'Texto normal') },
  { type: 'separator' as const },
  ...Array.from({ length: 6 }, (_, index) => {
    const level = index + 1
    return { label: `Título ${level}`, icon: `i-lucide-heading-${level}`, onSelect: () => setHeading(`h${level}`, `Título ${level}`) }
  })
]

const styleItems = computed(() => [
  { label: 'Cursiva', icon: 'i-lucide-italic', trailingIcon: activeFormats.italic ? 'i-lucide-check' : undefined, onSelect: () => toggleFormat('italic', 'italic') },
  { label: 'Tachado', icon: 'i-lucide-strikethrough', trailingIcon: activeFormats.strike ? 'i-lucide-check' : undefined, onSelect: () => toggleFormat('strikeThrough', 'strike') },
  { label: 'Código', icon: 'i-lucide-code', trailingIcon: activeFormats.code ? 'i-lucide-check' : undefined, onSelect: insertCodeBlock },
  { type: 'separator' as const },
  { label: 'Borrar formato', icon: 'i-lucide-eraser', onSelect: () => command('removeFormat') }
])

const listItems = computed(() => [
  { label: 'Lista de viñetas', icon: 'i-lucide-list', trailingIcon: activeFormats.bulletList ? 'i-lucide-check' : undefined, onSelect: () => toggleList(false) },
  { label: 'Lista numerada', icon: 'i-lucide-list-ordered', trailingIcon: activeFormats.orderedList ? 'i-lucide-check' : undefined, onSelect: () => toggleList(true) }
])

const emojiItems = [
  { label: 'Celebración', icon: 'i-lucide-party-popper', onSelect: () => insertEmoji('🎉') },
  { label: 'Pulgar arriba', icon: 'i-lucide-thumbs-up', onSelect: () => insertEmoji('👍') },
  { label: 'Check', icon: 'i-lucide-circle-check', onSelect: () => insertEmoji('✅') },
  { label: 'Idea', icon: 'i-lucide-lightbulb', onSelect: () => insertEmoji('💡') },
  { label: 'Reloj', icon: 'i-lucide-clock-3', onSelect: () => insertEmoji('⏰') },
  { label: 'Advertencia', icon: 'i-lucide-triangle-alert', onSelect: () => insertEmoji('⚠️') }
]

const insertItems = computed(() => [
  {
    label: 'Mención',
    description: 'Notifica a la persona en la campanita y, si está activo, por WhatsApp',
    icon: 'i-lucide-at-sign',
    children: [
      ...(props.members.length
        ? props.members.map(member => ({ label: member.name, icon: 'i-lucide-user-round', onSelect: () => insertMention(member) }))
        : [{ label: 'Escribir una mención…', icon: 'i-lucide-pencil-line', onSelect: () => insertText('@') }])
    ]
  },
  {
    label: 'Emoji',
    description: 'Insertar un emoji',
    icon: 'i-lucide-smile',
    children: emojiItems
  },
  {
    label: 'Fragmento de código',
    description: 'Crear un bloque de código',
    icon: 'i-lucide-square-terminal',
    onSelect: insertCodeBlock
  },
  {
    label: 'Cita',
    description: 'Insertar una cita o referencia',
    icon: 'i-lucide-text-quote',
    onSelect: () => command('formatBlock', 'blockquote')
  }
])
</script>

<template>
  <div v-if="!editing" class="min-w-0">
    <button
      type="button"
      class="block min-h-[78px] w-full cursor-text rounded-md border border-default bg-default px-4 py-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-elevated/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-default disabled:opacity-70 disabled:hover:border-default disabled:hover:bg-default"
      :aria-label="modelValue ? 'Editar descripción' : 'Agregar descripción'"
      :disabled="disabled"
      @click="startEditing"
    >
      <span v-if="modelValue" class="task-description-preview text-highlighted" v-html="toEditorHtml(modelValue)" />
      <span v-else class="text-muted">Añadir una descripción más detallada…</span>
    </button>
  </div>
  <div v-else class="overflow-hidden rounded-xl border border-primary bg-default transition-colors focus-within:ring-2 focus-within:ring-primary/20" :class="disabled ? 'opacity-70' : ''">
    <div class="flex flex-wrap items-center gap-1 border-b border-default px-2 py-1.5" @mousedown.capture="saveSelection">
      <UDropdownMenu :items="formatItems" :disabled="disabled" :content="{ align: 'start', sideOffset: 6 }">
        <UButton :label="heading.label" icon="i-lucide-type" trailing-icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" aria-label="Formato de texto" />
      </UDropdownMenu>
      <span class="mx-1 h-5 border-l border-default" />
      <UButton icon="i-lucide-bold" color="neutral" variant="ghost" size="xs" aria-label="Negrita" title="Negrita (Ctrl+B)" :aria-pressed="activeFormats.bold" :class="activeFormats.bold ? 'bg-primary/15 text-primary' : ''" :disabled="disabled" @mousedown.prevent @click="toggleFormat('bold', 'bold')" />
      <UDropdownMenu :items="styleItems" :disabled="disabled" :content="{ align: 'start', sideOffset: 6 }">
        <UButton icon="i-lucide-italic" trailing-icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" aria-label="Más estilos de texto" title="Cursiva, tachado y código" :aria-pressed="activeFormats.italic || activeFormats.strike || activeFormats.code" :class="activeFormats.italic || activeFormats.strike || activeFormats.code ? 'bg-primary/15 text-primary' : ''" />
      </UDropdownMenu>
      <UDropdownMenu :items="listItems" :disabled="disabled" :content="{ align: 'start', sideOffset: 6 }">
        <UButton icon="i-lucide-list" trailing-icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" aria-label="Opciones de lista" title="Listas con viñetas o numeradas" :aria-pressed="activeFormats.bulletList || activeFormats.orderedList" :class="activeFormats.bulletList || activeFormats.orderedList ? 'bg-primary/15 text-primary' : ''" />
      </UDropdownMenu>
      <UButton icon="i-lucide-link" color="neutral" variant="ghost" size="xs" aria-label="Insertar enlace" title="Insertar enlace" :disabled="disabled" @mousedown.prevent @click="addLink" />
      <UButton icon="i-lucide-image" color="neutral" variant="ghost" size="xs" aria-label="Insertar imagen" title="Insertar imagen desde una URL" :disabled="disabled" @mousedown.prevent @click="addImage" />
      <UDropdownMenu :items="insertItems" :disabled="disabled" filter :content="{ align: 'start', sideOffset: 6, class: 'w-80' }">
        <UButton icon="i-lucide-plus" trailing-icon="i-lucide-chevron-down" color="neutral" variant="ghost" size="xs" aria-label="Más opciones de inserción" title="Mención, emoji, código o cita" />
      </UDropdownMenu>
      <UButton label="Guía de formato" icon="i-lucide-circle-help" color="neutral" variant="ghost" size="xs" class="ml-auto" @click="toggleFormatGuide" />
    </div>
    <div v-if="showFormatGuide" class="border-b border-default bg-elevated/40 px-4 py-3 text-xs text-muted">
      Usá los controles para aplicar títulos, listas, enlaces, citas y código. Atajos: <kbd>Ctrl+B</kbd> negrita y <kbd>Ctrl+I</kbd> cursiva.
    </div>
    <div ref="editor" class="task-description-editor min-h-72 max-h-80 overflow-y-auto px-4 py-3 text-sm outline-none" :contenteditable="!disabled" role="textbox" aria-label="Descripción de la tarea" aria-multiline="true" data-placeholder="Escribí la descripción. Usá la barra para agregar títulos, listas, enlaces, imágenes y código…" @input="onInput" @keydown="onKeydown" @keyup="updateActiveFormats" @mouseup="updateActiveFormats" />
  </div>
</template>

<style scoped>
.task-description-editor:empty::before {
  color: var(--ui-text-muted);
  content: attr(data-placeholder);
  pointer-events: none;
}
.task-description-preview :deep(p) { margin: 0; }
.task-description-preview :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.task-description-preview :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.task-description-preview :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.task-description-preview :deep(img) { height: auto; max-width: 100%; border-radius: 0.5rem; }
.task-description-preview :deep(.task-description-mention), .task-description-editor :deep(.task-description-mention) { border-radius: 0.25rem; background: color-mix(in srgb, var(--ui-primary) 14%, transparent); color: var(--ui-primary); font-weight: 600; padding: 0.05rem 0.2rem; }
.task-description-editor :deep(h1) { font-size: 1.5rem; font-weight: 700; }
.task-description-editor :deep(h2) { font-size: 1.25rem; font-weight: 700; }
.task-description-editor :deep(h3), .task-description-editor :deep(h4) { font-size: 1.1rem; font-weight: 600; }
.task-description-editor :deep(ul) { list-style: disc; padding-left: 1.5rem; }
.task-description-editor :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.task-description-editor :deep(blockquote) { border-left: 3px solid var(--ui-border); color: var(--ui-text-muted); padding-left: 0.75rem; }
.task-description-editor :deep(pre) { overflow-x: auto; border-radius: 0.5rem; background: var(--ui-bg-elevated); padding: 0.75rem; }
.task-description-editor :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.task-description-editor :deep(img) { height: auto; max-width: 100%; border-radius: 0.5rem; }
</style>
