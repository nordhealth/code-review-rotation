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

const colorMode = useColorMode()

const colorStyle = computed(() => {
  if (!props.label)
    return undefined
  const colors = getAvatarColor(props.label)
  const scheme = colorMode.value === 'dark' ? colors.dark : colors.light
  return { backgroundColor: scheme.bg, color: scheme.text, borderColor: `${scheme.text}20` }
})
</script>

<template>
  <AvatarFallback
    :delay-ms="props.delayMs"
    :style="colorStyle"
    :class="cn('flex size-full items-center justify-center font-semibold border rounded-[inherit]', props.class)"
  >
    <slot />
  </AvatarFallback>
</template>
