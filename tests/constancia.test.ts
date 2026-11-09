import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  datosConstancia,
  hoyEnLima,
  validarConstancia,
  type ConstanciaValores,
} from '../src/core/solicitudes/constancia';
import { validarSolicitud } from '../src/core/solicitudes/solicitud';

const HOY = '2026-11-09';
const base = (cambios: Partial<ConstanciaValores> = {}): ConstanciaValores => ({
  razonSocial: 'Empresa de Prueba S.A.C.',
  ruc: '20123456789',
  contacto: 'Ana Pérez',
  telefono: '987654321',
  correo: '',
  poliza: 'si',
  trabajadores: '12',
  lugar: 'Obra Av. Principal',
  fechaIngreso: HOY,
  ...cambios,
});

describe('solicitud de constancia SCTR', () => {
  it('acepta una solicitud completa, con ingreso hoy y sin correo', () => {
    assert.deepEqual(validarConstancia(base(), HOY), {});
  });

  it('marca cada campo obligatorio que falta o es inválido', () => {
    const errores = validarConstancia(
      base({ razonSocial: '', ruc: '123', contacto: '', telefono: 'abc', poliza: 'otra', trabajadores: '0', lugar: '', fechaIngreso: '' }),
      HOY,
    );
    assert.deepEqual(Object.keys(errores).sort(), ['contacto', 'fechaIngreso', 'lugar', 'poliza', 'razonSocial', 'ruc', 'telefono', 'trabajadores']);
  });

  it('rechaza fechas pasadas, fechas imposibles y cantidades no enteras', () => {
    assert.ok(validarConstancia(base({ fechaIngreso: '2026-11-08' }), HOY).fechaIngreso);
    assert.ok(validarConstancia(base({ fechaIngreso: '2026-02-31' }), HOY).fechaIngreso);
    assert.ok(validarConstancia(base({ trabajadores: '1.5' }), HOY).trabajadores);
    assert.ok(validarConstancia(base({ trabajadores: '10000' }), HOY).trabajadores);
  });

  it('revisa el correo solo si se escribió', () => {
    assert.ok(validarConstancia(base({ correo: 'no-es-correo' }), HOY).correo);
    assert.equal(validarConstancia(base({ correo: 'ana@empresa.pe' }), HOY).correo, undefined);
  });

  it('calcula el día en Perú, no el del servidor', () => {
    assert.equal(hoyEnLima(new Date('2026-11-10T03:00:00Z')), '2026-11-09');
  });

  it('genera una solicitud válida para la bandeja, sin datos de trabajadores', () => {
    const v = base();
    const r = validarSolicitud({ origen: 'constancia', ramo: 'SCTR', nombre: v.contacto, telefono: v.telefono, datos: datosConstancia(v) });
    assert.equal(r.ok, true);
    assert.deepEqual(
      datosConstancia(v).map((d) => d.label),
      ['Empresa', 'RUC', 'Póliza SCTR', 'Trabajadores', 'Lugar de ingreso', 'Fecha de ingreso'],
    );
    assert.equal(datosConstancia(v)[5]?.value, '09/11/2026');
  });
});
