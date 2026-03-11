import { z } from "zod";

const confirmSchema = z.object({
  token: z.string().min(1, "Confirmation token is required"),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, confirmSchema.parse);

  const user = await queryUserByConfirmationToken(body.token);
  if (!user) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired confirmation token",
    });
  }

  if (user.emailConfirmed) {
    return { message: "Email already confirmed" };
  }

  if (user.confirmationTokenExpiresAt && new Date() > user.confirmationTokenExpiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: "Confirmation token has expired. Please register again.",
    });
  }

  await confirmUser(user.id);

  return { message: "Email confirmed successfully. You can now sign in." };
});
