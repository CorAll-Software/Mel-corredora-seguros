CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `consentimientos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`origen` text NOT NULL,
	`referencia_id` integer,
	`tipo` text NOT NULL,
	`texto_aceptado` text NOT NULL,
	`ip` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
