<script setup lang="ts">
defineProps<{
  as?: string
}>()
</script>

<template>
  <component :is="as ?? 'span'" class="trim-text">
    <slot />
  </component>
</template>
