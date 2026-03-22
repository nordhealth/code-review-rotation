<script setup lang="ts">
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
  <div class="max-w-lg space-y-6">
    <PageHeader title="New Developer" description="Add a new developer to the system" />

    <ErrorBanner v-if="error" :message="error" />

    <form class="space-y-4" @submit.prevent="submit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <UILabel for="new-dev-firstname">
            First Name *
          </UILabel>
          <UIInput
            id="new-dev-firstname"
            v-model="form.firstName"
            type="text"
            placeholder="John"
            required
          />
        </div>
        <div class="space-y-2">
          <UILabel for="new-dev-lastname">
            Last Name *
          </UILabel>
          <UIInput
            id="new-dev-lastname"
            v-model="form.lastName"
            type="text"
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div class="space-y-2">
        <UILabel for="new-dev-slack">
          Slack ID
        </UILabel>
        <UIInput
          id="new-dev-slack"
          v-model="form.slackId"
          type="text"
          placeholder="U0..."
        />
      </div>

      <div class="space-y-2">
        <UILabel for="new-dev-gitlab">
          GitLab ID
        </UILabel>
        <UIInput
          id="new-dev-gitlab"
          v-model="form.gitlabId"
          type="text"
          placeholder="john.doe"
        />
      </div>

      <div class="space-y-2">
        <UILabel for="new-dev-github">
          GitHub ID
        </UILabel>
        <UIInput
          id="new-dev-github"
          v-model="form.githubId"
          type="text"
          placeholder="johndoe"
        />
      </div>

      <div class="flex items-center gap-3 pt-2">
        <UIButton type="submit" :disabled="submitting">
          {{ submitting ? 'Creating...' : 'Create Developer' }}
        </UIButton>
        <UIButton as-child variant="ghost">
          <NuxtLink to="/developers">
            <TrimText>Cancel</TrimText>
          </NuxtLink>
        </UIButton>
      </div>
    </form>
  </div>
</template>
