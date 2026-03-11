import { users } from "../../db/schema";

export async function queryUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export async function queryUserByConfirmationToken(token: string) {
  return db.select().from(users).where(eq(users.confirmationToken, token)).get();
}

export async function queryUserByResetToken(token: string) {
  return db.select().from(users).where(eq(users.resetPasswordToken, token)).get();
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  confirmationToken: string;
  confirmationTokenExpiresAt: Date;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
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
    .where(eq(users.id, userId));
}

export async function setResetToken(userId: string, token: string, expiresAt: Date) {
  await db
    .update(users)
    .set({
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
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
    .where(eq(users.id, userId));
}
