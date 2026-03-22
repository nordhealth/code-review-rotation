<script setup lang="ts">
import { Save } from 'lucide-vue-next'

useHead({ title: 'New Developer | Nord Review' })

const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  slackId: '',
  gitlabId: '',
  githubId: '',
})
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (!form.firstName || !form.lastName)
    return
  submitting.value = true
  error.value = ''
  try {
    const created = await $fetch('/api/developers', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        slackId: form.slackId || undefined,
        gitlabId: form.gitlabId || undefined,
        githubId: form.githubId || undefined,
      },
    })
    router.push(`/developers/${created.slug}`)
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to create developer')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader title="New Developer" description="Add a new developer to the system" />

    <div class="max-w-xl space-y-6">
      <ErrorBanner v-if="error" :message="error" />

      <!-- General -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          General
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Developer name used across rotations and assignments.
        </p>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <UILabel for="new-dev-firstname">
              First Name *
            </UILabel>
            <UIInput id="new-dev-firstname" v-model="form.firstName" type="text" placeholder="John" required />
          </div>
          <div class="space-y-2">
            <UILabel for="new-dev-lastname">
              Last Name *
            </UILabel>
            <UIInput id="new-dev-lastname" v-model="form.lastName" type="text" placeholder="Doe" required />
          </div>
        </div>
      </div>

      <!-- Integrations -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          Integrations
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          External service identifiers for notifications and linking.
        </p>

        <div class="mt-5 space-y-4">
          <div class="space-y-2">
            <UILabel for="new-dev-slack" class="inline-flex items-center gap-1.5">
              <IconsSlackIcon class="size-4" />
              Slack ID
            </UILabel>
            <UIInput id="new-dev-slack" v-model="form.slackId" type="text" placeholder="U0..." />
          </div>

          <div class="space-y-2">
            <UILabel for="new-dev-gitlab" class="inline-flex items-center gap-1.5">
              <IconsGitlabIcon class="size-4" />
              GitLab ID
            </UILabel>
            <UIInput id="new-dev-gitlab" v-model="form.gitlabId" type="text" placeholder="john.doe" />
          </div>

          <div class="space-y-2">
            <UILabel for="new-dev-github" class="inline-flex items-center gap-1.5">
              <IconsGithubIcon class="size-4" />
              GitHub ID
            </UILabel>
            <UIInput id="new-dev-github" v-model="form.githubId" type="text" placeholder="johndoe" />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <UIButton type="button" :disabled="submitting" @click="submit">
          <Save class="size-4" />
          {{ submitting ? 'Creating...' : 'Create Developer' }}
        </UIButton>
        <UIButton as-child variant="ghost">
          <NuxtLink to="/developers">
            Cancel
          </NuxtLink>
        </UIButton>
      </div>
    </div>
  </div>
</template>
