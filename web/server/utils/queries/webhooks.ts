import { webhooks } from '../../db/schema'
import { generateWebhookSecret, signWebhookPayload } from '../webhook'

export async function queryWebhooks() {
  return db.select().from(webhooks).orderBy(desc(webhooks.createdAt))
}

export async function createWebhook(data: { name: string, url: string }) {
  const secret = generateWebhookSecret()
  const [webhook] = await db
    .insert(webhooks)
    .values({ name: data.name, url: data.url, secret })
    .returning()
  return { ...webhook, secret }
}

export async function deleteWebhook(id: string) {
  await db.delete(webhooks).where(eq(webhooks.id, id))
}

export async function updateWebhookActive(id: string, active: boolean) {
  const [updated] = await db
    .update(webhooks)
    .set({ active })
    .where(eq(webhooks.id, id))
    .returning()
  return updated ?? null
}

export async function fireWebhooks(event: string, payload: Record<string, unknown>) {
  const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.active, true))

  const matching = activeWebhooks.filter(webhook => webhook.events.split(',').includes(event))

  if (matching.length === 0)
    return

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload })

  const deliveries = matching.map(async (webhook) => {
    try {
      const signature = await signWebhookPayload(body, webhook.secret)
      await $fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
        timeout: 10000,
      })
      // eslint-disable-next-line no-console
      console.log(`[webhook] Delivered ${event} to ${webhook.name}`)
    }
    catch (deliveryError) {
      console.error(`[webhook] Failed to deliver ${event} to ${webhook.name}:`, deliveryError)
    }
  })

  await Promise.allSettled(deliveries)
}
