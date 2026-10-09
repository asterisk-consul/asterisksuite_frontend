<script setup lang="ts">
import { es } from '@nuxt/ui/locale'
const colorMode = useColorMode()
import type { ToasterProps } from '#ui/types'
const toaster: ToasterProps = { position: 'top-center', duration: 3000 }
const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'))

const locale = extendLocale(es, { code: 'es-AR' })

useHead({
  titleTemplate: (titleChunk) => {
    if (!titleChunk || titleChunk === 'Asterisk Suite') return 'Asterisk Suite'
    if (titleChunk.endsWith('| Asterisk Suite')) return titleChunk
    return `${titleChunk} | Asterisk Suite`
  },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/branding/favicon.svg' }],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = 'Asterisk Suite'
const description =
  'Un suite de herramientas para la gestión de proyectos de Asterisk'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp :toaster="toaster" :locale="locale">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
