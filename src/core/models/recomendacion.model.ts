// Reglas del formulario "Deja tu recomendación" (issue #41, informe tercera
// revisión §3). Las comparten el formulario (cliente) y el endpoint (servidor).

// Seguros que el cliente puede tener con Melanie; la etiqueta visible vive en
// los diccionarios (recommend.insurances.<clave>).
export const RECOMENDACION_SEGUROS = [
  'cartas-fianza',
  'sctr',
  'vida-ley',
  'eps',
  'salud',
  'vida',
  'hogar',
  'vehicular',
  'viajes',
  'otro',
] as const;

export type RecomendacionSeguro = (typeof RECOMENDACION_SEGUROS)[number];

export const RECOMENDACION_LIMITES = {
  nombre: 120,
  empresaCargo: 160,
  texto: 500,
  // Foto o logo: JPG, PNG o WebP de hasta 2 MB.
  fotoBytes: 2 * 1024 * 1024,
  fotoTipos: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export type RecomendacionEstado = 'pendiente' | 'aprobada' | 'rechazada';

// Códigos de error que el endpoint devuelve por campo y el formulario traduce.
export type RecomendacionErrorCode =
  | 'required'
  | 'too_long'
  | 'rating'
  | 'consent_required'
  | 'photo_type'
  | 'photo_size'
  | 'photo_invalid';
