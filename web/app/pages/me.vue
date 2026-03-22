<script setup lang="ts">
import type { Developer } from '~/types'
import { Check, ChevronsUpDown, Link } from 'lucide-vue-next'

useHead({ title: 'My Reviews | Nord Review' })

const { user, fetch: refreshSession } = useUserSession()

if (user.value?.developerSlug) {
  await navigateTo(`/developers/${user.value.developerSlug}`, { replace: true })
}

const { data: developers } = await useFetch<Developer[]>('/api/developers')

const selectedDeveloperId = ref<string | undefined>(undefined)
const saving = ref(false)
const error = ref('')

const selectedDeveloper = computed(() =>
  developers.value?.find(developer => developer.id === selectedDeveloperId.value),
)

const open = ref(false)

async function linkDeveloper() {
  if (!selectedDeveloperId.value)
    return
  saving.value = true
  error.value = ''
  try {
    const result = await $fetch<{ developerSlug: string }>('/api/developers/me', {
      method: 'PUT',
      body: { developerId: selectedDeveloperId.value },
    })
    await refreshSession()
    await navigateTo(`/developers/${result.developerSlug}`, { replace: true })
  }
  catch (fetchError) {
    error.value = extractErrorMessage(fetchError, 'Failed to link developer profile')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div data-testid="me-page" class="mx-auto max-w-lg space-y-6 pt-8">
    <PageHeader
      title="My Reviews"
      description="Link your account to a developer profile to see your rotation assignments."
    />

    <div class="rounded-lg border bg-card p-6 space-y-4">
      <h3 class="text-base font-semibold">
        Link your developer profile
      </h3>
      <p class="text-sm text-muted-foreground">
        Select the developer profile that represents you. This connects your login to your rotation data.
      </p>

      <ErrorBanner v-if="error" :message="error" />

      <div class="space-y-3">
        <UILabel>Developer profile</UILabel>
        <UIPopover v-model:open="open">
          <UIPopoverTrigger as-child>
            <UIButton
              data-testid="developer-select-trigger"
              variant="outline"
              role="combobox"
              :aria-expanded="open"
              class="w-full justify-between"
            >
              <span v-if="selectedDeveloper">
                {{ selectedDeveloper.firstName }} {{ selectedDeveloper.lastName }}
              </span>
              <span v-else class="text-muted-foreground">
                Select a developer...
              </span>
              <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
            </UIButton>
          </UIPopoverTrigger>
          <UIPopoverContent class="w-[--reka-popper-anchor-width] p-0">
            <UICommand>
              <UICommandInput placeholder="Search developer..." />
              <UICommandEmpty>No developer found.</UICommandEmpty>
              <UICommandList>
                <UICommandGroup>
                  <UICommandItem
                    v-for="developer in developers"
                    :key="developer.id"
                    :value="`${developer.firstName} ${developer.lastName}`"
                    @select="selectedDeveloperId = developer.id; open = false"
                  >
                    <div class="flex items-center gap-2">
                      <div class="flex size-4 items-center justify-center">
                        <Check
                          v-if="selectedDeveloperId === developer.id"
                          class="size-3.5"
                        />
                      </div>
                      <UIAvatar class="size-5">
                        <UIAvatarFallback
                          class="!text-[8px] !font-semibold !leading-none"
                          :label="getInitials(developer.firstName, developer.lastName)"
                        >
                          {{ getInitials(developer.firstName, developer.lastName) }}
                        </UIAvatarFallback>
                      </UIAvatar>
                      {{ developer.firstName }} {{ developer.lastName }}
                    </div>
                  </UICommandItem>
                </UICommandGroup>
              </UICommandList>
            </UICommand>
          </UIPopoverContent>
        </UIPopover>
      </div>

      <UIButton
        data-testid="link-profile-button"
        :disabled="!selectedDeveloperId || saving"
        class="w-full"
        @click="linkDeveloper"
      >
        <Link class="size-4" />
        {{ saving ? 'Linking...' : 'Link Profile' }}
      </UIButton>
    </div>
  </div>
</template>
