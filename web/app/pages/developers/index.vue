<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'

useHead({ title: 'Developers | Nord Review' })

const { confirm } = useConfirm()
const { data: developers, refresh } = useFetch('/api/developers')
const search = ref('')

const filteredDevelopers = computed(() => {
  if (!developers.value)
    return []
  if (!search.value)
    return developers.value
  const q = search.value.toLowerCase()
  return developers.value.filter(
    d => d.firstName.toLowerCase().includes(q) || d.lastName.toLowerCase().includes(q),
  )
})

async function deleteDeveloper(slug: string, name: string) {
  const confirmed = await confirm({
    title: 'Delete developer',
    description: `Are you sure you want to delete ${name}? This cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed)
    return
  await $fetch(`/api/developers/${slug}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <PageHeader title="Developers" description="Manage developers available for code review rotation" />
      <UIButton as-child>
        <NuxtLink to="/developers/new" class="gap-2">
          <Plus class="size-4" />
          <TrimText>New Developer</TrimText>
        </NuxtLink>
      </UIButton>
    </div>

    <SearchInput v-model="search" placeholder="Search by name..." />

    <div v-if="filteredDevelopers.length" class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Name
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Slack ID
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              GitLab ID
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              GitHub ID
            </th>
            <th class="px-4 py-2.5 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="dev in filteredDevelopers"
            :key="dev.id"
            class="border-b last:border-b-0 hover:bg-muted/30"
          >
            <td class="px-4 py-3 font-medium">
              <NuxtLink :to="`/developers/${dev.slug}`" class="hover:underline">
                {{ dev.firstName }} {{ dev.lastName }}
              </NuxtLink>
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ dev.slackId }}
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ dev.gitlabId }}
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ dev.githubId }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <UIButton as-child variant="outline" size="sm" class="h-7 px-2.5 text-xs">
                  <NuxtLink :to="`/developers/${dev.slug}/edit`">
                    <TrimText>Edit</TrimText>
                  </NuxtLink>
                </UIButton>
                <UIButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete"
                  @click="deleteDeveloper(dev.slug, `${dev.firstName} ${dev.lastName}`)"
                >
                  <Trash2 class="size-4" />
                </UIButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState v-else-if="developers?.length === 0" message="No developers yet">
      <UIButton as-child size="sm" class="mt-3">
        <NuxtLink to="/developers/new" class="gap-1.5">
          <Plus class="size-4" />
          <TrimText>Add your first developer</TrimText>
        </NuxtLink>
      </UIButton>
    </EmptyState>

    <div
      v-else-if="search && filteredDevelopers.length === 0"
      class="py-8 text-center text-sm text-muted-foreground"
    >
      No developers matching "{{ search }}"
    </div>
  </div>
</template>
