CREATE TABLE `recomendaciones_historial` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recomendacion_id` integer NOT NULL,
	`accion` text NOT NULL,
	`admin_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `recomendaciones` ADD `texto_editado` text;--> statement-breakpoint
ALTER TABLE `recomendaciones` ADD `revisado_por` integer;--> statement-breakpoint
ALTER TABLE `recomendaciones` ADD `revisado_en` integer;