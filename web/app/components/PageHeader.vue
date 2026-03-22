<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div>
    <h1 class="text-3xl font-semibold tracking-tight">
      {{ title }}
    </h1>
    <p v-if="description" class="text-sm text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
