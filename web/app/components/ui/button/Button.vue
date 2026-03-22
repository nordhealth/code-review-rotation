<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes, VNode } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})

const slots = defineSlots<{ default: () => VNode[] }>()

function wrapTextNodes() {
  const children = slots.default?.() ?? []
  return children.map((vnode) => {
    if (typeof vnode.children === 'string' && vnode.children.trim()) {
      return h(TrimText, null, () => vnode.children)
    }
    return vnode
  })
}
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <template v-if="asChild">
      <slot />
    </template>
    <component :is="() => wrapTextNodes()" v-else />
  </Primitive>
</template>
