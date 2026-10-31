import {
  ESTADOS,
  SOLICITUD_LIMITES,
  coincideBusqueda,
  solicitudesToCsv,
  validarSolicitud,
  type CambioEstado,
  type EstadoSolicitud,
  type Solicitud,
  type SolicitudErrores,
} from '../../core/solicitudes/solicitud';
import type { SolicitudesRepository, SolicitudMeta } from './solicitudes.repository';

// Casos de uso de las solicitudes (issue #47): registrar lo que llega de la
// página, avisar a Melanie y administrar la bandeja del panel. Depende de dos
// puertos: la persistencia y el aviso (en producción, notifyMelanie).

export interface AvisoSolicitud {
  nuevaSolicitud(solicitud: Solicitud): Promise<unknown>;
}

export interface FiltroBandeja {
  estado?: EstadoSolicitud;
  busqueda?: string;
}

export type ResultadoRegistro =
  { ok: true; solicitud: Solicitud } | { ok: false; errores: SolicitudErrores };

export class SolicitudesService {
  constructor(
    private readonly repo: SolicitudesRepository,
    private readonly aviso: AvisoSolicitud,
  ) {}

  async registrar(raw: unknown, meta: SolicitudMeta): Promise<ResultadoRegistro> {
    const validada = validarSolicitud(raw);
    if (!validada.ok) {
      return validada;
    }
    const solicitud = await this.repo.crear(validada.data, meta);
    // El aviso nunca rompe el guardado: la solicitud ya está en la bandeja.
    try {
      await this.aviso.nuevaSolicitud(solicitud);
    } catch (error) {
      console.error('[solicitudes] no se pudo avisar a Melanie:', error);
    }
    return { ok: true, solicitud };
  }

  obtener(id: number): Promise<Solicitud | undefined> {
    return this.repo.obtener(id);
  }

  async listar(filtro: FiltroBandeja = {}): Promise<Solicitud[]> {
    const lista = await this.repo.listar({ estado: filtro.estado });
    return filtro.busqueda ? lista.filter((s) => coincideBusqueda(s, filtro.busqueda!)) : lista;
  }

  async contarPorEstado(): Promise<Record<EstadoSolicitud, number>> {
    const totales = await this.repo.contarPorEstado();
    return Object.fromEntries(ESTADOS.map((estado) => [estado, totales[estado] ?? 0])) as Record<
      EstadoSolicitud,
      number
    >;
  }

  // false si la solicitud no existe o ya estaba en ese estado.
  async cambiarEstado(
    id: number,
    estado: EstadoSolicitud,
    adminId: number | null,
  ): Promise<boolean> {
    const actual = await this.repo.obtener(id);
    if (!actual || actual.estado === estado) {
      return false;
    }
    return this.repo.cambiarEstado(id, actual.estado, estado, adminId);
  }

  async guardarNotas(id: number, notas: string): Promise<'ok' | 'too_long' | 'not_found'> {
    const limpias = notas.trim();
    if (limpias.length > SOLICITUD_LIMITES.notas) {
      return 'too_long';
    }
    return (await this.repo.guardarNotas(id, limpias || null)) ? 'ok' : 'not_found';
  }

  historial(ids: number[]): Promise<CambioEstado[]> {
    return this.repo.historial(ids);
  }

  async exportarCsv(filtro: FiltroBandeja = {}): Promise<string> {
    return solicitudesToCsv(await this.listar(filtro));
  }
}
