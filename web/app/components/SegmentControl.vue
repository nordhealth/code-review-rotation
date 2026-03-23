<script setup lang="ts">
interface Option {
  value: string
  label: string
  to?: string
}

const props = defineProps<{
  options: Option[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const route = useRoute()

function isActive(option: Option): boolean {
  if (option.to) {
    return route.path === option.to
  }
  return props.modelValue === option.value
}

const activeClass = 'bg-background text-foreground shadow-sm'
const inactiveClass = 'text-muted-foreground hover:text-foreground'
</script>

<template>
  <div class="flex gap-1 rounded-lg bg-muted p-1 w-fit">
    <template v-for="option in options" :key="option.value">
      <NuxtLink
        v-if="option.to"
        :to="{ path: option.to, query: route.query }"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="isActive(option) ? activeClass : inactiveClass"
      >
        {{ option.label }}
      </NuxtLink>
      <button
        v-else
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="isActive(option) ? activeClass : inactiveClass"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </template>
  </div>
</template>
