<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
    <slot name="icon" />
    <p class="text-sm text-muted-foreground">
      {{ message }}
    </p>
    <slot />
  </div>
</template>
