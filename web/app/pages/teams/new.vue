<script setup lang="ts">
import { Save } from 'lucide-vue-next'

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
  <div class="space-y-8">
    <PageHeader title="New Team" description="Create a new code review rotation team" />

    <div class="max-w-xl space-y-6">
      <ErrorBanner v-if="error" :message="error" />

      <!-- General -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          General
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Team name and default reviewer count for rotations.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <UILabel for="new-team-name">
              Team Name *
            </UILabel>
            <UIInput id="new-team-name" v-model="form.name" type="text" placeholder="Clinical Foundation" required />
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
            <p class="text-sm text-muted-foreground">
              Number of reviewers assigned per rotation
            </p>
          </div>

          <div class="flex items-center gap-3">
            <UIButton type="submit" :disabled="submitting">
              <Save class="size-4" />
              {{ submitting ? 'Creating...' : 'Create Team' }}
            </UIButton>
            <UIButton as-child variant="ghost">
              <NuxtLink to="/">
                Cancel
              </NuxtLink>
            </UIButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
