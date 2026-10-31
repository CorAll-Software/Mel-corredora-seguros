CREATE TABLE `solicitudes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`origen` text NOT NULL,
	`ramo` text,
	`nombre` text NOT NULL,
	`telefono` text,
	`correo` text,
	`datos` text DEFAULT '[]' NOT NULL,
	`aseguradora` text,
	`prima` text,
	`estado` text DEFAULT 'nueva' NOT NULL,
	`notas` text,
	`idioma` text DEFAULT 'es' NOT NULL,
	`ip` text,
	`estado_actualizado_en` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `solicitudes_estado_idx` ON `solicitudes` (`estado`,`created_at`);--> statement-breakpoint
CREATE TABLE `solicitudes_historial` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`solicitud_id` integer NOT NULL,
	`estado_anterior` text NOT NULL,
	`estado_nuevo` text NOT NULL,
	`admin_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
