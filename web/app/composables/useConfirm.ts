interface ConfirmState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'destructive'
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirm',
  variant: 'default',
  resolve: null,
})

export function useConfirm() {
  function confirm(options: {
    title: string
    description: string
    confirmLabel?: string
    variant?: 'default' | 'destructive'
  }): Promise<boolean> {
    return new Promise((resolve) => {
      state.title = options.title
      state.description = options.description
      state.confirmLabel = options.confirmLabel ?? 'Confirm'
      state.variant = options.variant ?? 'default'
      state.resolve = resolve
      state.open = true
    })
  }

  function handleConfirm() {
    state.resolve?.(true)
    state.open = false
  }

  function handleCancel() {
    state.resolve?.(false)
    state.open = false
  }

  return {
    state: readonly(state),
    confirm,
    handleConfirm,
    handleCancel,
  }
}
