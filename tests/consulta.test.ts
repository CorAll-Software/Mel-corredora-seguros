import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RAMO_IDS } from '../src/core/comparador/ramos';
import { PASOS, borradorVacio, resumenConsulta, validarConsulta, validarPaso, type Borrador } from '../src/core/comparador/consulta';

// Pruebas de la consulta del comparador (issue #45): pasos por ramo y validación
// de cada paso antes de avanzar.

const HOY = '2026-10-31';

const contacto: Partial<Borrador> = { nombre: 'Ana Quispe', celular: '987654321', correo: 'ana@ejemplo.com', acepta: true };
const borrador = (datos: Partial<Borrador>): Borrador => ({ ...borradorVacio(), ...contacto, ...datos });

describe('pasos del comparador', () => {
  it('ningún ramo pide más de 4 pasos y el contacto va siempre al final', () => {
    for (const ramo of RAMO_IDS) {
      assert.ok(PASOS[ramo].length <= 4, ramo);
      assert.equal(PASOS[ramo].at(-1), 'contacto', ramo);
      assert.equal(PASOS[ramo].indexOf('contacto'), PASOS[ramo].length - 1, ramo);
    }
  });
});

describe('validarPaso', () => {
  it('exige elegir una opción válida del ramo', () => {
    assert.deepEqual(validarPaso('soat', 'uso', borradorVacio()), { uso: 'required' });
    assert.deepEqual(validarPaso('soat', 'uso', borrador({ uso: 'comercial' })), { uso: 'invalid' });
    assert.deepEqual(validarPaso('soat', 'uso', borrador({ uso: 'moto' })), {});
    assert.deepEqual(validarPaso('vehicular', 'uso', borrador({ uso: 'comercial' })), {});
  });

  it('valida marca, año y valor del vehículo', () => {
    assert.deepEqual(validarPaso('vehicular', 'vehiculo', borrador({ marca: ' ', anio: '1970' }), HOY), { marca: 'required', anio: 'year_range' });
    assert.deepEqual(validarPaso('vehicular', 'vehiculo', borrador({ marca: 'Toyota', anio: '2028' }), HOY), { anio: 'year_range' });
    assert.deepEqual(validarPaso('vehicular', 'vehiculo', borrador({ marca: 'Toyota', anio: '2027' }), HOY), {});
    assert.deepEqual(validarPaso('vehicular', 'valor', borrador({ valor: '500' })), { valor: 'value_range' });
    assert.deepEqual(validarPaso('vehicular', 'valor', borrador({ valor: '15000.50' })), {});
  });

  it('valida cada edad y la cantidad de personas', () => {
    assert.deepEqual(validarPaso('salud', 'edades', borrador({ edades: ['30', '', '120'] })), { 'edades.1': 'required', 'edades.2': 'age_range' });
    assert.deepEqual(validarPaso('salud', 'edades', borrador({ edades: [] })), { edades: 'ages_count' });
    assert.deepEqual(validarPaso('salud', 'edades', borrador({ edades: Array(9).fill('30') })), { edades: 'ages_count' });
    assert.deepEqual(validarPaso('salud', 'edades', borrador({ edades: ['0', '45'] })), {});
  });

  it('pide el nivel de riesgo solo para SCTR', () => {
    const empresa = { trabajadores: '12', planilla: '15000' };
    assert.deepEqual(validarPaso('sctr-vida-ley', 'empresa', borrador({ producto: 'sctr', ...empresa })), { actividad: 'required' });
    assert.deepEqual(validarPaso('sctr-vida-ley', 'empresa', borrador({ producto: 'vida-ley', ...empresa })), {});
    assert.deepEqual(validarPaso('sctr-vida-ley', 'empresa', borrador({ producto: 'sctr', actividad: 'alto', trabajadores: '0', planilla: '0' })), {
      trabajadores: 'workers_range',
      planilla: 'payroll_range',
    });
  });

  it('valida el contacto y el consentimiento', () => {
    assert.deepEqual(validarPaso('soat', 'contacto', borradorVacio()), {
      nombre: 'required',
      celular: 'required',
      correo: 'required',
      acepta: 'consent_required',
    });
    assert.deepEqual(validarPaso('soat', 'contacto', borrador({ celular: '812345678', correo: 'ana@' })), { celular: 'phone', correo: 'email' });
  });
});

describe('validarConsulta', () => {
  it('arma la consulta tipada y descarta la actividad en Vida Ley', () => {
    const r = validarConsulta('sctr-vida-ley', borrador({ producto: 'vida-ley', actividad: 'alto', trabajadores: '12', planilla: '15000' }));
    assert.ok(r.ok);
    assert.deepEqual(r.consulta.datos, { ramo: 'sctr-vida-ley', producto: 'vida-ley', actividad: null, trabajadores: 12, planilla: 15000 });
    assert.equal(r.consulta.contacto.nombre, 'Ana Quispe');
  });

  it('devuelve los errores de todos los pasos del ramo', () => {
    const r = validarConsulta('vehicular', borrador({ uso: 'particular' }), HOY);
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.errores).sort(), ['anio', 'marca', 'valor']);
  });

  it('resume la consulta en español para Melanie', () => {
    const r = validarConsulta('vehicular', borrador({ uso: 'particular', marca: 'Toyota', anio: '2020', valor: '15000', moneda: 'USD' }), HOY);
    assert.ok(r.ok);
    const resumen = Object.fromEntries(resumenConsulta(r.consulta).map((f) => [f.label, f.value]));
    assert.equal(resumen['Uso'], 'Particular');
    assert.equal(resumen['Vehículo'], 'Toyota 2020');
    assert.match(resumen['Valor'], /^US\$ 15/);
    assert.equal(resumen['Celular'], '987654321');
  });
});
