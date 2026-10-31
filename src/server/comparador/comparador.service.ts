import { compararTarifas, type ResultadoAseguradora } from '../../core/comparador/calculo';
import { validarConsulta, type Borrador, type ConsultaErrores } from '../../core/comparador/consulta';
import type { RamoId } from '../../core/comparador/ramos';
import type { Tarifa } from '../../core/comparador/tarifa';

// Caso de uso "comparar" (issue #46): valida la consulta con las mismas reglas
// del asistente (#45) y calcula con las tarifas vigentes. Solo depende de este
// puerto; en producción lo cumple TarifasService.

export interface TarifasVigentes {
  listarVigentes(ramo: RamoId): Promise<Tarifa[]>;
}

export type ResultadoComparacion =
  | { ok: true; resultados: ResultadoAseguradora[] }
  | { ok: false; errores: ConsultaErrores };

export class ComparadorService {
  constructor(private readonly tarifas: TarifasVigentes) {}

  async comparar(ramo: RamoId, borrador: Borrador): Promise<ResultadoComparacion> {
    const validada = validarConsulta(ramo, borrador);
    if (!validada.ok) {
      return validada;
    }
    const vigentes = await this.tarifas.listarVigentes(ramo);
    return { ok: true, resultados: compararTarifas(vigentes, validada.consulta.datos) };
  }
}
