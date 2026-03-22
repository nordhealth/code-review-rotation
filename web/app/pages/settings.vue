<script setup lang="ts">
import type { Settings } from '~/types'
import { Check, Clock, Copy, Globe, Plus, Save, Trash2, Webhook } from 'lucide-vue-next'

useHead({ title: 'Settings | Nord Review' })

interface WebhookEntry {
  id: string
  name: string
  url: string
  events: string
  active: boolean
  createdAt: string
}

const { confirm } = useConfirm()
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const { data: settings, refresh: refreshSettings } = await useFetch<Settings>('/api/settings')
const { data: webhooksList, refresh: refreshWebhooks }
  = await useFetch<WebhookEntry[]>('/api/webhooks')

const form = reactive({
  defaultRotationIntervalDays: settings.value?.defaultRotationIntervalDays ?? 14,
  defaultRotationDay: settings.value?.defaultRotationDay ?? 'wednesday',
  defaultRotationTimezone: settings.value?.defaultRotationTimezone ?? 'Europe/Helsinki',
})

const submitting = ref(false)
const error = ref('')
const saved = ref(false)

async function save() {
  submitting.value = true
  error.value = ''
  saved.value = false
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: {
        defaultRotationIntervalDays: form.defaultRotationIntervalDays,
        defaultRotationDay: form.defaultRotationDay,
        defaultRotationTimezone: form.defaultRotationTimezone,
      },
    })
    await refreshSettings()
    saved.value = true
    useTimeoutFn(() => (saved.value = false), 3000)
  }
  catch (submitError) {
    error.value = extractErrorMessage(submitError, 'Failed to update settings')
  }
  finally {
    submitting.value = false
  }
}

const webhookForm = reactive({ name: '', url: '' })
const creatingWebhook = ref(false)
const revealedSecret = ref<string | null>(null)
const webhookError = ref('')
const copiedSecret = ref(false)

async function createNewWebhook() {
  if (!webhookForm.name.trim() || !webhookForm.url.trim())
    return
  creatingWebhook.value = true
  webhookError.value = ''
  revealedSecret.value = null
  try {
    const result = await $fetch<WebhookEntry & { secret: string }>('/api/webhooks', {
      method: 'POST',
      body: { name: webhookForm.name.trim(), url: webhookForm.url.trim() },
    })
    revealedSecret.value = result.secret
    webhookForm.name = ''
    webhookForm.url = ''
    await refreshWebhooks()
  }
  catch (createError) {
    webhookError.value = extractErrorMessage(createError, 'Failed to create webhook')
  }
  finally {
    creatingWebhook.value = false
  }
}

async function deleteExistingWebhook(id: string, name: string) {
  const confirmed = await confirm({
    title: 'Delete webhook',
    description: `Delete webhook "${name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed)
    return
  try {
    await $fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    await refreshWebhooks()
  }
  catch (deleteError) {
    webhookError.value = extractErrorMessage(deleteError, 'Failed to delete webhook')
  }
}

async function toggleWebhookActive(id: string, active: boolean) {
  try {
    await $fetch(`/api/webhooks/${id}`, { method: 'PUT', body: { active } })
    await refreshWebhooks()
  }
  catch (toggleError) {
    webhookError.value = extractErrorMessage(toggleError, 'Failed to update webhook')
  }
}

async function copySecret() {
  if (!revealedSecret.value)
    return
  await navigator.clipboard.writeText(revealedSecret.value)
  copiedSecret.value = true
  useTimeoutFn(() => (copiedSecret.value = false), 2000)
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader title="Settings" description="Global rotation schedule defaults. Teams inherit these unless they define overrides." />

    <div class="max-w-xl space-y-6">
      <ErrorBanner v-if="error" :message="error" />
      <SuccessBanner v-if="saved" message="Settings saved." />

      <!-- Rotation Schedule -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          Rotation Schedule
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Default interval, day, and timezone for all teams.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="save">
          <div class="space-y-2">
            <UILabel for="settings-interval">
              Rotation Interval (days)
            </UILabel>
            <UINumberField v-model="form.defaultRotationIntervalDays" :min="1" :max="90">
              <UINumberFieldContent>
                <UINumberFieldDecrement />
                <UINumberFieldInput id="settings-interval" />
                <UINumberFieldIncrement />
              </UINumberFieldContent>
            </UINumberField>
            <p class="text-sm text-muted-foreground">
              Days between automatic rotations for each team
            </p>
          </div>

          <div class="space-y-2">
            <UILabel for="settings-day">
              Rotation Day
            </UILabel>
            <UISelect v-model="form.defaultRotationDay">
              <UISelectTrigger id="settings-day">
                <UISelectValue placeholder="Select day" />
              </UISelectTrigger>
              <UISelectContent>
                <UISelectItem v-for="day in DAYS_OF_WEEK" :key="day.value" :value="day.value">
                  {{ day.label }}
                </UISelectItem>
              </UISelectContent>
            </UISelect>
          </div>

          <div class="space-y-2">
            <UILabel>Timezone</UILabel>
            <div class="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <Globe class="size-4 text-muted-foreground" />
              <span>{{ form.defaultRotationTimezone }}</span>
            </div>
            <p class="text-sm text-muted-foreground">
              <Clock class="mr-0.5 inline size-3" />
              Your browser timezone: {{ browserTimezone }}
            </p>
          </div>

          <UIButton type="submit" :disabled="submitting">
            <Save class="size-4" />
            {{ submitting ? "Saving..." : "Save Changes" }}
          </UIButton>
        </form>
      </div>

      <!-- Webhooks -->
      <div class="rounded-lg border bg-card p-5 shadow-sm">
        <h3 class="text-lg font-semibold">
          Webhooks
        </h3>
        <p class="mt-0.5 text-sm text-muted-foreground">
          Send rotation notifications to external services. Each webhook receives a signed POST
          request when a rotation is created.
        </p>

        <div class="mt-5 space-y-4">
          <ErrorBanner v-if="webhookError" :message="webhookError" />

          <div
            v-if="revealedSecret"
            class="rounded-md border border-green-500/30 bg-green-500/5 px-4 py-3"
          >
            <p class="text-sm font-medium text-green-700 dark:text-green-400">
              Webhook created. Copy the signing secret now — it won't be shown again.
            </p>
            <div class="mt-2 flex items-center gap-2">
              <code class="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">
                {{ revealedSecret }}
              </code>
              <UIButton type="button" size="sm" variant="outline" class="shrink-0" @click="copySecret">
                <Check v-if="copiedSecret" class="size-4" />
                <Copy v-else class="size-4" />
                {{ copiedSecret ? "Copied" : "Copy" }}
              </UIButton>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">
              Verify payloads by computing HMAC-SHA256 of the request body using this secret and
              comparing it to the <code class="font-mono">X-Webhook-Signature</code> header.
            </p>
          </div>

          <form class="space-y-3" @submit.prevent="createNewWebhook">
            <div class="space-y-2">
              <UILabel for="webhook-name">
                Name
              </UILabel>
              <UIInput
                id="webhook-name"
                v-model="webhookForm.name"
                type="text"
                placeholder="Slack Rotation Bot"
                required
              />
            </div>
            <div class="space-y-2">
              <UILabel for="webhook-url">
                URL
              </UILabel>
              <UIInput
                id="webhook-url"
                v-model="webhookForm.url"
                type="url"
                placeholder="https://your-service.com/webhook"
                required
              />
            </div>
            <UIButton
              type="submit"
              :disabled="creatingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()"
            >
              <Plus class="size-4" />
              {{ creatingWebhook ? "Creating..." : "Add Webhook" }}
            </UIButton>
          </form>
        </div>
      </div>

      <!-- Existing webhooks table (outside card for full width) -->
      <div v-if="webhooksList?.length" class="overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                Name
              </th>
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                URL
              </th>
              <th class="px-4 py-2.5 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th class="px-4 py-2.5 text-right text-sm font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="webhook in webhooksList"
              :key="webhook.id"
              class="border-b last:border-b-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">
                <div class="flex items-center gap-2">
                  <Webhook class="size-3.5 text-muted-foreground" />
                  {{ webhook.name }}
                </div>
              </td>
              <td class="max-w-xs truncate px-4 py-3 text-muted-foreground">
                <code class="text-xs">{{ webhook.url }}</code>
              </td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  :aria-label="webhook.active ? 'Pause webhook' : 'Activate webhook'"
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                  :class="
                    webhook.active
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  "
                  @click="toggleWebhookActive(webhook.id, !webhook.active)"
                >
                  {{ webhook.active ? "Active" : "Paused" }}
                </button>
              </td>
              <td class="px-4 py-3 text-right">
                <UIButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  @click="deleteExistingWebhook(webhook.id, webhook.name)"
                >
                  <Trash2 class="size-3.5" />
                  Delete
                </UIButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
