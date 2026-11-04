import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import {
  esPdf,
  estadoDocumento,
  hoyLima,
  nombreDescarga,
  validarDocumento,
  type Documento,
  type DocumentoInput,
} from '../src/core/portal/documento';
import type { DocumentosRepository } from '../src/server/portal/documentos.repository';
import { DocumentosService } from '../src/server/portal/documentos.service';
import type { Storage, StoredFile } from '../src/server/storage';

// Pruebas de los documentos del portal (issue #49) con repositorio y
// almacenamiento en memoria.

class MemoriaDocumentosRepository implements DocumentosRepository {
  items = new Map<number, Documento>();
  private next = 1;

  async crear(clienteId: number, datos: DocumentoInput, archivo: { key: string; tamano: number }) {
    const doc: Documento = { ...datos, id: this.next++, clienteId, archivoKey: archivo.key, tamano: archivo.tamano, createdAt: new Date() };
    this.items.set(doc.id, doc);
    return doc;
  }
  async obtener(id: number) {
    return this.items.get(id);
  }
  async listarPorCliente(clienteId: number) {
    return [...this.items.values()].filter((d) => d.clienteId === clienteId).sort((a, b) => b.vigenciaHasta.localeCompare(a.vigenciaHasta));
  }
  async contarPorCliente() {
    const r: Record<number, number> = {};
    for (const d of this.items.values()) r[d.clienteId] = (r[d.clienteId] ?? 0) + 1;
    return r;
  }
  async eliminar(id: number) {
    return this.items.delete(id);
  }
}

class MemoriaStorage implements Storage {
  files = new Map<string, StoredFile>();
  async put(key: string, body: Buffer, contentType: string) {
    this.files.set(key, { body, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const PDF = new TextEncoder().encode('%PDF-1.7\n%prueba\n');
const DATOS = { tipo: 'constancia-sctr', nombre: 'Marzo 2026', vigenciaDesde: '2026-03-01', vigenciaHasta: '2026-12-31' };

let repo: MemoriaDocumentosRepository;
let storage: MemoriaStorage;
let service: DocumentosService;
let ahora: Date;

beforeEach(() => {
  repo = new MemoriaDocumentosRepository();
  storage = new MemoriaStorage();
  ahora = new Date('2026-11-02T15:00:00Z');
  let n = 0;
  service = new DocumentosService(repo, {
    storage,
    firmar: (v) => createHmac('sha256', 'secreto-de-prueba').update(v).digest('base64url'),
    nuevaClave: (clienteId) => `portal/${clienteId}/${++n}.pdf`,
    ahora: () => ahora,
  });
});

function firma(enlace: string) {
  const url = new URL(enlace, 'http://x');
  return { id: Number(url.pathname.split('/').pop()), exp: Number(url.searchParams.get('exp')), sig: url.searchParams.get('sig')! };
}

describe('dominio de documentos', () => {
  it('valida datos y que el archivo sea un PDF de verdad', () => {
    assert.ok(validarDocumento(DATOS, { bytes: PDF }).ok);
    const r = validarDocumento({ tipo: 'otro', nombre: '', vigenciaDesde: '2026-05-01', vigenciaHasta: '2026-04-01' }, { bytes: new TextEncoder().encode('MZ ejecutable') });
    assert.deepEqual(!r.ok && r.errores, { tipo: 'invalid', nombre: 'required', vigenciaHasta: 'range', archivo: 'not_pdf' });
    const sinArchivo = validarDocumento({ ...DATOS, vigenciaHasta: '2026-02-30' }, null);
    assert.deepEqual(!sinArchivo.ok && sinArchivo.errores, { vigenciaHasta: 'invalid', archivo: 'required' });
    assert.ok(esPdf(PDF));
  });

  it('marca vigente, futuro y vencido según el día de Lima', () => {
    // 02:00 UTC del 1 de enero aún es 31 de diciembre en Lima.
    assert.equal(hoyLima(new Date('2027-01-01T02:00:00Z')), '2026-12-31');
    assert.equal(estadoDocumento({ vigenciaDesde: null, vigenciaHasta: '2026-12-31' }, '2026-12-31'), 'vigente');
    assert.equal(estadoDocumento({ vigenciaDesde: null, vigenciaHasta: '2026-12-31' }, '2027-01-01'), 'vencido');
    assert.equal(estadoDocumento({ vigenciaDesde: '2026-12-01', vigenciaHasta: '2026-12-31' }, '2026-11-02'), 'futuro');
    assert.equal(nombreDescarga({ tipo: 'poliza', nombre: 'Obra: Los Olivos' }), 'Póliza - Obra  Los Olivos.pdf');
  });
});

describe('DocumentosService', () => {
  it('sube el PDF al almacenamiento privado y lista con estado', async () => {
    const r = await service.subir(7, DATOS, { bytes: PDF }, 1);
    assert.ok(r.ok);
    assert.ok(storage.files.has('portal/7/1.pdf'));
    await service.subir(7, { ...DATOS, nombre: 'Febrero 2026', vigenciaDesde: '', vigenciaHasta: '2026-02-28' }, { bytes: PDF }, 1);
    const docs = await service.listar(7);
    assert.deepEqual(docs.map((d) => [d.nombre, d.estado]), [['Marzo 2026', 'vigente'], ['Febrero 2026', 'vencido']]);
    assert.deepEqual(await service.contarPorCliente(), { 7: 2 });
  });

  it('un cliente solo descarga sus propios documentos y con firma vigente', async () => {
    const r = await service.subir(7, DATOS, { bytes: PDF }, 1);
    assert.ok(r.ok);
    const { id, exp, sig } = firma(service.enlaceDescarga(r.documento));

    assert.ok(await service.descargar(7, id, exp, sig));
    // Otra empresa con el mismo enlace, firma alterada o enlace vencido: nada.
    assert.equal(await service.descargar(8, id, exp, sig), null);
    assert.equal(await service.descargar(7, id, exp + 60, sig), null);
    assert.equal(await service.descargar(7, id, exp, sig.slice(0, -1) + 'x'), null);
    ahora = new Date(ahora.getTime() + 16 * 60_000);
    assert.equal(await service.descargar(7, id, exp, sig), null);

    // La lista de otra empresa no incluye el documento.
    assert.deepEqual(await service.listar(8), []);
  });

  it('eliminar borra el registro y el archivo, solo para su empresa', async () => {
    const r = await service.subir(7, DATOS, { bytes: PDF }, 1);
    assert.ok(r.ok);
    assert.equal(await service.eliminar(8, r.documento.id), false);
    assert.equal(await service.eliminar(7, r.documento.id), true);
    assert.equal(storage.files.size, 0);
    assert.equal(await service.archivo(r.documento.id), null);
  });

  it('no sube nada si la validación falla', async () => {
    const r = await service.subir(7, { ...DATOS, nombre: '' }, { bytes: PDF }, 1);
    assert.ok(!r.ok);
    assert.equal(storage.files.size, 0);
  });
});
