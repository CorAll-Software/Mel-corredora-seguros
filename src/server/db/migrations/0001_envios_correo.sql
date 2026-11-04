CREATE TABLE `envios_correo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo` text NOT NULL,
	`destinatario` text NOT NULL,
	`asunto` text NOT NULL,
	`proveedor` text NOT NULL,
	`estado` text NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
