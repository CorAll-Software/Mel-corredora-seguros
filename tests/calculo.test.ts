import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compararTarifas, TIPO_CAMBIO_REFERENCIAL } from '../src/core/comparador/calculo';
import type { DatosConsulta } from '../src/core/comparador/consulta';
import { RAMO_IDS } from '../src/core/comparador/ramos';
import type { Tarifa } from '../src/core/comparador/tarifa';
import { TARIFAS_EJEMPLO } from '../scripts/seed/tarifas-ejemplo';

// Pruebas del motor de cálculo del comparador (issue #46).

let nextId = 1;
const tarifa = (datos: Partial<Tarifa> & Pick<Tarifa, 'ramo' | 'aseguradora' | 'formula' | 'valor'>): Tarifa => ({
  id: nextId++,
  plan: 'Plan',
  uso: null,
  anioMin: null,
  anioMax: null,
  producto: null,
  edadMin: null,
  edadMax: null,
  actividad: null,
  trabajadoresMin: null,
  trabajadoresMax: null,
  primaMinima: null,
  moneda: 'PEN',
  periodo: 'anual',
  coberturas: ['A', 'B', 'C', 'D'],
  vigenciaDesde: '2026-01-01',
  vigenciaHasta: '2026-12-31',
  activa: true,
  esEjemplo: false,
  nota: null,
  actualizadoEn: new Date(0),
  ...datos,
});

const seed: Tarifa[] = TARIFAS_EJEMPLO.map((t, i) => ({ ...t, id: i + 1, vigenciaDesde: '2026-01-01', vigenciaHasta: '2026-12-31', actualizadoEn: new Date(0) }));

const CASOS: Record<(typeof RAMO_IDS)[number], DatosConsulta> = {
  soat: { ramo: 'soat', uso: 'particular' },
  vehicular: { ramo: 'vehicular', uso: 'particular', marca: 'Toyota', anio: 2020, valor: 15000, moneda: 'USD' },
  salud: { ramo: 'salud', producto: 'salud', edades: [35, 45] },
  'sctr-vida-ley': { ramo: 'sctr-vida-ley', producto: 'sctr', actividad: 'alto', trabajadores: 12, planilla: 15000 },
};

describe('compararTarifas', () => {
  it('con las tarifas del seed cada ramo muestra al menos 2 aseguradoras', () => {
    for (const ramo of RAMO_IDS) {
      assert.ok(compararTarifas(seed, CASOS[ramo]).length >= 2, ramo);
    }
  });

  it('el mismo caso devuelve siempre el mismo resultado', () => {
    for (const ramo of RAMO_IDS) {
      const a = compararTarifas(seed, CASOS[ramo]);
      const b = compararTarifas([...seed].reverse(), CASOS[ramo]);
      assert.deepEqual(a, b, ramo);
    }
  });

  it('ordena por precio y aplica fórmula y prima mínima', () => {
    const r = compararTarifas(seed, CASOS.vehicular);
    const primas = r.map((x) => x.prima);
    assert.deepEqual(primas, [...primas].sort((a, b) => a - b));
    // Quálitas 2.7 % de US$ 15 000 = 405 (sobre su mínima de 300).
    assert.deepEqual(r[0], { aseguradora: 'qualitas', plan: 'Plan referencial (ejemplo)', prima: 405, moneda: 'USD', periodo: 'anual', coberturas: r[0].coberturas, esEjemplo: true });
    const minima = compararTarifas(seed, { ...CASOS.vehicular, valor: 5000 });
    assert.equal(minima.find((x) => x.aseguradora === 'rimac')?.prima, 400);
  });

  it('no muestra aseguradoras sin tarifa que aplique (no se inventa)', () => {
    assert.deepEqual(compararTarifas(seed, { ramo: 'soat', uso: 'carga' }), []);
    assert.deepEqual(compararTarifas(seed, { ...CASOS.vehicular, anio: 2005 }), []);
    // La Positiva solo cotiza EPS.
    assert.ok(!compararTarifas(seed, CASOS.salud).some((x) => x.aseguradora === 'positiva'));
    // Una persona fuera de todo rango de edad deja fuera al plan.
    assert.deepEqual(compararTarifas(seed, { ...CASOS.salud, edades: [35, 70] }), []);
  });

  it('suma por persona según su banda de edad', () => {
    const r = compararTarifas(seed, CASOS.salud);
    // Mapfre: 195 (35 años) + 350 (45 años).
    assert.equal(r.find((x) => x.aseguradora === 'mapfre')?.prima, 545);
    assert.equal(r[0].periodo, 'mensual');
  });

  it('multiplica por trabajadores y deja una tarjeta por aseguradora con su plan más barato', () => {
    const tarifas = [
      tarifa({ ramo: 'sctr-vida-ley', aseguradora: 'rimac', producto: 'sctr', formula: 'por-unidad', valor: 20, plan: 'Caro' }),
      tarifa({ ramo: 'sctr-vida-ley', aseguradora: 'rimac', producto: 'sctr', formula: 'por-unidad', valor: 10, plan: 'Barato' }),
      tarifa({ ramo: 'sctr-vida-ley', aseguradora: 'mapfre', producto: 'sctr', formula: 'por-unidad', valor: 15, trabajadoresMax: 5 }),
    ];
    const r = compararTarifas(tarifas, CASOS['sctr-vida-ley']);
    assert.equal(r.length, 1);
    assert.equal(r[0].plan, 'Barato');
    assert.equal(r[0].prima, 120);
    assert.equal(r[0].coberturas.length, 3);
  });

  it('convierte la prima mínima con el tipo de cambio referencial', () => {
    const tarifas = [tarifa({ ramo: 'vehicular', aseguradora: 'mapfre', formula: 'porcentaje', valor: 1, primaMinima: 100, moneda: 'USD' })];
    const r = compararTarifas(tarifas, { ...CASOS.vehicular, valor: 10000, moneda: 'PEN' });
    assert.equal(r[0].moneda, 'PEN');
    assert.equal(r[0].prima, 100 * TIPO_CAMBIO_REFERENCIAL);
  });
});
