<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

defineProps<{
  id?: string
  modelValue: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
</script>

<template>
  <div class="relative">
    <UIInput
      :id
      :value="modelValue"
      :type="showPassword ? 'text' : 'password'"
      :placeholder
      :autocomplete
      :disabled
      class="pr-10"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      :aria-label="showPassword ? 'Hide password' : 'Show password'"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      @click="showPassword = !showPassword"
    >
      <EyeOff v-if="showPassword" class="size-4" />
      <Eye v-else class="size-4" />
    </button>
  </div>
</template>
