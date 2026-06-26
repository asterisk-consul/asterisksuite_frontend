// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@vueuse/nuxt', // 👈 así se pasan las opciones
    ['@pinia/nuxt', { autoImports: ['defineStore', 'storeToRefs'] }],
    [
      'nuxt-echarts',
      {
        charts: ['BarChart', 'LineChart', 'PieChart'],
        components: ['GridComponent', 'TooltipComponent', 'LegendComponent', 'DataZoomComponent'],
        renderer: 'svg' // recomendado para SSR
      }
    ]
  ],
  devServer: {
    host: '0.0.0.0', // <- debe estar así
    port: 3008
  },
  sourcemap: false,
  experimental: {
    watcher: 'chokidar',
    componentIslands: false
  },
  typescript: {
    typeCheck: false // Desactivar temporalmente durante build
  },
  vite: {
    build: {
      sourcemap: false
    },

    optimizeDeps: {
      include: ['leaflet', 'date-fns', '@unovis/vue', 'zod']
    },

    ssr: {
      noExternal: ['@unovis/vue']
    }
  },
  ssr: true,
  imports: {
    dirs: [
      'composables',
      'utils/**', // Incluye subcarpetas
      'helpers', // Carpeta adicional
      'stores' // Si tienes helpers en stores
    ]
  },

  devtools: {
    enabled: false
  },
  app: {
    baseURL: '/', // Relative paths for filesystem routing in Capacitor
    buildAssetsDir: '/_nuxt/'
  },

  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiBase: '',

    public: {
      apiBase: ''
    }
  },

  // 👇 Auto-importar types globalmente
  alias: {
    '@types': './types',
    '@server/utils': './server/utils'
  },

  compatibilityDate: '2024-07-11',

  nitro: {
    preset: 'node-server',
    // ✅ CORS va acá
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type'
        }
      }
    }
  }
})
