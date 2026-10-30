import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { SERVER_ENV } from './env';

// Almacenamiento de archivos subidos (fotos de recomendaciones, documentos del
// portal). Los archivos nunca se sirven directamente: siempre pasan por un
// endpoint que decide quién puede verlos.
//
// Driver actual: disco local (STORAGE_DIR, por defecto ./data/uploads).
// TODO-STORAGE (issue #52): driver de almacenamiento de objetos para la demo publicada.

export interface StoredFile {
  body: Buffer;
  contentType: string;
}

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  pdf: 'application/pdf',
};

function localStorage(root: string): Storage {
  const base = resolve(root);
  // Impide salir de la carpeta base con claves como "../../etc".
  const pathOf = (key: string): string => {
    const path = resolve(base, key);
    if (!path.startsWith(base + sep)) {
      throw new Error(`Clave de archivo no válida: ${key}`);
    }
    return path;
  };

  return {
    async put(key, body) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
    },
    async get(key) {
      try {
        const body = await readFile(pathOf(key));
        const extension = key.split('.').pop() ?? '';
        return { body, contentType: CONTENT_TYPES[extension] ?? 'application/octet-stream' };
      } catch {
        return null;
      }
    },
    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}

let instance: Storage | undefined;

export function getStorage(): Storage {
  instance ??= localStorage(SERVER_ENV.read('STORAGE_DIR') ?? './data/uploads');
  return instance;
}
