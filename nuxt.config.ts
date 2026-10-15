import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getAppVersion(): string {
  try {
    const versionsPath = resolve(__dirname, 'versiones/versions.json')
    const content = readFileSync(versionsPath, 'utf-8')
    const versions = JSON.parse(content)
    return versions[0]?.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
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
    dirs: ['utils', 'stores']
  },

  devtools: {
    enabled: process.env.NUXT_DEVTOOLS === 'true'
  },
  app: {
    baseURL: '/', // Relative paths for filesystem routing in Capacitor
    buildAssetsDir: '/_nuxt/',
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/branding/favicon.svg'
        }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  // Los íconos usados por la aplicación se incluyen en el bundle del cliente.
  // Así la navegación principal no espera llamadas a /api/_nuxt_icon en redes lentas.
  icon: {
    provider: 'server',
    fetchTimeout: 5000,
    serverBundle: {
      collections: ['lucide', 'simple-icons']
    },
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts,tsx,js,jsx}']
      },
      icons: [
        'lucide:arrow-left',
        'lucide:bar-chart-3',
        'lucide:check',
        'lucide:chevron-down',
        'lucide:chevron-right',
        'lucide:chevrons-up-down',
        'lucide:factory',
        'lucide:file-check',
        'lucide:file-text',
        'lucide:globe',
        'lucide:house',
        'lucide:layout-dashboard',
        'lucide:map-pin',
        'lucide:menu',
        'lucide:panel-left-close',
        'lucide:pencil',
        'lucide:plus',
        'lucide:settings',
        'lucide:shopping-cart',
        'lucide:truck',
        'lucide:users'
      ],
      sizeLimitKb: 512
    }
  },

  runtimeConfig: {
    apiBase: '',

    public: {
      apiBase: '',
      baseDomain: '',
      appVersion: getAppVersion(),
      performanceSampleRate: Number(
        process.env.NUXT_PUBLIC_PERFORMANCE_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? '0.10' : '0')
      )
    }
  },

  // 👇 Auto-importar types globalmente
  alias: {
    '@types': './types',
    '@server/utils': './server/utils'
  },

  compatibilityDate: '2024-07-11',

  watchers: {
    chokidar: {
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  },
  nitro: {
    preset: 'node-server',
    compressPublicAssets: true,
    // ✅ CORS va acá
    routeRules: {
      '/_nuxt/**': {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      },
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization,Content-Type'
        }
      }
    },
    // ✅ Aumentar límite de body para uploads
    h3: {
      maxBodySize: '50mb'
    }
  }
})
