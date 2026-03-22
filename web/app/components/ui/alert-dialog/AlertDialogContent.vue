<script setup lang="ts">
import type { AlertDialogContentEmits, AlertDialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<AlertDialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-xs duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <AlertDialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-98 data-[state=open]:zoom-in-98 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 sm:rounded-lg',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
