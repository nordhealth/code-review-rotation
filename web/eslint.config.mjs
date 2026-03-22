import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: true,
    stylistic: {
      quotes: 'single',
      semi: false,
    },
    ignores: [
      '.nuxt',
      '.output',
      '.data',
      'node_modules',
      'coverage',
      'server/db/migrations',
      'pnpm-lock.yaml',
      'components/ui/dialog/DialogContent.vue',
    ],
  },
  {
    rules: {
      'no-alert': 'off',
      'ts/no-explicit-any': 'error',
    },
  },
)
