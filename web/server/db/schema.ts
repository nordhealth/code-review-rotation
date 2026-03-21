import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { ROTATION_DAYS } from "../utils/rotation/schedule";

export { ROTATION_DAYS } from "../utils/rotation/schedule";
export type { RotationDay } from "../utils/rotation/schedule";

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  defaultRotationIntervalDays: integer("default_rotation_interval_days").notNull().default(14),
  defaultRotationTime: text("default_rotation_time").notNull().default("04:00"),
  defaultRotationDay: text("default_rotation_day", { enum: ROTATION_DAYS })
    .notNull()
    .default("wednesday"),
  defaultRotationTimezone: text("default_rotation_timezone").notNull().default("Europe/Helsinki"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "developer"] })
    .notNull()
    .default("developer"),
  emailConfirmed: integer("email_confirmed", { mode: "boolean" }).notNull().default(false),
  confirmationToken: text("confirmation_token"),
  confirmationTokenExpiresAt: integer("confirmation_token_expires_at", { mode: "timestamp" }),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordTokenExpiresAt: integer("reset_password_token_expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const developers = sqliteTable("developers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  slug: text("slug").notNull().unique(),
  slackId: text("slack_id"),
  gitlabId: text("gitlab_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const teams = sqliteTable("teams", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  defaultReviewerCount: integer("default_reviewer_count").notNull().default(2),
  rotationIntervalDays: integer("rotation_interval_days"),
  rotationTime: text("rotation_time"),
  rotationDay: text("rotation_day", { enum: ROTATION_DAYS }),
  rotationTimezone: text("rotation_timezone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const teamDevelopers = sqliteTable(
  "team_developers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    developerId: text("developer_id")
      .notNull()
      .references(() => developers.id, { onDelete: "cascade" }),
    reviewerCount: integer("reviewer_count"),
    isExperienced: integer("is_experienced", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("team_developer_unique").on(table.teamId, table.developerId)],
);

export const preferableReviewers = sqliteTable("preferable_reviewers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  teamDeveloperId: text("team_developer_id")
    .notNull()
    .references(() => teamDevelopers.id, { onDelete: "cascade" }),
  preferredDeveloperId: text("preferred_developer_id")
    .notNull()
    .references(() => developers.id, { onDelete: "cascade" }),
});

export const squads = sqliteTable("squads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  reviewerCount: integer("reviewer_count").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const squadMembers = sqliteTable(
  "squad_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    squadId: text("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    developerId: text("developer_id")
      .notNull()
      .references(() => developers.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("squad_member_unique").on(table.squadId, table.developerId)],
);

export const rotations = sqliteTable("rotations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
  mode: text("mode", { enum: ["devs", "teams"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rotationAssignments = sqliteTable("rotation_assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  rotationId: text("rotation_id")
    .notNull()
    .references(() => rotations.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["developer", "squad"] }).notNull(),
  targetId: text("target_id").notNull(),
  targetName: text("target_name"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const webhooks = sqliteTable("webhooks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").notNull().default("rotation.created"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rotationAssignmentReviewers = sqliteTable("rotation_assignment_reviewers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  assignmentId: text("assignment_id")
    .notNull()
    .references(() => rotationAssignments.id, { onDelete: "cascade" }),
  reviewerDeveloperId: text("reviewer_developer_id").references(() => developers.id, {
    onDelete: "set null",
  }),
  reviewerName: text("reviewer_name"),
});
