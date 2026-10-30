import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RamoId } from '../src/core/comparador/ramos';
import { estadoTarifa, validarTarifa, type Tarifa, type TarifaInput } from '../src/core/comparador/tarifa';
import type { TarifaGuardada, TarifasRepository } from '../src/server/tarifas/tarifas.repository';
import { TarifasService } from '../src/server/tarifas/tarifas.service';

// Pruebas del módulo de tarifas (issue #44) con un repositorio en memoria: los
// casos de uso no dependen de la base de datos.

class MemoriaTarifasRepository implements TarifasRepository {
  private items = new Map<number, Tarifa>();
  private next = 1;

  async listar(filtro: { ramo?: RamoId } = {}) {
    return [...this.items.values()].filter((t) => !filtro.ramo || t.ramo === filtro.ramo);
  }
  async obtener(id: number) {
    return this.items.get(id);
  }
  async existen(ids: number[]) {
    return new Set(ids.filter((id) => this.items.has(id)));
  }
  async crear(datos: TarifaInput) {
    const tarifa = { ...datos, id: this.next++, actualizadoEn: new Date() };
    this.items.set(tarifa.id, tarifa);
    return tarifa;
  }
  async actualizar(id: number, datos: TarifaInput) {
    if (!this.items.has(id)) return undefined;
    const tarifa = { ...datos, id, actualizadoEn: new Date() };
    this.items.set(id, tarifa);
    return tarifa;
  }
  async cambiarActiva(id: number, activa: boolean) {
    const tarifa = this.items.get(id);
    if (!tarifa) return false;
    tarifa.activa = activa;
    return true;
  }
  async guardarVarias(items: TarifaGuardada[]) {
    let creadas = 0;
    let actualizadas = 0;
    for (const item of items) {
      if (item.id === undefined) {
        await this.crear(item.datos);
        creadas++;
      } else {
        await this.actualizar(item.id, item.datos);
        actualizadas++;
      }
    }
    return { creadas, actualizadas };
  }
  async contar() {
    return this.items.size;
  }
}

const HOY = '2026-10-30';

function base(over: Partial<TarifaInput> = {}): TarifaInput {
  return {
    ramo: 'soat',
    aseguradora: 'mapfre',
    plan: 'Plan, "con comillas"',
    uso: 'particular',
    anioMin: null,
    anioMax: null,
    producto: null,
    edadMin: null,
    edadMax: null,
    actividad: null,
    trabajadoresMin: null,
    trabajadoresMax: null,
    formula: 'fija',
    valor: 95.5,
    primaMinima: null,
    moneda: 'PEN',
    periodo: 'anual',
    coberturas: ['Muerte e invalidez', 'Gastos médicos'],
    vigenciaDesde: '2026-01-01',
    vigenciaHasta: '2026-12-31',
    activa: true,
    esEjemplo: true,
    nota: 'Nota con, coma\ny salto de línea',
    ...over,
  };
}

describe('reglas de la tarifa', () => {
  it('acepta una tarifa válida', () => {
    assert.equal(validarTarifa(base()).ok, true);
  });

  it('rechaza una aseguradora que Melanie no usa en el ramo', () => {
    const r = validarTarifa(base({ aseguradora: 'rimac' }));
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.errores.aseguradora);
  });

  it('exige vigencia coherente', () => {
    const r = validarTarifa(base({ vigenciaDesde: '2027-01-01', vigenciaHasta: '2026-01-01' }));
    assert.ok(!r.ok && r.errores.vigenciaHasta);
  });

  it('rechaza variables que el ramo no usa', () => {
    const r = validarTarifa(base({ edadMin: 18 }));
    assert.ok(!r.ok && r.errores.edadMin);
  });

  it('La Positiva solo cotiza EPS en salud', () => {
    const salud = { ramo: 'salud' as const, aseguradora: 'positiva', uso: null, formula: 'por-unidad' as const };
    assert.equal(validarTarifa(base({ ...salud, producto: 'salud' })).ok, false);
    assert.equal(validarTarifa(base({ ...salud, producto: 'eps' })).ok, true);
  });

  it('calcula el estado por vigencia y activación', () => {
    assert.equal(estadoTarifa(base(), HOY), 'vigente');
    assert.equal(estadoTarifa(base({ vigenciaHasta: '2026-10-29' }), HOY), 'vencida');
    assert.equal(estadoTarifa(base({ vigenciaDesde: '2026-11-01' }), HOY), 'futura');
    assert.equal(estadoTarifa(base({ activa: false }), HOY), 'inactiva');
  });
});

describe('TarifasService', () => {
  it('listarVigentes excluye vencidas e inactivas', async () => {
    const service = new TarifasService(new MemoriaTarifasRepository(), () => HOY);
    await service.crear(base(), 1);
    await service.crear(base({ vigenciaHasta: '2026-10-01' }), 1);
    await service.crear(base({ activa: false }), 1);
    assert.equal((await service.listarVigentes('soat')).length, 1);
  });

  it('el CSV exportado vuelve a importarse sin pérdida', async () => {
    const repo = new MemoriaTarifasRepository();
    const service = new TarifasService(repo, () => HOY);
    await service.crear(base(), 1);
    await service.crear(
      base({ ramo: 'sctr-vida-ley', aseguradora: 'protecta', uso: null, producto: 'sctr', actividad: 'alto', trabajadoresMin: 1, trabajadoresMax: 50, formula: 'porcentaje', valor: 1.234, primaMinima: 50, periodo: 'mensual', coberturas: [], nota: null, esEjemplo: false }),
      1,
    );
    const antes = await repo.listar();
    const csv = await service.exportarCsv();

    const resultado = await service.importarCsv(csv, 1);
    assert.deepEqual(resultado, { ok: true, creadas: 0, actualizadas: 2 });
    const despues = await repo.listar();
    const sinFecha = (lista: Tarifa[]) => lista.map(({ actualizadoEn: _, ...resto }) => resto);
    assert.deepEqual(sinFecha(despues), sinFecha(antes));
    assert.equal(await service.exportarCsv(), csv);
  });

  it('la importación es atómica: con un error no guarda nada', async () => {
    const repo = new MemoriaTarifasRepository();
    const service = new TarifasService(repo, () => HOY);
    await service.crear(base({ plan: 'Simple', nota: null }), 1);
    const csv = await service.exportarCsv();
    const lineas = csv.trim().split('\r\n');
    const nueva = lineas[1].replace(/^1,/, ',');
    const mala = nueva.replace(',mapfre,', ',rimac,');
    const resultado = await service.importarCsv([lineas[0], nueva, mala].join('\n'), 1);
    assert.equal(resultado.ok, false);
    assert.ok(!resultado.ok && resultado.errores.some((e) => e.linea === 3 && e.campo === 'aseguradora'));
    assert.equal(await repo.contar(), 1);
  });

  it('acepta CSV con punto y coma y decimales con coma (Excel)', async () => {
    const service = new TarifasService(new MemoriaTarifasRepository(), () => HOY);
    const csv = await (async () => {
      const temp = new TarifasService(new MemoriaTarifasRepository(), () => HOY);
      await temp.crear(base({ plan: 'Simple', nota: null }), 1);
      return temp.exportarCsv();
    })();
    const [header, row] = csv.trim().split('\r\n');
    const excel = [header.replace(/,/g, ';'), row.replace(/^1,/, ',').replace(/,/g, ';').replace('95.5', '95,5')].join('\n');
    const resultado = await service.importarCsv(excel, 1);
    assert.deepEqual(resultado, { ok: true, creadas: 1, actualizadas: 0 });
    assert.equal((await service.listar())[0].valor, 95.5);
  });
});
