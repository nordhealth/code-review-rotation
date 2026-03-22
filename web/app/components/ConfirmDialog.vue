<script setup lang="ts">
const { state, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <UIAlertDialog :open="state.open" @update:open="(value: boolean) => { if (!value) handleCancel() }">
    <UIAlertDialogContent>
      <UIAlertDialogHeader>
        <UIAlertDialogTitle>{{ state.title }}</UIAlertDialogTitle>
        <UIAlertDialogDescription>{{ state.description }}</UIAlertDialogDescription>
      </UIAlertDialogHeader>
      <UIAlertDialogFooter>
        <UIAlertDialogCancel @click="handleCancel">
          Cancel
        </UIAlertDialogCancel>
        <UIAlertDialogAction
          :class="state.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click="handleConfirm"
        >
          {{ state.confirmLabel }}
        </UIAlertDialogAction>
      </UIAlertDialogFooter>
    </UIAlertDialogContent>
  </UIAlertDialog>
</template>
