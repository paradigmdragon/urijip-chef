CREATE TABLE `chef_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`operation_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`lot_id` text NOT NULL,
	`base_revision` integer NOT NULL,
	`before_json` text,
	`after_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chef_history_owner` ON `chef_events` (`owner`,`seq`);--> statement-breakpoint
CREATE TABLE `chef_lots` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
