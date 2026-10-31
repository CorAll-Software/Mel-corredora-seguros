CREATE TABLE `clientes_portal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ruc` text NOT NULL,
	`razon_social` text NOT NULL,
	`contacto` text NOT NULL,
	`correo` text,
	`password_hash` text NOT NULL,
	`debe_cambiar_clave` integer DEFAULT true NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`ultimo_ingreso` integer,
	`creado_por` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_portal_ruc_unique` ON `clientes_portal` (`ruc`);--> statement-breakpoint
CREATE TABLE `portal_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expira_en` integer NOT NULL,
	`usado_en` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_tokens_token_hash_unique` ON `portal_tokens` (`token_hash`);