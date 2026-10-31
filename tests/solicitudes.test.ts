import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  coincideBusqueda,
  numeroWhatsapp,
  resumenSolicitud,
  solicitudesToCsv,
  validarSolicitud,
  type CambioEstado,
  type EstadoSolicitud,
  type Solicitud,
  type SolicitudInput,
} from '../src/core/solicitudes/solicitud';
import type {
  SolicitudesRepository,
  SolicitudMeta,
} from '../src/server/solicitudes/solicitudes.repository';
import { SolicitudesService } from '../src/server/solicitudes/solicitudes.service';

// Pruebas del módulo de solicitudes (issue #47) con un repositorio en memoria:
// los casos de uso no dependen de la base de datos ni del correo.

class MemoriaSolicitudesRepository implements SolicitudesRepository {
  items = new Map<number, Solicitud>();
  cambios: CambioEstado[] = [];
  private next = 1;

  async crear(datos: SolicitudInput, meta: SolicitudMeta) {
    const s: Solicitud = {
      ...datos,
      id: this.next++,
      estado: 'nueva',
      notas: null,
      idioma: meta.idioma,
      createdAt: new Date(),
      estadoActualizadoEn: null,
    };
    this.items.set(s.id, s);
    return s;
  }
  async obtener(id: number) {
    return this.items.get(id);
  }
  async listar(filtro: { estado?: EstadoSolicitud } = {}) {
    return [...this.items.values()]
      .filter((s) => !filtro.estado || s.estado === filtro.estado)
      .reverse();
  }
  async contarPorEstado() {
    const totales: Partial<Record<EstadoSolicitud, number>> = {};
    for (const s of this.items.values()) totales[s.estado] = (totales[s.estado] ?? 0) + 1;
    return totales;
  }
  async cambiarEstado(id: number, de: EstadoSolicitud, a: EstadoSolicitud) {
    const s = this.items.get(id);
    if (!s || s.estado !== de) return false;
    s.estado = a;
    s.estadoActualizadoEn = new Date();
    this.cambios.push({ solicitudId: id, de, a, adminNombre: 'Melanie', fecha: new Date() });
    return true;
  }
  async guardarNotas(id: number, notas: string | null) {
    const s = this.items.get(id);
    if (!s) return false;
    s.notas = notas;
    return true;
  }
  async historial(ids: number[]) {
    return this.cambios.filter((c) => ids.includes(c.solicitudId));
  }
}

const META: SolicitudMeta = { idioma: 'es', ip: '127.0.0.1' };

const base = (cambios: Record<string, unknown> = {}) => ({
  origen: 'comparador',
  ramo: 'SOAT',
  nombre: 'Ana Quispe',
  telefono: '988 983 710',
  correo: 'ana@correo.pe',
  datos: [{ label: 'Uso', value: 'Particular' }],
  aseguradora: 'Mapfre · SOAT Particular',
  prima: 'S/ 95.00 (anual)',
  ...cambios,
});

function crearServicio() {
  const repo = new MemoriaSolicitudesRepository();
  const avisos: Solicitud[] = [];
  const servicio = new SolicitudesService(repo, { nuevaSolicitud: async (s) => avisos.push(s) });
  return { repo, avisos, servicio };
}

describe('validarSolicitud', () => {
  it('acepta una solicitud completa y limpia los textos', () => {
    const r = validarSolicitud(
      base({
        nombre: '  Ana Quispe  ',
        datos: [
          { label: 'Uso', value: 'Particular' },
          { label: 'Empresa', value: '' },
        ],
      }),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.nombre, 'Ana Quispe');
    // Las filas vacías no se guardan.
    assert.deepEqual(r.data.datos, [{ label: 'Uso', value: 'Particular' }]);
  });

  it('pide al menos un celular o un correo', () => {
    const r = validarSolicitud(base({ telefono: '', correo: null }));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.errores.telefono, 'contact_required');
  });

  it('rechaza origen desconocido, nombre vacío y correo inválido', () => {
    const r = validarSolicitud(base({ origen: 'spam', nombre: ' ', correo: 'no-es-correo' }));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.errores.origen, 'invalid');
    assert.equal(r.errores.nombre, 'required');
    assert.equal(r.errores.correo, 'email');
  });

  it('limita la cantidad y el largo de los datos', () => {
    const muchos = Array.from({ length: 31 }, (_, i) => ({ label: `Dato ${i}`, value: 'x' }));
    assert.equal(validarSolicitud(base({ datos: muchos })).ok, false);
    assert.equal(
      validarSolicitud(base({ datos: [{ label: 'Consulta', value: 'x'.repeat(501) }] })).ok,
      false,
    );
  });
});

describe('reglas de la bandeja', () => {
  const solicitud: Solicitud = {
    ...(validarSolicitud(base()) as { ok: true; data: SolicitudInput }).data,
    id: 7,
    estado: 'nueva',
    notas: 'Llamar después de las 6',
    idioma: 'es',
    createdAt: new Date('2026-10-31T15:30:00Z'),
    estadoActualizadoEn: null,
  };

  it('arma el resumen con la aseguradora elegida primero', () => {
    assert.equal(
      resumenSolicitud(solicitud),
      'Aseguradora elegida: Mapfre · SOAT Particular\nPrima referencial: S/ 95.00 (anual)\nUso: Particular',
    );
  });

  it('busca sin distinguir tildes ni mayúsculas, y por celular con o sin espacios', () => {
    assert.ok(coincideBusqueda(solicitud, 'QUISPE'));
    assert.ok(coincideBusqueda(solicitud, 'despues'));
    assert.ok(coincideBusqueda(solicitud, '988983'));
    assert.ok(coincideBusqueda(solicitud, '983 710'));
    assert.ok(coincideBusqueda(solicitud, 'comparador'));
    assert.ok(!coincideBusqueda(solicitud, 'Rímac'));
  });

  it('prepara el número de WhatsApp con el código de Perú', () => {
    assert.equal(numeroWhatsapp('988 983 710'), '51988983710');
    assert.equal(numeroWhatsapp('+51 988 983 710'), '51988983710');
    assert.equal(numeroWhatsapp('+34 612 345 678'), '34612345678');
    assert.equal(numeroWhatsapp('12345'), null);
    assert.equal(numeroWhatsapp(null), null);
  });

  it('exporta CSV para Excel sin ejecutar fórmulas', () => {
    const csv = solicitudesToCsv([{ ...solicitud, nombre: '=HYPERLINK("x")', notas: 'uno, dos' }]);
    assert.ok(csv.startsWith('﻿id,fecha,origen,estado,'));
    const fila = csv.split('\r\n')[1];
    assert.ok(fila.startsWith('7,2026-10-31 10:30,Comparador,Nueva,SOAT,'));
    assert.ok(fila.includes(`"'=HYPERLINK(""x"")"`));
    assert.ok(fila.includes('"uno, dos"'));
  });
});

describe('SolicitudesService', () => {
  it('guarda la solicitud como nueva y avisa a Melanie', async () => {
    const { repo, avisos, servicio } = crearServicio();
    const r = await servicio.registrar(base(), META);
    assert.equal(r.ok, true);
    assert.equal(repo.items.size, 1);
    assert.equal(avisos.length, 1);
    assert.equal(avisos[0].estado, 'nueva');
  });

  it('no guarda nada si los datos no son válidos', async () => {
    const { repo, avisos, servicio } = crearServicio();
    const r = await servicio.registrar(base({ nombre: '' }), META);
    assert.equal(r.ok, false);
    assert.equal(repo.items.size, 0);
    assert.equal(avisos.length, 0);
  });

  it('un fallo del correo no rompe el guardado', async () => {
    const repo = new MemoriaSolicitudesRepository();
    const servicio = new SolicitudesService(repo, {
      nuevaSolicitud: async () => {
        throw new Error('sin conexión');
      },
    });
    const original = console.error;
    console.error = () => undefined;
    try {
      const r = await servicio.registrar(base(), META);
      assert.equal(r.ok, true);
      assert.equal(repo.items.size, 1);
    } finally {
      console.error = original;
    }
  });

  it('registra cada cambio de estado con su fecha', async () => {
    const { servicio } = crearServicio();
    const r = await servicio.registrar(base(), META);
    assert.ok(r.ok);
    const id = r.solicitud.id;
    assert.equal(await servicio.cambiarEstado(id, 'contactada', 1), true);
    assert.equal(await servicio.cambiarEstado(id, 'cotizada', 1), true);
    // Mismo estado o solicitud inexistente: no hay cambio.
    assert.equal(await servicio.cambiarEstado(id, 'cotizada', 1), false);
    assert.equal(await servicio.cambiarEstado(999, 'emitida', 1), false);

    const actual = await servicio.obtener(id);
    assert.equal(actual?.estado, 'cotizada');
    assert.ok(actual?.estadoActualizadoEn instanceof Date);
    const historial = await servicio.historial([id]);
    assert.deepEqual(
      historial.map((c) => `${c.de}→${c.a}`),
      ['nueva→contactada', 'contactada→cotizada'],
    );
    assert.deepEqual(await servicio.contarPorEstado(), {
      nueva: 0,
      contactada: 0,
      cotizada: 1,
      emitida: 0,
      descartada: 0,
    });
  });

  it('filtra la bandeja por estado y búsqueda', async () => {
    const { servicio } = crearServicio();
    await servicio.registrar(base(), META);
    const otra = await servicio.registrar(
      base({ origen: 'dudas', nombre: 'Luis Pérez', telefono: '912345678', correo: null }),
      META,
    );
    assert.ok(otra.ok);
    await servicio.cambiarEstado(otra.solicitud.id, 'descartada', 1);

    assert.equal((await servicio.listar()).length, 2);
    assert.deepEqual(
      (await servicio.listar({ estado: 'nueva' })).map((s) => s.nombre),
      ['Ana Quispe'],
    );
    assert.deepEqual(
      (await servicio.listar({ busqueda: 'perez' })).map((s) => s.nombre),
      ['Luis Pérez'],
    );
  });

  it('guarda notas y respeta el límite', async () => {
    const { servicio } = crearServicio();
    const r = await servicio.registrar(base(), META);
    assert.ok(r.ok);
    assert.equal(await servicio.guardarNotas(r.solicitud.id, '  Prefiere correo  '), 'ok');
    assert.equal((await servicio.obtener(r.solicitud.id))?.notas, 'Prefiere correo');
    assert.equal(await servicio.guardarNotas(r.solicitud.id, 'x'.repeat(2001)), 'too_long');
    assert.equal(await servicio.guardarNotas(999, 'hola'), 'not_found');
  });
});
