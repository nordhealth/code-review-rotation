<script setup lang="ts">
defineProps<{
  label: string
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'muted'
}>()

const colorClasses: Record<string, string> = {
  green: 'border border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'border border-yellow-400 bg-yellow-100 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'border border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
  purple: 'border border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  blue: 'border border-primary/20 bg-primary/10 text-primary-text dark:border-primary/30',
  muted: 'border border-border bg-muted text-muted-foreground',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="colorClasses[color ?? 'muted']"
  >
    <slot />
    <TrimText>{{ label }}</TrimText>
  </span>
</template>
