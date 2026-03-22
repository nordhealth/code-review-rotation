<script setup lang="ts">
import { Search } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)
const debouncedValue = refDebounced(localValue, 250)

watch(() => props.modelValue, (value) => {
  localValue.value = value
})

watch(debouncedValue, (value) => {
  emit('update:modelValue', value)
})
</script>

<template>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <UIInput
      v-model="localValue"
      type="text"
      :placeholder="placeholder ?? 'Search...'"
      :aria-label="placeholder || 'Search'"
      class="pl-10"
    />
  </div>
</template>
