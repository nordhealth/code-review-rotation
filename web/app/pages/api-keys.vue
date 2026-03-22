<script setup lang="ts">
import { Check, Copy, Key, Plus, Trash2 } from 'lucide-vue-next'

useHead({ title: 'API Keys | Nord Review' })

interface ApiKeyEntry {
  id: string
  name: string
  keyPrefix: string
  createdAt: string
}

const { confirm } = useConfirm()
const { data: keys, refresh } = await useFetch<ApiKeyEntry[]>('/api/keys')

const newKeyName = ref('')
const creating = ref(false)
const error = ref('')

const revealedKey = ref<string | null>(null)
const copied = ref(false)
const copiedCurl = ref(false)

const showCreateForm = ref(false)

const origin = useRequestURL().origin

async function createKey() {
  if (!newKeyName.value.trim())
    return
  creating.value = true
  error.value = ''
  revealedKey.value = null
  try {
    const result = await $fetch<ApiKeyEntry & { plainKey: string }>('/api/keys', {
      method: 'POST',
      body: { name: newKeyName.value.trim() },
    })
    revealedKey.value = result.plainKey
    newKeyName.value = ''
    showCreateForm.value = false
    await refresh()
  }
  catch (createError) {
    error.value = extractErrorMessage(createError, 'Failed to create API key')
  }
  finally {
    creating.value = false
  }
}

async function deleteKey(id: string, name: string) {
  const confirmed = await confirm({
    title: 'Revoke API key',
    description: `Revoke "${name}"? Any integration using it will stop working.`,
    confirmLabel: 'Revoke',
    variant: 'destructive',
  })
  if (!confirmed)
    return
  try {
    await $fetch(`/api/keys/${id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (deleteError) {
    error.value = extractErrorMessage(deleteError, 'Failed to revoke key')
  }
}

async function copyKey() {
  if (!revealedKey.value)
    return
  await navigator.clipboard.writeText(revealedKey.value)
  copied.value = true
  useTimeoutFn(() => (copied.value = false), 2000)
}

async function copyCurl() {
  if (!revealedKey.value)
    return
  await navigator.clipboard.writeText(
    `curl -H "Authorization: Bearer ${revealedKey.value}" ${origin}/api/public/rotations`,
  )
  copiedCurl.value = true
  useTimeoutFn(() => (copiedCurl.value = false), 2000)
}

function dismissRevealedKey() {
  revealedKey.value = null
  copied.value = false
  copiedCurl.value = false
}
</script>

<template>
  <div data-testid="api-keys-page" class="space-y-8">
    <div class="flex items-center justify-between">
      <PageHeader title="API Keys" description="Generate keys for external integrations (Slackbots, scripts) to access the read-only rotations API." />
      <span v-if="!revealedKey" data-testid="create-key-button">
        <UIButton type="button" @click="showCreateForm = !showCreateForm">
          <Plus class="size-4" />
          Create API Key
        </UIButton>
      </span>
    </div>

    <ErrorBanner v-if="error" :message="error" />

    <!-- Create form -->
    <div v-if="showCreateForm && !revealedKey" data-testid="create-key-form" class="max-w-lg rounded-lg border bg-card p-5">
      <h3 class="text-base font-semibold">
        Create a new API key
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Give your key a name so you can identify it later.
      </p>
      <form class="mt-4 space-y-4" @submit.prevent="createKey">
        <div class="space-y-2">
          <UILabel for="key-name">
            Key name
          </UILabel>
          <UIInput
            id="key-name"
            v-model="newKeyName"
            data-testid="key-name-input"
            type="text"
            placeholder="Slack Rotation Bot, CI Pipeline"
            required
          />
        </div>
        <div class="flex items-center gap-2">
          <span data-testid="generate-key-button">
            <UIButton type="submit" :disabled="creating || !newKeyName.trim()">
              {{ creating ? "Generating..." : "Generate Key" }}
            </UIButton>
          </span>
          <span data-testid="cancel-create-button">
            <UIButton type="button" variant="ghost" @click="showCreateForm = false">
              Cancel
            </UIButton>
          </span>
        </div>
      </form>
    </div>

    <!-- Revealed key (post-creation) -->
    <div v-if="revealedKey" data-testid="key-revealed" class="space-y-6">
      <div class="rounded-lg border border-green-500/30 bg-green-500/5 p-5">
        <h3 class="text-base font-semibold text-green-700 dark:text-green-400">
          Your API key has been created
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Copy this key now. For security, it won't be shown again.
        </p>

        <div class="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-green-500/30 bg-background px-4 py-3">
          <code data-testid="revealed-key-value" class="flex-1 break-all font-mono text-sm">
            {{ revealedKey }}
          </code>
          <span data-testid="copy-key-button">
            <UIButton type="button" size="sm" variant="outline" class="shrink-0" @click="copyKey">
              <Check v-if="copied" class="size-4" />
              <Copy v-else class="size-4" />
              {{ copied ? "Copied" : "Copy" }}
            </UIButton>
          </span>
        </div>
      </div>

      <div data-testid="test-key-section" class="rounded-lg border bg-card p-5">
        <h3 class="text-base font-semibold">
          Test your key
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Run this command in a terminal to verify it works.
        </p>
        <div class="mt-3 flex items-start gap-2 rounded-lg bg-muted px-4 py-3">
          <code data-testid="curl-command" class="flex-1 break-all font-mono text-xs leading-relaxed">
            curl -H "Authorization: Bearer {{ revealedKey }}" \<br>
            {{ origin }}/api/public/rotations
          </code>
          <UIButton type="button" size="sm" variant="ghost" class="shrink-0" @click="copyCurl">
            <Check v-if="copiedCurl" class="size-4" />
            <Copy v-else class="size-4" />
          </UIButton>
        </div>
      </div>

      <span data-testid="done-button">
        <UIButton type="button" variant="outline" @click="dismissRevealedKey">
          Done
        </UIButton>
      </span>
    </div>

    <!-- Existing keys table -->
    <div v-if="keys?.length && !revealedKey" data-testid="keys-table" class="space-y-3">
      <h2 class="text-xl font-semibold">
        Active keys
      </h2>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                Name
              </th>
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                Key
              </th>
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                Created
              </th>
              <th class="px-4 py-2.5 text-right text-sm font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key.id" :data-testid="`key-row-${key.name}`" class="border-b last:border-b-0 hover:bg-muted/30">
              <td class="px-4 py-3 font-medium">
                <div class="flex items-center gap-2">
                  <Key class="size-3.5 text-muted-foreground" />
                  {{ key.name }}
                </div>
              </td>
              <td class="px-4 py-3">
                <code class="text-xs text-muted-foreground">{{ key.keyPrefix }}...</code>
              </td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ formatDate(key.createdAt) }}
              </td>
              <td class="px-4 py-3 text-right">
                <span data-testid="revoke-key-button">
                  <UIButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    @click="deleteKey(key.id, key.name)"
                  >
                    <Trash2 class="size-3.5" />
                    Revoke
                  </UIButton>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <EmptyState v-else-if="!keys?.length && !revealedKey" data-testid="empty-state" message="No API keys yet">
      <template #icon>
        <Key class="size-8 text-muted-foreground/50" />
      </template>
    </EmptyState>

    <!-- Usage reference (always visible when not in reveal state) -->
    <div v-if="!revealedKey" data-testid="usage-section" class="max-w-lg rounded-lg border bg-muted/30 px-5 py-4">
      <h3 class="text-base font-medium">
        Usage
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Pass the key as a Bearer token to the public rotations endpoint:
      </p>
      <code class="mt-2 block rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">
        curl -H "Authorization: Bearer rl_your_key_here"
        {{ origin }}/api/public/rotations
      </code>
      <p class="mt-2 text-sm text-muted-foreground">
        Query params: <code class="font-mono">teamId</code>,
        <code class="font-mono">developerId</code>, <code class="font-mono">squadId</code>,
        <code class="font-mono">mode</code> (devs | teams)
      </p>
    </div>
  </div>
</template>
