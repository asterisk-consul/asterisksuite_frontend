<script setup lang="ts">
import { getHelpPageContext } from '~/modulos/help/help-page-context'

interface HelpArticleSection {
  heading: string
  text: string
}

interface HelpArticle {
  slug: string
  title: string
  description: string
  sections: HelpArticleSection[]
}

interface HelpMessageSource {
  slug: string
  title: string
  description: string
  excerpt: string
}

interface HelpMessage {
  id: number
  role: 'assistant' | 'user'
  text: string
  sources?: HelpMessageSource[]
}

const props = defineProps<{
  open: boolean
  pageTitle: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const route = useRoute()
const articles = ref<HelpArticle[]>([])
const messages = ref<HelpMessage[]>([])
const question = ref('')
const loadingIndex = ref(false)
const indexError = ref(false)
const sending = ref(false)
const messageList = ref<HTMLElement | null>(null)
const context = computed(() => getHelpPageContext(route.path, route.query))
const currentContextLabel = computed(() => context.value.label === 'Ayuda general' ? props.pageTitle : context.value.label)
const pageContextKey = computed(() => `${route.path}|${String(route.query.category ?? '')}|${currentContextLabel.value}`)
let nextMessageId = 1
let indexLoadPromise: Promise<void> | null = null
let conversationGeneration = 0

const contextArticles = computed(() => context.value.guideSlugs
  .map(slug => articles.value.find(article => article.slug === slug))
  .filter((article): article is HelpArticle => Boolean(article)))

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

const stopWords = new Set([
  'a', 'al', 'algo', 'como', 'con', 'cual', 'cuales', 'cuando', 'de', 'del', 'desde', 'donde', 'el', 'ella', 'en',
  'es', 'esta', 'este', 'hay', 'la', 'las', 'lo', 'los', 'me', 'mi', 'para', 'por', 'que', 'se', 'si', 'sin', 'sobre',
  'un', 'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo'
])

function queryTokens(value: string) {
  return [...new Set(normalizeText(value).split(' ').filter(token => token.length > 1 && !stopWords.has(token)))]
}

function tokenMatches(token: string, text: string) {
  return text.split(' ').some(word => word === token || (token.length >= 4 && word.startsWith(token)) || (word.length >= 4 && token.startsWith(word)))
}

function scoreArticle(article: HelpArticle, tokens: string[]) {
  const title = normalizeText(article.title)
  const description = normalizeText(article.description)
  const sections = article.sections.map(section => normalizeText(`${section.heading} ${section.text}`))
  const contextBonus = context.value.guideSlugs.includes(article.slug) ? 1.5 : 0
  let score = contextBonus
  let matchedTokens = 0

  for (const token of tokens) {
    let tokenScore = 0
    if (tokenMatches(token, title)) tokenScore = Math.max(tokenScore, 6)
    if (tokenMatches(token, description)) tokenScore = Math.max(tokenScore, 3)
    if (sections.some(section => tokenMatches(token, section))) tokenScore = Math.max(tokenScore, 1)
    if (tokenScore) {
      score += tokenScore
      matchedTokens += 1
    }
  }

  return { score, matchedTokens }
}

function findExcerpt(article: HelpArticle, tokens: string[]) {
  const rankedSections = article.sections
    .map(section => ({
      ...section,
      score: tokens.reduce((score, token) => score + (tokenMatches(token, normalizeText(`${section.heading} ${section.text}`)) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)
  const best = rankedSections.find(section => section.score > 0)
  const text = best?.text ?? article.description
  if (text.length <= 430) return text
  const lastSpace = text.lastIndexOf(' ', 427)
  return `${text.slice(0, lastSpace > 260 ? lastSpace : 427).trim()}…`
}

function findArticles(value: string): HelpMessageSource[] {
  const tokens = queryTokens(value)
  const scored = articles.value.map(article => ({ article, ...scoreArticle(article, tokens) }))
  let relevant = scored
    .filter(item => item.matchedTokens > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (!relevant.length) {
    relevant = contextArticles.value.slice(0, 3).map(article => ({ article, score: 0, matchedTokens: 0 }))
  }

  return relevant.map(({ article }) => ({
    slug: article.slug,
    title: article.title,
    description: article.description,
    excerpt: findExcerpt(article, tokens)
  }))
}

function articleUrl(slug: string) {
  const path = slug && slug !== 'index' ? `/${slug.replace(/\/$/, '')}/` : '/'
  return `https://docs.asterisksuite.cloud${path}`
}

function addAssistantMessage(text: string, sources: HelpMessageSource[] = []) {
  messages.value.push({ id: nextMessageId++, role: 'assistant', text, sources })
  void nextTick(() => messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' }))
}

function addWelcomeMessage() {
  if (messages.value.length) return
  addAssistantMessage(`Hola. Puedo buscar en la documentación. Ahora estás en ${currentContextLabel.value}; podés preguntarme sobre esta pantalla o sobre otro tema del ERP.`)
}

function loadIndex() {
  if (articles.value.length) {
    addWelcomeMessage()
    return Promise.resolve()
  }
  if (indexLoadPromise) return indexLoadPromise.then(addWelcomeMessage)
  loadingIndex.value = true
  indexError.value = false
  indexLoadPromise = $fetch<{ articles: HelpArticle[] }>('/help-documents-index.json')
    .then((index) => {
      articles.value = index.articles ?? []
      if (!articles.value.length) throw new Error('Índice documental vacío')
    })
    .catch(() => {
      indexError.value = true
    })
    .finally(() => {
      loadingIndex.value = false
      indexLoadPromise = null
    })
    .then(addWelcomeMessage)
  return indexLoadPromise
}

async function submitQuestion(value = question.value) {
  const text = value.trim()
  if (!text || sending.value) return
  question.value = ''
  messages.value.push({ id: nextMessageId++, role: 'user', text })
  const submittedGeneration = conversationGeneration
  sending.value = true
  await nextTick()
  messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })

  try {
    await loadIndex()
    if (submittedGeneration !== conversationGeneration) return
    const sources = findArticles(text)
    const exactMatches = articles.value.some(article => scoreArticle(article, queryTokens(text)).matchedTokens > 0)
    const response = exactMatches
      ? `Encontré estas partes de la documentación relacionadas con tu pregunta. La primera está priorizada para la pantalla actual (${currentContextLabel.value}).`
      : `No encontré una coincidencia exacta. Te dejo la guía de ${currentContextLabel.value} para que puedas revisar el proceso. También podés probar con otras palabras.`
    addAssistantMessage(response, sources)
  } finally {
    if (submittedGeneration === conversationGeneration) sending.value = false
  }
}

function resetConversation() {
  conversationGeneration += 1
  messages.value = []
  question.value = ''
  sending.value = false
  indexError.value = false
  if (articles.value.length) addWelcomeMessage()
  else if (props.open) void loadIndex()
}

function startNewConversation() {
  resetConversation()
}

watch(pageContextKey, () => resetConversation())

watch(() => props.open, (isOpen) => {
  if (isOpen) void loadIndex()
})

</script>

<template>
  <USlideover
    :open="open"
    title="Ayuda Asterisk"
    description="Consultá cómo usar el sistema y abrí las guías relacionadas."
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex h-full min-h-0 flex-col">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <UBadge icon="i-lucide-map-pin" color="primary" variant="subtle">{{ currentContextLabel }}</UBadge>
          <UButton label="Nueva consulta" icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" @click="startNewConversation" />
        </div>

        <div v-if="contextArticles.length" class="mb-3 flex flex-wrap items-center gap-1.5">
          <span class="mr-1 text-xs text-muted">Guías:</span>
          <a
            v-for="article in contextArticles"
            :key="article.slug"
            :href="articleUrl(article.slug)"
            target="_blank"
            rel="noreferrer"
            class="inline-flex max-w-full items-center gap-1 rounded-full border border-default px-2 py-1 text-xs text-primary hover:bg-elevated/40"
          >
            <span class="truncate">{{ article.title }}</span>
            <UIcon name="i-lucide-arrow-up-right" class="size-3 shrink-0" />
          </a>
        </div>

        <p class="mb-3 text-xs text-muted">
          Respuestas basadas en la documentación del sistema. No consulta datos privados de la empresa.
        </p>

        <UAlert
          v-if="indexError"
          color="warning"
          variant="subtle"
          icon="i-lucide-book-open-check"
          title="No se pudo cargar el índice de ayuda"
          description="Podés abrir la guía de esta sección directamente desde las sugerencias."
          class="mb-3"
        />

        <div ref="messageList" class="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1" aria-live="polite">
          <div v-if="loadingIndex && !messages.length" class="flex items-center gap-2 py-4 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            Cargando documentación…
          </div>
          <article
            v-for="message in messages"
            :key="message.id"
            class="flex gap-2.5"
            :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              v-if="message.role === 'assistant'"
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <UIcon name="i-lucide-book-open-text" class="size-4" />
            </div>
            <div class="max-w-[88%] min-w-0 space-y-2">
              <p
                class="rounded-xl px-3 py-2.5 text-sm leading-6"
                :class="message.role === 'user' ? 'bg-primary text-inverted' : 'border border-default bg-elevated/30 text-highlighted'"
              >
                {{ message.text }}
              </p>
              <a
                v-for="source in message.sources"
                :key="source.slug"
                :href="articleUrl(source.slug)"
                target="_blank"
                rel="noreferrer"
                class="block rounded-lg border border-default bg-elevated/20 p-3 transition hover:border-primary/40 hover:bg-elevated/40"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-highlighted">{{ source.title }}</p>
                  <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-primary" />
                </div>
                <p class="mt-1 text-xs leading-5 text-muted">{{ source.excerpt || source.description }}</p>
                <span class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">Abrir guía <UIcon name="i-lucide-arrow-right" class="size-3.5" /></span>
              </a>
            </div>
            <div
              v-if="message.role === 'user'"
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-muted"
            >
              <UIcon name="i-lucide-user-round" class="size-4" />
            </div>
          </article>
          <div v-if="sending" class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            Buscando en las guías…
          </div>
        </div>

        <div v-if="!messages.some(message => message.role === 'user')" class="flex flex-wrap gap-2 border-t border-default py-3">
          <UButton
            v-for="suggestion in context.suggestedQuestions"
            :key="suggestion"
            :label="suggestion"
            color="neutral"
            variant="outline"
            size="xs"
            class="max-w-full whitespace-normal text-left"
            @click="submitQuestion(suggestion)"
          />
        </div>

        <form class="flex items-end gap-2 border-t border-default pt-3" @submit.prevent="submitQuestion()">
          <UTextarea
            v-model="question"
            :rows="2"
            :maxrows="4"
            autoresize
            class="min-w-0 flex-1"
            placeholder="Preguntá cómo hacer algo en Asterisk Suite…"
            aria-label="Escribí tu pregunta"
            :disabled="sending || loadingIndex"
            @keydown.enter.exact.prevent="submitQuestion()"
          />
          <UButton
            type="submit"
            icon="i-lucide-send"
            color="primary"
            aria-label="Enviar pregunta"
            :disabled="!question.trim() || sending || loadingIndex"
            :loading="sending"
          />
        </form>
      </div>
    </template>
  </USlideover>
</template>
