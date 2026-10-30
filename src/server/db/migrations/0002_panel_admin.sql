CREATE TABLE `admin_usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`nombre` text NOT NULL,
	`password_hash` text NOT NULL,
	`ultimo_ingreso` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_usuarios_email_unique` ON `admin_usuarios` (`email`);--> statement-breakpoint
CREATE TABLE `intentos_login` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ambito` text NOT NULL,
	`clave` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sesiones` (
	`id` text PRIMARY KEY NOT NULL,
	`ambito` text NOT NULL,
	`usuario_id` integer NOT NULL,
	`expira_en` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
