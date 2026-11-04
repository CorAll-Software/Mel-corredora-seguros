import type { RamoId } from '../../core/comparador/ramos';
import { estadoTarifa, hoyEnLima, validarTarifa, type Tarifa, type TarifaErrores, type TarifaEstado } from '../../core/comparador/tarifa';
import { csvToFilas, tarifasToCsv } from './tarifas-csv';
import type { TarifaGuardada, TarifasRepository } from './tarifas.repository';

// Casos de uso de las tarifas referenciales (issue #44). Orquestan dominio
// (validación y vigencia) y persistencia (puerto TarifasRepository). Las
// pantallas del panel y el comparador solo hablan con este servicio.

export type TarifaConEstado = Tarifa & { estado: TarifaEstado };
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: TarifaErrores };

export interface ErrorImportacion {
  linea: number;
  campo: string;
  mensaje: string;
}

export type ResultadoImportacion =
  | { ok: true; creadas: number; actualizadas: number }
  | { ok: false; error?: string; errores: ErrorImportacion[] };

export class TarifasService {
  constructor(
    private readonly repo: TarifasRepository,
    // Reloj inyectable (pruebas): devuelve la fecha de hoy AAAA-MM-DD.
    private readonly hoy: () => string = () => hoyEnLima(),
  ) {}

  private conEstado(tarifa: Tarifa, hoy = this.hoy()): TarifaConEstado {
    return { ...tarifa, estado: estadoTarifa(tarifa, hoy) };
  }

  async listar(filtro: { ramo?: RamoId } = {}): Promise<TarifaConEstado[]> {
    const hoy = this.hoy();
    return (await this.repo.listar(filtro)).map((tarifa) => this.conEstado(tarifa, hoy));
  }

  async obtener(id: number): Promise<TarifaConEstado | undefined> {
    const tarifa = await this.repo.obtener(id);
    return tarifa && this.conEstado(tarifa);
  }

  // Lo único que puede usar el comparador (#46): activas y dentro de su vigencia.
  async listarVigentes(ramo: RamoId): Promise<Tarifa[]> {
    return (await this.listar({ ramo })).filter((tarifa) => tarifa.estado === 'vigente');
  }

  async crear(raw: unknown, adminId: number | null): Promise<Resultado<Tarifa>> {
    const validada = validarTarifa(raw);
    if (!validada.ok) {
      return validada;
    }
    return { ok: true, valor: await this.repo.crear(validada.data, adminId) };
  }

  async actualizar(id: number, raw: unknown, adminId: number | null): Promise<Resultado<Tarifa>> {
    const validada = validarTarifa(raw);
    if (!validada.ok) {
      return validada;
    }
    const tarifa = await this.repo.actualizar(id, validada.data, adminId);
    return tarifa ? { ok: true, valor: tarifa } : { ok: false, errores: { _: 'La tarifa ya no existe.' } };
  }

  // Desactivar en lugar de borrar: la tarifa deja de cotizar pero queda el registro.
  cambiarActiva(id: number, activa: boolean, adminId: number | null): Promise<boolean> {
    return this.repo.cambiarActiva(id, activa, adminId);
  }

  async exportarCsv(): Promise<string> {
    return tarifasToCsv(await this.repo.listar());
  }

  // Importación atómica: si una sola fila tiene errores no se guarda ninguna.
  async importarCsv(texto: string, adminId: number | null): Promise<ResultadoImportacion> {
    const lectura = csvToFilas(texto);
    if (!lectura.ok) {
      return { ok: false, error: lectura.error, errores: [] };
    }
    if (lectura.filas.length === 0) {
      return { ok: false, error: 'El archivo no tiene tarifas.', errores: [] };
    }

    const idsEnArchivo = lectura.filas.map((fila) => fila.id).filter((id): id is number => id !== null);
    const existentes = await this.repo.existen(idsEnArchivo);
    const errores: ErrorImportacion[] = [];
    const items: TarifaGuardada[] = [];
    const vistos = new Set<number>();

    for (const fila of lectura.filas) {
      if (fila.id !== null && vistos.has(fila.id)) {
        errores.push({ linea: fila.linea, campo: 'id', mensaje: 'Este id está repetido en el archivo.' });
        continue;
      }
      if (fila.id !== null) {
        vistos.add(fila.id);
      }
      const validada = validarTarifa(fila.raw);
      if (!validada.ok) {
        for (const [campo, mensaje] of Object.entries(validada.errores)) {
          errores.push({ linea: fila.linea, campo, mensaje });
        }
        continue;
      }
      // Un id que no existe en la base (p. ej. de otra instalación) se crea como nueva.
      items.push({ id: fila.id !== null && existentes.has(fila.id) ? fila.id : undefined, datos: validada.data });
    }

    if (errores.length > 0) {
      return { ok: false, errores };
    }
    const resultado = await this.repo.guardarVarias(items, adminId);
    return { ok: true, ...resultado };
  }

  contar(): Promise<number> {
    return this.repo.contar();
  }
}
