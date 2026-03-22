<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div role="alert" class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {{ message }}
  </div>
</template>
