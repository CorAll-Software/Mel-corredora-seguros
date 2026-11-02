import type { DatosVehiculo } from '../../core/comparador/vehiculo';

// Puerto de la consulta vehicular por placa (issue #50). Una implementación
// real solo se agrega con un proveedor oficial o con convenio demostrable; nunca
// scraping ni captchas de servicios públicos.
export interface VehicleLookup {
  // null si no hay datos: el comparador sigue pidiendo marca y año a mano.
  buscar(placa: string): Promise<DatosVehiculo | null>;
}

// Implementación actual: sin consulta, siempre a mano.
export class SinConsultaVehicular implements VehicleLookup {
  async buscar(_placa: string): Promise<DatosVehiculo | null> {
    return null;
  }
}
