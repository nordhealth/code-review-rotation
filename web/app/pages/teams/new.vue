<script setup lang="ts">
const router = useRouter()

const form = reactive({
  name: '',
  defaultReviewerCount: 2,
})
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (!form.name) return
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/teams', {
      method: 'POST',
      body: {
        name: form.name,
        defaultReviewerCount: form.defaultReviewerCount,
      },
    })
    router.push('/')
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to create team'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">New Team</h1>
      <p class="text-sm text-muted-foreground">Create a new code review rotation team</p>
    </div>

    <div v-if="error" class="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {{ error }}
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-2">
        <UILabel for="new-team-name">Team Name *</UILabel>
        <UIInput
          id="new-team-name"
          v-model="form.name"
          type="text"
          required
        />
      </div>

      <div class="space-y-2">
        <UILabel for="new-team-count">Default Reviewer Count</UILabel>
        <UINumberField v-model="form.defaultReviewerCount" :min="1">
          <UINumberFieldContent>
            <UINumberFieldDecrement />
            <UINumberFieldInput id="new-team-count" />
            <UINumberFieldIncrement />
          </UINumberFieldContent>
        </UINumberField>
        <p class="text-xs text-muted-foreground">Number of reviewers assigned per rotation</p>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <UIButton type="submit" :disabled="submitting">
          {{ submitting ? 'Creating...' : 'Create Team' }}
        </UIButton>
        <UIButton as-child variant="ghost">
          <NuxtLink to="/">Cancel</NuxtLink>
        </UIButton>
      </div>
    </form>
  </div>
</template>
