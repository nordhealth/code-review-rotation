CREATE TABLE `developers` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`slug` text NOT NULL,
	`slack_id` text,
	`gitlab_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `developers_slug_unique` ON `developers` (`slug`);--> statement-breakpoint
CREATE TABLE `preferable_reviewers` (
	`id` text PRIMARY KEY NOT NULL,
	`team_developer_id` text NOT NULL,
	`preferred_developer_id` text NOT NULL,
	FOREIGN KEY (`team_developer_id`) REFERENCES `team_developers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preferred_developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rotation_assignment_reviewers` (
	`id` text PRIMARY KEY NOT NULL,
	`assignment_id` text NOT NULL,
	`reviewer_developer_id` text,
	`reviewer_name` text,
	FOREIGN KEY (`assignment_id`) REFERENCES `rotation_assignments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rotation_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`rotation_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`rotation_id`) REFERENCES `rotations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rotations` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`date` integer NOT NULL,
	`is_manual` integer DEFAULT false NOT NULL,
	`mode` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `squad_members` (
	`id` text PRIMARY KEY NOT NULL,
	`squad_id` text NOT NULL,
	`developer_id` text NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squad_member_unique` ON `squad_members` (`squad_id`,`developer_id`);--> statement-breakpoint
CREATE TABLE `squads` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`reviewer_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `team_developers` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`developer_id` text NOT NULL,
	`reviewer_count` integer,
	`is_experienced` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_developer_unique` ON `team_developers` (`team_id`,`developer_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`default_reviewer_count` integer DEFAULT 2 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_name_unique` ON `teams` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `teams_slug_unique` ON `teams` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`avatar_url` text,
	`role` text DEFAULT 'developer' NOT NULL,
	`email_confirmed` integer DEFAULT false NOT NULL,
	`confirmation_token` text,
	`confirmation_token_expires_at` integer,
	`reset_password_token` text,
	`reset_password_token_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);