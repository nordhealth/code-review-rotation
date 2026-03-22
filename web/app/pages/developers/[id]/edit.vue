<script setup lang="ts">
import { Save } from 'lucide-vue-next'

useHead({ title: 'Edit Developer | Nord Review' })

const route = useRoute()
const router = useRouter()
const devSlug = route.params.id as string

const { data: developer } = await useFetch(`/api/developers/${devSlug}`)

const form = reactive({
  firstName: developer.value?.firstName ?? '',
  lastName: developer.value?.lastName ?? '',
  slackId: developer.value?.slackId ?? '',
  gitlabId: developer.value?.gitlabId ?? '',
  githubId: developer.value?.githubId ?? '',
})
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (!form.firstName || !form.lastName)
    return
  submitting.value = true
  error.value = ''
  try {
    const updated = await $fetch(`/api/developers/${devSlug}`, {
      method: 'PUT',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        slackId: form.slackId || null,
        gitlabId: form.gitlabId || null,
        githubId: form.githubId || null,
      },
    })
    router.push(`/developers/${updated.slug}`)
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to update developer')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="!developer" class="py-12 text-center text-sm text-muted-foreground">
      Developer not found
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center gap-4">
        <UIAvatar class="size-12">
          <UIAvatarFallback
            class="text-xl"
            :label="getInitials(developer.firstName, developer.lastName)"
          >
            {{ getInitials(developer.firstName, developer.lastName) }}
          </UIAvatarFallback>
        </UIAvatar>
        <div>
          <h1 class="text-3xl font-semibold tracking-tight mb-1">
            Edit {{ developer.firstName }} {{ developer.lastName }}
          </h1>
          <p class="text-sm text-muted-foreground">
            Update developer details and integrations
          </p>
        </div>
      </div>

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
              <UILabel for="edit-dev-firstname">
                First Name *
              </UILabel>
              <UIInput id="edit-dev-firstname" v-model="form.firstName" type="text" placeholder="John" required />
            </div>
            <div class="space-y-2">
              <UILabel for="edit-dev-lastname">
                Last Name *
              </UILabel>
              <UIInput id="edit-dev-lastname" v-model="form.lastName" type="text" placeholder="Doe" required />
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
              <UILabel for="edit-dev-slack" class="inline-flex items-center gap-1.5">
                <IconsSlackIcon class="size-4" />
                Slack ID
              </UILabel>
              <UIInput id="edit-dev-slack" v-model="form.slackId" type="text" placeholder="U0..." />
            </div>

            <div class="space-y-2">
              <UILabel for="edit-dev-gitlab" class="inline-flex items-center gap-1.5">
                <IconsGitlabIcon class="size-4" />
                GitLab ID
              </UILabel>
              <UIInput id="edit-dev-gitlab" v-model="form.gitlabId" type="text" placeholder="john.doe" />
            </div>

            <div class="space-y-2">
              <UILabel for="edit-dev-github" class="inline-flex items-center gap-1.5">
                <IconsGithubIcon class="size-4" />
                GitHub ID
              </UILabel>
              <UIInput id="edit-dev-github" v-model="form.githubId" type="text" placeholder="johndoe" />
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <UIButton type="button" :disabled="submitting" @click="submit">
            <Save class="size-4" />
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
          <UIButton as-child variant="ghost">
            <NuxtLink :to="`/developers/${devSlug}`">
              Cancel
            </NuxtLink>
          </UIButton>
        </div>
      </div>
    </template>
  </div>
</template>
