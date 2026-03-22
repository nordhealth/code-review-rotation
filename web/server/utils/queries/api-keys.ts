import { apiKeys, users } from '../../db/schema'
import { extractKeyPrefix, generateApiKey, hashApiKey } from '../api-key'

export async function queryApiKeysByUserId(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt))
}

export async function createApiKey(userId: string, name: string) {
  const plainKey = generateApiKey()
  const keyHash = await hashApiKey(plainKey)
  const keyPrefix = extractKeyPrefix(plainKey)

  const [inserted] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash, keyPrefix })
    .returning()

  return { ...inserted, plainKey }
}

export async function deleteApiKey(id: string, _userId: string) {
  await db.delete(apiKeys).where(eq(apiKeys.id, id))
}

export async function resolveApiKeyUser(key: string) {
  const keyHash = await hashApiKey(key)
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash))

  return row ?? null
}
