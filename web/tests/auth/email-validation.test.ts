import { describe, it, expect } from "vitest";
import { isAllowedEmail, ALLOWED_DOMAINS } from "~/server/utils/auth-constants";

describe("email domain validation", () => {
  describe("valid email patterns", () => {
    const validEmails = [
      "joao.goncalves@nordhealth.com",
      "first.last@nordhealth.com",
      "a@nordhealth.com",
      "user+tag@nordhealth.com",
      "dev@provet.com",
      "firstname.lastname@provet.com",
    ];

    it.each(validEmails)("accepts %s", (email) => {
      expect(isAllowedEmail(email)).toBe(true);
    });
  });

  describe("invalid email patterns", () => {
    const invalidEmails = [
      "user@gmail.com",
      "user@hotmail.com",
      "user@yahoo.com",
      "user@company.com",
      "user@nordhealth.co",
      "user@provet.cloud",
      "user@sub.nordhealth.com",
      "user@sub.provet.com",
      "@nordhealth.com",
      "",
      "nordhealth.com",
      "user@",
      "user",
    ];

    it.each(invalidEmails)("rejects '%s'", (email) => {
      expect(isAllowedEmail(email)).toBe(false);
    });
  });

  describe("domain composition", () => {
    it("composes valid email from username + domain", () => {
      for (const domain of ALLOWED_DOMAINS) {
        const email = `testuser@${domain}`;
        expect(isAllowedEmail(email)).toBe(true);
      }
    });

    it("rejects composed email with invalid domain", () => {
      const email = "testuser@invalid.com";
      expect(isAllowedEmail(email)).toBe(false);
    });
  });
});
