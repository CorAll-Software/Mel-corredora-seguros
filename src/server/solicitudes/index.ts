import { ORIGEN_LABELS, resumenSolicitud } from '../../core/solicitudes/solicitud';
import { getDb } from '../db/client';
import { notifyMelanie } from '../mail';
import { DrizzleSolicitudesRepository } from './drizzle-solicitudes.repository';
import { SolicitudesService } from './solicitudes.service';

// Punto de composición del módulo de solicitudes: base de datos con Drizzle y
// aviso por correo con notifyMelanie (#39).
export const solicitudesService = new SolicitudesService(new DrizzleSolicitudesRepository(getDb), {
  nuevaSolicitud: (s) =>
    notifyMelanie('solicitud', {
      id: s.id,
      origen: ORIGEN_LABELS[s.origen],
      ramo: s.ramo,
      nombre: s.nombre,
      telefono: s.telefono,
      correo: s.correo,
      resumen: resumenSolicitud(s) || null,
    }),
});

export type { FiltroBandeja } from './solicitudes.service';
