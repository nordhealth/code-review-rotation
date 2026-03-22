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
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/mdc',
    'nuxt-llms',
  ],

  mcpToolkit: {
    route: '/mcp',
  },

  llms: {
    domain: 'https://nordreview.nordhealth.com',
    title: 'Nord Review',
    description: 'Code review rotation management tool by Nordhealth. Automates reviewer assignments for development teams, supports individual developer and squad-based rotations, and integrates with Slack and GitLab.',
    sections: [
      {
        title: 'API',
        description: 'REST API for managing teams, developers, rotations, and assignments. Interactive docs available at /docs/api (Scalar UI).',
        links: [
          { title: 'OpenAPI Specification', href: '/_openapi.json', description: 'Machine-readable OpenAPI 3 spec for all endpoints' },
          { title: 'API Docs (Scalar)', href: '/docs/api', description: 'Interactive API documentation and playground' },
        ],
      },
      {
        title: 'MCP Server',
        description: 'Model Context Protocol endpoint for AI assistants. Authenticate with a Bearer API key.',
        links: [
          { title: 'MCP Endpoint', href: '/mcp', description: 'Streamable HTTP MCP server with tools: get-current-reviewers, list-teams, list-developers' },
        ],
      },
      {
        title: 'Public API',
        description: 'API-key authenticated endpoints for external integrations.',
        links: [
          { title: 'Current Rotations', href: '/api/public/rotations', description: 'Get latest rotation assignments. Filterable by teamId, developerId, squadId, and mode (devs/teams)' },
        ],
      },
    ],
  },

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  components: {
    dirs: [
      {
        path: '~/components',
        ignore: ['**/index.ts'],
      },
    ],
  },

  css: ['~/assets/css/main.css'],

  shadcn: {
    prefix: 'UI',
    componentDir: './app/components/ui',
  },

  routeRules: {
    '/docs/api': { redirect: '/_scalar' },
  },

  nitro: {
    experimental: {
      tasks: true,
      openAPI: true,
    },
    openAPI: {
      meta: {
        title: 'Nord Review API',
        description: 'Code review rotation management API',
      },
      ui: {
        scalar: {
          customCss: `
            .light-mode {
              --scalar-color-accent: #3559C7;
              --theme-color-accent: #3559C7;
            }
            .dark-mode {
              --scalar-color-accent: #5C82E5;
              --theme-color-accent: #5C82E5;
            }
            .section-flare-item:nth-of-type(1),
            .section-flare-item:nth-of-type(2) { background: #5C82E5 !important; }
          `,
        },
      },
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
    emailFrom: 'Nord Review <onboarding@resend.dev>',
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
