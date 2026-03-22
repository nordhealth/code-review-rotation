import { developers, users } from '../../db/schema'

export async function queryAllUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailConfirmed: users.emailConfirmed,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.role), asc(users.createdAt))
}

export async function updateUserRole(userId: string, role: 'admin' | 'developer') {
  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
  return updated
}

export async function queryUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get()
}

export async function queryUserByConfirmationToken(token: string) {
  return db.select().from(users).where(eq(users.confirmationToken, token)).get()
}

export async function queryUserByResetToken(token: string) {
  return db.select().from(users).where(eq(users.resetPasswordToken, token)).get()
}

export async function createUser(data: {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  confirmationToken: string
  confirmationTokenExpiresAt: Date
}) {
  const [user] = await db.insert(users).values(data).returning()
  return user
}

export async function confirmUser(userId: string) {
  await db
    .update(users)
    .set({
      emailConfirmed: true,
      confirmationToken: null,
      confirmationTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

export async function setResetToken(userId: string, token: string, expiresAt: Date) {
  await db
    .update(users)
    .set({
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await db
    .update(users)
    .set({
      passwordHash,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

export async function updateUserDeveloperId(userId: string, developerId: string | null) {
  const [updated] = await db
    .update(users)
    .set({ developerId, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      developerId: users.developerId,
    })
  return updated
}

export async function queryAllUsersWithDeveloper() {
  return db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      emailConfirmed: users.emailConfirmed,
      createdAt: users.createdAt,
      developerId: users.developerId,
      developerName: developers.firstName,
      developerLastName: developers.lastName,
    })
    .from(users)
    .leftJoin(developers, eq(users.developerId, developers.id))
    .orderBy(asc(users.role), asc(users.createdAt))
}
