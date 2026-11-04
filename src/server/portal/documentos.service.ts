import {
  estadoDocumento,
  hoyLima,
  validarDocumento,
  type Documento,
  type DocumentoErrores,
  type EstadoDocumento,
} from '../../core/portal/documento';
import type { Storage } from '../storage';
import type { DocumentosRepository } from './documentos.repository';

// Casos de uso de los documentos del portal (issue #49): Melanie sube PDFs por
// empresa; cada empresa ve solo los suyos y los descarga con un enlace firmado
// que vence a los pocos minutos. El archivo nunca es público.

export interface DocumentosDeps {
  storage: Storage;
  // HMAC del valor con el secreto del servidor.
  firmar(valor: string): string;
  nuevaClave(clienteId: number): string;
  ahora?: () => Date;
}

export type DocumentoConEstado = Documento & { estado: EstadoDocumento };

// Vigencia del enlace de descarga.
export const ENLACE_DESCARGA_MINUTOS = 15;

function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export class DocumentosService {
  constructor(
    private readonly repo: DocumentosRepository,
    private readonly deps: DocumentosDeps,
  ) {}

  private ahora(): Date {
    return this.deps.ahora?.() ?? new Date();
  }

  private conEstado(docs: Documento[]): DocumentoConEstado[] {
    const hoy = hoyLima(this.ahora());
    return docs.map((doc) => ({ ...doc, estado: estadoDocumento(doc, hoy) }));
  }

  async subir(
    clienteId: number,
    raw: Record<string, unknown>,
    archivo: { bytes: Uint8Array } | null,
    adminId: number | null,
  ): Promise<{ ok: true; documento: Documento } | { ok: false; errores: DocumentoErrores }> {
    const validacion = validarDocumento(raw, archivo);
    if (!validacion.ok) {
      return validacion;
    }
    const bytes = archivo!.bytes;
    const key = this.deps.nuevaClave(clienteId);
    await this.deps.storage.put(key, Buffer.from(bytes), 'application/pdf');
    try {
      const documento = await this.repo.crear(clienteId, validacion.documento, { key, tamano: bytes.length }, adminId);
      return { ok: true, documento };
    } catch (error) {
      // Sin registro en la base, el archivo quedaría huérfano.
      await this.deps.storage.delete(key);
      throw error;
    }
  }

  // Todos los documentos de la empresa, con su estado (vigentes y vencidos).
  async listar(clienteId: number): Promise<DocumentoConEstado[]> {
    return this.conEstado(await this.repo.listarPorCliente(clienteId));
  }

  contarPorCliente(): Promise<Record<number, number>> {
    return this.repo.contarPorCliente();
  }

  // Solo borra si el documento es de esa empresa.
  async eliminar(clienteId: number, id: number): Promise<boolean> {
    const doc = await this.repo.obtener(id);
    if (!doc || doc.clienteId !== clienteId) {
      return false;
    }
    await this.repo.eliminar(id);
    await this.deps.storage.delete(doc.archivoKey);
    return true;
  }

  // Enlace de descarga firmado para la empresa dueña del documento.
  enlaceDescarga(doc: Pick<Documento, 'id' | 'clienteId'>): string {
    const exp = Math.floor(this.ahora().getTime() / 1000) + ENLACE_DESCARGA_MINUTOS * 60;
    const sig = this.deps.firmar(`${doc.id}.${doc.clienteId}.${exp}`);
    return `/portal/documentos/${doc.id}?exp=${exp}&sig=${sig}`;
  }

  // Devuelve el archivo si la firma es válida, no venció y el documento es de
  // la empresa con sesión. Cualquier otro caso responde igual (null).
  async descargar(
    clienteId: number,
    id: number,
    exp: number,
    sig: string,
  ): Promise<{ documento: Documento; body: Buffer } | null> {
    if (!Number.isInteger(exp) || exp * 1000 < this.ahora().getTime()) {
      return null;
    }
    if (!igualesSeguro(sig, this.deps.firmar(`${id}.${clienteId}.${exp}`))) {
      return null;
    }
    return this.archivo(id, clienteId);
  }

  // Para el panel de Melanie (ruta protegida por la sesión de administradora).
  async archivo(id: number, clienteId?: number): Promise<{ documento: Documento; body: Buffer } | null> {
    const documento = await this.repo.obtener(id);
    if (!documento || (clienteId !== undefined && documento.clienteId !== clienteId)) {
      return null;
    }
    const file = await this.deps.storage.get(documento.archivoKey);
    return file ? { documento, body: file.body } : null;
  }
}
