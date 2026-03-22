<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div role="status" class="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
    {{ message }}
  </div>
</template>
