ALTER TABLE `events` ADD `end_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `events` SET `end_date` = `date` WHERE `end_date` = '';
