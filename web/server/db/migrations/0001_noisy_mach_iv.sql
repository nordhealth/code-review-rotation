CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`default_rotation_interval_days` integer DEFAULT 14 NOT NULL,
	`default_rotation_day` text DEFAULT 'wednesday' NOT NULL,
	`default_rotation_timezone` text DEFAULT 'Europe/Helsinki' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text DEFAULT 'rotation.created' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `teams` ADD `rotation_interval_days` integer;--> statement-breakpoint
ALTER TABLE `teams` ADD `rotation_day` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `rotation_timezone` text;