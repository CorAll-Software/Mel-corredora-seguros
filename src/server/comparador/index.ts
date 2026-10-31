import { tarifasService } from '../tarifas';
import { ComparadorService } from './comparador.service';

// Punto de composición: el comparador usa las tarifas vigentes del panel (#44).
export const comparadorService = new ComparadorService(tarifasService);
