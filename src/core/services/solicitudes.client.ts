import type { Dato, Origen } from '../solicitudes/solicitud';

// Envío de solicitudes desde los formularios de la página (issue #47).
//
// Se llama en el mismo clic que abre WhatsApp, justo antes de abrirlo: si el
// formulario esperara la respuesta, el navegador bloquearía la ventana nueva.
// `keepalive` deja que la petición termine aunque la persona se vaya a WhatsApp,
// y nada de esto lanza errores: si la base de datos falla, WhatsApp igual se abre.

export interface SolicitudPayload {
  origen: Origen;
  ramo?: string | null;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  datos?: Dato[];
  aseguradora?: string | null;
  prima?: string | null;
  idioma: string;
  // La persona marcó la casilla de tratamiento de datos (Ley 29733).
  acepta: true;
}

export function registrarSolicitud(payload: SolicitudPayload): void {
  try {
    void fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Sin red o navegador antiguo: el flujo por WhatsApp sigue igual.
  }
}
