import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      title: 'Nord Review',
      link: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico',
        },
      ],
    },
  },

  modules: [
    '@nuxthub/core',
    'shadcn-nuxt',
    'nuxt-auth-utils',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
  ],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  css: ['~/assets/css/main.css'],

  shadcn: {
    prefix: 'UI',
    componentDir: './app/components/ui',
  },

  nitro: {
    experimental: {
      tasks: true,
      openAPI: true,
    },
    scheduledTasks: {
      '0 * * * *': ['rotate'],
    },
  },

  hub: {
    db: 'sqlite',
  },

  runtimeConfig: {
    apiKey: '',
    resendApiKey: '',
    emailFrom: 'Nord Review <noreply@nordreview.nordhealth.com>',
    session: {
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: false,
    },
  },
})
