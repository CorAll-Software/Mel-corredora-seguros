// Palabras que el lineamiento SBS (Oficio Múltiple N° 61029-2026-SBS) no permite
// usar para referirse a Melanie, que es persona natural: nada de plural ni de
// "empresa", "equipo", "agencia"… (informe tercera revisión §5). Se usa para
// avisar a Melanie antes de aprobar una recomendación (issue #42).

export interface SbsMatch {
  word: string;
  start: number;
  end: number;
}

// Raíces con sus variantes; sin distinguir mayúsculas ni tildes.
const PATTERNS: RegExp[] = [
  /\bnosotr[oa]s\b/giu,
  /\bustedes\b/giu,
  /\bequipos?\b/giu,
  /\bempresas?\b/giu,
  /\bs\.?\s?a\.?\s?c\.?(?=\s|$|[,;:!?)])/giu,
  /\bagencias?\b/giu,
  /\bgrupos?\b/giu,
];

// Quita tildes letra por letra (sin cambiar la longitud del texto), para que las
// posiciones encontradas sirvan sobre el original.
function fold(text: string): string {
  return Array.from(text, (char) => char.normalize('NFD')[0] ?? char).join('');
}

export function findSbsWords(text: string): SbsMatch[] {
  const source = fold(text);
  const matches: SbsMatch[] = [];
  for (const pattern of PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? 0;
      matches.push({ word: text.slice(start, start + match[0].length), start, end: start + match[0].length });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

// Parte el texto en trozos normales y marcados, para resaltarlos en pantalla.
export function splitSbsWords(text: string): Array<{ text: string; flagged: boolean }> {
  const parts: Array<{ text: string; flagged: boolean }> = [];
  let cursor = 0;
  for (const match of findSbsWords(text)) {
    if (match.start < cursor) {
      continue;
    }
    if (match.start > cursor) {
      parts.push({ text: text.slice(cursor, match.start), flagged: false });
    }
    parts.push({ text: match.word, flagged: true });
    cursor = match.end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), flagged: false });
  }
  return parts;
}
