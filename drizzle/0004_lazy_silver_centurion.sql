ALTER TABLE `event_custom_fields` ADD `field_type` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_custom_fields` ADD `options_json` text DEFAULT '[]' NOT NULL;