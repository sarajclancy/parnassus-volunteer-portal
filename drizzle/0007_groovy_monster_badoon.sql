CREATE TABLE `policy_acknowledgements` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`family_id` text NOT NULL,
	`signer_name` text NOT NULL,
	`acknowledged_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `volunteer_policies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `policy_acknowledgements_policy_family_unique` ON `policy_acknowledgements` (`policy_id`,`family_id`);--> statement-breakpoint
CREATE INDEX `policy_acknowledgements_family_id_idx` ON `policy_acknowledgements` (`family_id`);--> statement-breakpoint
CREATE TABLE `volunteer_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`attachment_name` text DEFAULT '' NOT NULL,
	`attachment_data_url` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `volunteer_policies_active_idx` ON `volunteer_policies` (`is_active`);
