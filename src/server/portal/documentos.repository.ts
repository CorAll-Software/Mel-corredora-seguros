import type { Documento, DocumentoInput } from '../../core/portal/documento';

// Puerto de persistencia de los documentos del portal. El caso de uso
// (documentos.service.ts) depende de esta interfaz, no de Drizzle.

export interface DocumentosRepository {
  crear(clienteId: number, datos: DocumentoInput, archivo: { key: string; tamano: number }, adminId: number | null): Promise<Documento>;
  obtener(id: number): Promise<Documento | undefined>;
  // Por vigencia "hasta", la más lejana primero.
  listarPorCliente(clienteId: number): Promise<Documento[]>;
  contarPorCliente(): Promise<Record<number, number>>;
  eliminar(id: number): Promise<boolean>;
}
