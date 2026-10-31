import type {
  CambioEstado,
  EstadoSolicitud,
  Solicitud,
  SolicitudInput,
} from '../../core/solicitudes/solicitud';

// Puerto de persistencia de las solicitudes. El caso de uso
// (solicitudes.service.ts) depende de esta interfaz, no de Drizzle.

export interface SolicitudMeta {
  idioma: string;
  ip: string | null;
}

export interface SolicitudesRepository {
  crear(datos: SolicitudInput, meta: SolicitudMeta): Promise<Solicitud>;
  obtener(id: number): Promise<Solicitud | undefined>;
  // Más recientes primero.
  listar(filtro?: { estado?: EstadoSolicitud }): Promise<Solicitud[]>;
  contarPorEstado(): Promise<Partial<Record<EstadoSolicitud, number>>>;
  // Cambia el estado solo si sigue siendo `de` y registra el cambio en el historial.
  cambiarEstado(
    id: number,
    de: EstadoSolicitud,
    a: EstadoSolicitud,
    adminId: number | null,
  ): Promise<boolean>;
  guardarNotas(id: number, notas: string | null): Promise<boolean>;
  historial(ids: number[]): Promise<CambioEstado[]>;
}
