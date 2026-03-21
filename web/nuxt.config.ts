import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  app: {
    head: {
      title: "ReviewLeash",
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },

  modules: [
    "@nuxthub/core",
    "shadcn-nuxt",
    "nuxt-auth-utils",
    "@vueuse/nuxt",
    "@nuxtjs/color-mode",
  ],

  colorMode: {
    classSuffix: "",
    preference: "system",
    fallback: "light",
  },

  css: ["~/assets/css/main.css"],

  shadcn: {
    prefix: "UI",
    componentDir: "./app/components/ui",
  },

  nitro: {
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      "0 * * * *": ["rotate"],
    },
  },

  hub: {
    db: "sqlite",
  },

  runtimeConfig: {
    apiKey: "",
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
});
