import { tarifasService } from '../tarifas';
import { ComparadorService } from './comparador.service';
import { SinConsultaVehicular, type VehicleLookup } from './vehicle-lookup';

// Punto de composición: el comparador usa las tarifas vigentes del panel (#44).
export const comparadorService = new ComparadorService(tarifasService);

// Consulta por placa (#50): sin vía oficial disponible, los datos van a mano.
// Para integrar un proveedor permitido, se cambia solo esta línea.
export const vehicleLookup: VehicleLookup = new SinConsultaVehicular();
