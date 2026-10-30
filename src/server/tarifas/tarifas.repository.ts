import type { RamoId } from '../../core/comparador/ramos';
import type { Tarifa, TarifaInput } from '../../core/comparador/tarifa';

// Puerto de persistencia de tarifas. Los casos de uso (tarifas.service.ts)
// dependen de esta interfaz, no de Drizzle: cambiar de base o probar con un
// repositorio en memoria no toca la lógica.

export interface TarifaGuardada {
  // undefined = tarifa nueva
  id?: number;
  datos: TarifaInput;
}

export interface TarifasRepository {
  listar(filtro?: { ramo?: RamoId }): Promise<Tarifa[]>;
  obtener(id: number): Promise<Tarifa | undefined>;
  existen(ids: number[]): Promise<Set<number>>;
  crear(datos: TarifaInput, adminId: number | null): Promise<Tarifa>;
  actualizar(id: number, datos: TarifaInput, adminId: number | null): Promise<Tarifa | undefined>;
  cambiarActiva(id: number, activa: boolean, adminId: number | null): Promise<boolean>;
  // Crea o actualiza varias en una sola transacción: o entran todas o ninguna.
  guardarVarias(items: TarifaGuardada[], adminId: number | null): Promise<{ creadas: number; actualizadas: number }>;
  contar(): Promise<number>;
}
