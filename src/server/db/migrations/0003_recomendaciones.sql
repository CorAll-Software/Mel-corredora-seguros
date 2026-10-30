CREATE TABLE `limites_envio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ambito` text NOT NULL,
	`clave` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recomendaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`empresa_cargo` text,
	`seguro` text NOT NULL,
	`estrellas` integer NOT NULL,
	`texto` text NOT NULL,
	`foto_key` text,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`idioma` text DEFAULT 'es' NOT NULL,
	`ip` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
