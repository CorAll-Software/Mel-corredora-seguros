CREATE TABLE `documentos_portal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`nombre` text NOT NULL,
	`vigencia_desde` text,
	`vigencia_hasta` text NOT NULL,
	`archivo_key` text NOT NULL,
	`tamano` integer NOT NULL,
	`subido_por` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documentos_portal_cliente_idx` ON `documentos_portal` (`cliente_id`,`vigencia_hasta`);