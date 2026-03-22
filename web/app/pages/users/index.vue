<script setup lang="ts">
import { Mail, Shield, ShieldCheck } from 'lucide-vue-next'

useHead({ title: 'Users | Nord Review' })

const { confirm } = useConfirm()
const { user: currentUser } = useUserSession()
const { data: users, refresh } = useFetch('/api/users')
const search = ref('')
const updatingId = ref<string | null>(null)

const showInviteForm = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')

async function sendInvite() {
  if (!inviteEmail.value)
    return
  inviting.value = true
  inviteError.value = ''
  inviteSuccess.value = ''
  try {
    const result = await $fetch<{ message: string }>('/api/users/invite', {
      method: 'POST',
      body: { email: inviteEmail.value },
    })
    inviteSuccess.value = result.message
    inviteEmail.value = ''
  }
  catch (error) {
    inviteError.value = extractErrorMessage(error, 'Failed to send invite')
  }
  finally {
    inviting.value = false
  }
}

const filteredUsers = computed(() => {
  if (!users.value)
    return []
  if (!search.value)
    return users.value
  const query = search.value.toLowerCase()
  return users.value.filter(
    user =>
      user.email.toLowerCase().includes(query)
      || (user.firstName ?? '').toLowerCase().includes(query)
      || (user.lastName ?? '').toLowerCase().includes(query),
  )
})

async function toggleRole(user: { id: string, role: string }) {
  if (user.id === currentUser.value?.id)
    return
  const newRole = user.role === 'admin' ? 'developer' : 'admin'
  const label = newRole === 'admin' ? 'grant admin access to' : 'remove admin access from'

  const confirmed = await confirm({
    title: newRole === 'admin' ? 'Grant admin access' : 'Remove admin access',
    description: `Are you sure you want to ${label} this user?`,
    confirmLabel: newRole === 'admin' ? 'Grant Admin' : 'Remove Admin',
    variant: newRole === 'developer' ? 'destructive' : 'default',
  })
  if (!confirmed)
    return

  updatingId.value = user.id
  try {
    await $fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      body: { role: newRole },
    })
    await refresh()
  }
  finally {
    updatingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <PageHeader title="Users" description="Manage user accounts and roles" />
      <UIButton type="button" @click="showInviteForm = !showInviteForm">
        <Mail class="size-4" />
        Invite User
      </UIButton>
    </div>

    <div v-if="showInviteForm" class="rounded-lg border bg-card p-4">
      <h3 class="text-base font-semibold">
        Invite User
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Send a registration link to a colleague. They'll create their own account and confirm their email.
      </p>
      <ErrorBanner v-if="inviteError" :message="inviteError" class="mt-2" />
      <SuccessBanner v-if="inviteSuccess" :message="inviteSuccess" class="mt-2" />
      <form class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="sendInvite">
        <div class="flex-1 space-y-1.5">
          <UILabel for="invite-email">
            Email
          </UILabel>
          <EmailInput id="invite-email" v-model="inviteEmail" />
        </div>
        <UIButton type="submit" :disabled="inviting || !inviteEmail">
          {{ inviting ? 'Sending...' : 'Send Invite' }}
        </UIButton>
        <UIButton type="button" variant="ghost" @click="showInviteForm = false">
          Cancel
        </UIButton>
      </form>
    </div>

    <SearchInput v-model="search" placeholder="Search by name or email..." />

    <div v-if="filteredUsers.length" class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50">
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Name
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Email
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Role
            </th>
            <th class="hidden px-4 py-2.5 text-left text-sm font-medium text-muted-foreground sm:table-cell">
              Developer
            </th>
            <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
              Confirmed
            </th>
            <th class="px-4 py-2.5 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="border-b last:border-b-0 hover:bg-muted/30"
          >
            <td class="px-4 py-3 font-medium">
              {{ user.firstName }} {{ user.lastName }}
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ user.email }}
            </td>
            <td class="px-4 py-3">
              <StatusBadge
                :label="capitalizeFirst(user.role)"
                :color="user.role === 'admin' ? 'blue' : 'muted'"
              >
                <ShieldCheck v-if="user.role === 'admin'" class="size-3" />
                <Shield v-else class="size-3" />
              </StatusBadge>
            </td>
            <td class="hidden px-4 py-3 sm:table-cell">
              <span v-if="user.developerName" class="text-sm">
                {{ user.developerName }} {{ user.developerLastName }}
              </span>
              <span v-else class="text-xs text-muted-foreground">—</span>
            </td>
            <td class="px-4 py-3">
              <StatusBadge
                :label="user.emailConfirmed ? 'Yes' : 'No'"
                :color="user.emailConfirmed ? 'green' : 'yellow'"
              />
            </td>
            <td class="px-4 py-3 text-right">
              <UIButton
                v-if="user.id !== currentUser?.id"
                type="button"
                variant="outline"
                size="sm"
                class="h-7 px-2.5 text-xs"
                :disabled="updatingId === user.id"
                @click="toggleRole(user)"
              >
                {{ user.role === "admin" ? "Remove Admin" : "Make Admin" }}
              </UIButton>
              <span v-else class="text-xs text-muted-foreground">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState v-else-if="users?.length === 0" message="No users found" />

    <div
      v-else-if="search && filteredUsers.length === 0"
      class="py-8 text-center text-sm text-muted-foreground"
    >
      No users matching "{{ search }}"
    </div>
  </div>
</template>
