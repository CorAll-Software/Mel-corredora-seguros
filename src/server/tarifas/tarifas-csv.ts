import type { Tarifa } from '../../core/comparador/tarifa';

// Formato CSV de las tarifas (issue #44): exportar → editar en Excel → importar
// sin pérdida. Es un adaptador puro (texto ↔ datos); validar y guardar lo hacen
// los casos de uso.
//
// - UTF-8 con BOM para que Excel respete tildes; separador ",". Al importar se
//   acepta también ";" (Excel en algunos idiomas) y decimales con coma.
// - Vacío = sin condición (null). Coberturas separadas por " | ".
// - Columna id: con id se actualiza esa tarifa; sin id se crea una nueva.

type Celda = string | number | boolean | null;

interface Columna {
  header: string;
  get: (t: Tarifa) => Celda | string[];
  tipo: 'texto' | 'entero' | 'numero' | 'booleano' | 'lista';
  campo: keyof Tarifa;
}

const COLUMNAS: Columna[] = [
  { header: 'id', campo: 'id', tipo: 'entero', get: (t) => t.id },
  { header: 'ramo', campo: 'ramo', tipo: 'texto', get: (t) => t.ramo },
  { header: 'aseguradora', campo: 'aseguradora', tipo: 'texto', get: (t) => t.aseguradora },
  { header: 'plan', campo: 'plan', tipo: 'texto', get: (t) => t.plan },
  { header: 'uso', campo: 'uso', tipo: 'texto', get: (t) => t.uso },
  { header: 'anio_min', campo: 'anioMin', tipo: 'entero', get: (t) => t.anioMin },
  { header: 'anio_max', campo: 'anioMax', tipo: 'entero', get: (t) => t.anioMax },
  { header: 'producto', campo: 'producto', tipo: 'texto', get: (t) => t.producto },
  { header: 'edad_min', campo: 'edadMin', tipo: 'entero', get: (t) => t.edadMin },
  { header: 'edad_max', campo: 'edadMax', tipo: 'entero', get: (t) => t.edadMax },
  { header: 'actividad', campo: 'actividad', tipo: 'texto', get: (t) => t.actividad },
  { header: 'trabajadores_min', campo: 'trabajadoresMin', tipo: 'entero', get: (t) => t.trabajadoresMin },
  { header: 'trabajadores_max', campo: 'trabajadoresMax', tipo: 'entero', get: (t) => t.trabajadoresMax },
  { header: 'formula', campo: 'formula', tipo: 'texto', get: (t) => t.formula },
  { header: 'valor', campo: 'valor', tipo: 'numero', get: (t) => t.valor },
  { header: 'prima_minima', campo: 'primaMinima', tipo: 'numero', get: (t) => t.primaMinima },
  { header: 'moneda', campo: 'moneda', tipo: 'texto', get: (t) => t.moneda },
  { header: 'periodo', campo: 'periodo', tipo: 'texto', get: (t) => t.periodo },
  { header: 'coberturas', campo: 'coberturas', tipo: 'lista', get: (t) => t.coberturas },
  { header: 'vigencia_desde', campo: 'vigenciaDesde', tipo: 'texto', get: (t) => t.vigenciaDesde },
  { header: 'vigencia_hasta', campo: 'vigenciaHasta', tipo: 'texto', get: (t) => t.vigenciaHasta },
  { header: 'activa', campo: 'activa', tipo: 'booleano', get: (t) => t.activa },
  { header: 'ejemplo', campo: 'esEjemplo', tipo: 'booleano', get: (t) => t.esEjemplo },
  { header: 'nota', campo: 'nota', tipo: 'texto', get: (t) => t.nota },
];

const SEPARADOR_LISTA = ' | ';

function escape(value: string, delimiter: string): string {
  return /["\r\n]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
}

function formatCelda(value: Celda | string[]): string {
  if (value === null) return '';
  if (Array.isArray(value)) return value.join(SEPARADOR_LISTA);
  if (typeof value === 'boolean') return value ? 'si' : 'no';
  return String(value);
}

export function tarifasToCsv(tarifas: Tarifa[]): string {
  const lines = [COLUMNAS.map((c) => c.header).join(',')];
  for (const tarifa of tarifas) {
    lines.push(COLUMNAS.map((c) => escape(formatCelda(c.get(tarifa)), ',')).join(','));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

// Parser RFC 4180: comillas dobles, comillas escapadas y saltos de línea dentro de celdas.
function parseRows(text: string, delimiter: string): Array<{ cells: string[]; line: number }> {
  const rows: Array<{ cells: string[]; line: number }> = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === '\n') line++;
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      cells.push(cell);
      rows.push({ cells, line: rowLine });
      cells = [];
      cell = '';
      line++;
      rowLine = line;
    } else {
      cell += char;
    }
  }
  if (cell !== '' || cells.length > 0) {
    cells.push(cell);
    rows.push({ cells, line: rowLine });
  }
  return rows.filter((row) => row.cells.some((value) => value.trim() !== ''));
}

function parseCelda(raw: string, tipo: Columna['tipo']): unknown {
  const value = raw.trim();
  if (tipo === 'lista') {
    return value ? value.split('|').map((item) => item.trim()).filter(Boolean) : [];
  }
  if (value === '') {
    return null;
  }
  if (tipo === 'booleano') {
    const lower = value.toLowerCase();
    if (['si', 'sí', 'true', '1', 'x'].includes(lower)) return true;
    if (['no', 'false', '0'].includes(lower)) return false;
    return value;
  }
  if (tipo === 'entero' || tipo === 'numero') {
    const normalized = /^-?\d+,\d+$/.test(value) ? value.replace(',', '.') : value;
    const number = Number(normalized);
    // Si no es número se deja el texto: la validación de dominio lo rechaza con su mensaje.
    return Number.isFinite(number) ? number : value;
  }
  return value;
}

export interface FilaCsv {
  linea: number;
  id: number | null;
  raw: Record<string, unknown>;
}

export type CsvLectura = { ok: true; filas: FilaCsv[] } | { ok: false; error: string };

export function csvToFilas(text: string): CsvLectura {
  const content = text.replace(/^﻿/, '');
  const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows = parseRows(content, delimiter);
  if (rows.length === 0) {
    return { ok: false, error: 'El archivo está vacío.' };
  }
  const headers = rows[0].cells.map((h) => h.trim().toLowerCase());
  const faltan = COLUMNAS.filter((c) => c.header !== 'id' && !headers.includes(c.header)).map((c) => c.header);
  if (faltan.length > 0) {
    return { ok: false, error: `Faltan columnas: ${faltan.join(', ')}. Usa como plantilla un CSV exportado desde el panel.` };
  }

  const filas = rows.slice(1).map(({ cells, line }) => {
    const raw: Record<string, unknown> = {};
    let id: number | null = null;
    for (const columna of COLUMNAS) {
      const index = headers.indexOf(columna.header);
      const value = parseCelda(index >= 0 ? (cells[index] ?? '') : '', columna.tipo);
      if (columna.campo === 'id') {
        id = typeof value === 'number' ? value : null;
      } else {
        raw[columna.campo] = value;
      }
    }
    return { linea: line, id, raw };
  });
  return { ok: true, filas };
}
