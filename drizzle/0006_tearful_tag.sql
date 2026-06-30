CREATE TABLE `waitlist_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`position_id` text NOT NULL,
	`family_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`requested_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`resolved_at` text,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `waitlist_entries_position_id_idx` ON `waitlist_entries` (`position_id`);--> statement-breakpoint
CREATE INDEX `waitlist_entries_family_id_idx` ON `waitlist_entries` (`family_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `student_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `student_grade` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `teacher_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `volunteer_interests_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `admin_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `instructions` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `parking_info` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `cancellation_deadline_hours` integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `reminder_days_json` text DEFAULT '[7,3,1]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `resource_links_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `private_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `family_members` ADD `clearance_status` text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `requirements_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `clearance_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `adult_only` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `positions` ADD `training_required` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `signups` ADD `checked_in_at` text;--> statement-breakpoint
ALTER TABLE `signups` ADD `checked_out_at` text;--> statement-breakpoint
ALTER TABLE `signups` ADD `no_show_at` text;--> statement-breakpoint
ALTER TABLE `signups` ADD `swap_requested_at` text;--> statement-breakpoint
ALTER TABLE `signups` ADD `swap_note` text DEFAULT '' NOT NULL;
