<script setup lang="ts">
useHead({ title: 'New Team | Nord Review' })

const router = useRouter()

const form = reactive({
  name: '',
  defaultReviewerCount: 2,
})
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (!form.name)
    return
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
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to create team')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <PageHeader title="New Team" description="Create a new code review rotation team" />

    <ErrorBanner v-if="error" :message="error" />

    <form class="space-y-4" @submit.prevent="submit">
      <div class="space-y-2">
        <UILabel for="new-team-name">
          Team Name *
        </UILabel>
        <UIInput
          id="new-team-name"
          v-model="form.name"
          type="text"
          required
        />
      </div>

      <div class="space-y-2">
        <UILabel for="new-team-count">
          Default Reviewer Count
        </UILabel>
        <UINumberField v-model="form.defaultReviewerCount" :min="1">
          <UINumberFieldContent>
            <UINumberFieldDecrement />
            <UINumberFieldInput id="new-team-count" />
            <UINumberFieldIncrement />
          </UINumberFieldContent>
        </UINumberField>
        <p class="text-xs text-muted-foreground">
          Number of reviewers assigned per rotation
        </p>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <UIButton type="submit" :disabled="submitting">
          {{ submitting ? 'Creating...' : 'Create Team' }}
        </UIButton>
        <UIButton as-child variant="ghost">
          <NuxtLink to="/">
            <TrimText>Cancel</TrimText>
          </NuxtLink>
        </UIButton>
      </div>
    </form>
  </div>
</template>
