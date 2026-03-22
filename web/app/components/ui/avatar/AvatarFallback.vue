<script setup lang="ts">
import type { AvatarFallbackProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { AvatarFallback } from 'reka-ui'
import { cn, getAvatarColor } from '@/lib/utils'

const props = defineProps<
  AvatarFallbackProps & {
    class?: HTMLAttributes['class']
    label?: string
  }
>()

const avatarColors = computed(() => {
  if (!props.label)
    return undefined
  return getAvatarColor(props.label)
})

const colorVars = computed(() => {
  if (!avatarColors.value)
    return undefined
  const { light, dark } = avatarColors.value
  return {
    '--avatar-bg-light': light.bg,
    '--avatar-text-light': light.text,
    '--avatar-border-light': `${light.text}20`,
    '--avatar-bg-dark': dark.bg,
    '--avatar-text-dark': dark.text,
    '--avatar-border-dark': `${dark.text}20`,
  }
})
</script>

<template>
  <AvatarFallback
    :delay-ms="props.delayMs"
    :style="colorVars"
    :class="cn('avatar-color flex size-full items-center justify-center font-semibold border rounded-[inherit]', props.class)"
  >
    <TrimText><slot /></TrimText>
  </AvatarFallback>
</template>

<style>
.avatar-color {
  background-color: var(--avatar-bg-light);
  color: var(--avatar-text-light);
  border-color: var(--avatar-border-light);
}

.dark .avatar-color {
  background-color: var(--avatar-bg-dark);
  color: var(--avatar-text-dark);
  border-color: var(--avatar-border-dark);
}
</style>
