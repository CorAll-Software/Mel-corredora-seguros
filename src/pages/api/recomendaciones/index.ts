import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { RECOMENDACION_LIMITES, RECOMENDACION_SEGUROS } from '../../../core/models/recomendacion.model';
import { ES } from '../../../core/i18n/dictionaries/es';
import { EN } from '../../../core/i18n/dictionaries/en';
import { FR } from '../../../core/i18n/dictionaries/fr';
import { IT } from '../../../core/i18n/dictionaries/it';
import { clientIp, fail, fieldErrors, ok } from '../../../server/http';
import { toOptimizedWebp } from '../../../server/images';
import { notifyMelanie } from '../../../server/mail';
import { RateLimit } from '../../../server/rate-limit';
import { ConsentimientosRepository } from '../../../server/repositories/consentimientos.repository';
import { RecomendacionesRepository } from '../../../server/repositories/recomendaciones.repository';
import { getStorage } from '../../../server/storage';
import { recomendacionFromForm, recomendacionSchema } from '../../../server/validation/recomendacion';

export const prerender = false;

// Anti-spam sin captcha: campo trampa + máximo 3 recomendaciones por IP y hora.
const LIMIT = { ambito: 'recomendacion', max: 3, windowMinutes: 60 };
// Margen sobre los 2 MB de la foto para el resto de campos del formulario.
const MAX_BODY_BYTES = RECOMENDACION_LIMITES.fotoBytes + 64 * 1024;

const DICTIONARIES = { es: ES, en: EN, fr: FR, it: IT } as const;

// POST /api/recomendaciones — guarda una recomendación como 'pendiente' y avisa a Melanie.
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return fail(413, 'validation_error', { foto: 'photo_size' });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'invalid_form');
  }

  const parsed = recomendacionSchema.safeParse(recomendacionFromForm(form));
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  // Un bot que rellenó el campo trampa recibe un "ok" sin que se guarde nada.
  if (errors.website) {
    return ok();
  }

  const foto = form.get('foto');
  const hasPhoto = foto instanceof File && foto.size > 0;
  if (hasPhoto) {
    if (foto.size > RECOMENDACION_LIMITES.fotoBytes) {
      errors.foto = 'photo_size';
    } else if (!(RECOMENDACION_LIMITES.fotoTipos as readonly string[]).includes(foto.type)) {
      errors.foto = 'photo_type';
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return fail(400, 'validation_error', errors);
  }

  const ip = clientIp(request, clientAddress) ?? 'desconocida';
  if (await RateLimit.isLimited(LIMIT, ip)) {
    return fail(429, 'rate_limited');
  }

  // Foto: formato real verificado y convertida a WebP antes de guardarla.
  let fotoKey: string | null = null;
  if (hasPhoto) {
    const image = await toOptimizedWebp(Buffer.from(await foto.arrayBuffer()));
    if ('error' in image) {
      return fail(400, 'validation_error', { foto: image.error });
    }
    fotoKey = `recomendaciones/${randomUUID()}.webp`;
    await getStorage().put(fotoKey, image.body, 'image/webp');
  }

  const data = parsed.data;
  let id: number;
  try {
    id = await RecomendacionesRepository.crear({
      nombre: data.nombre,
      empresaCargo: data.empresaCargo,
      seguro: data.seguro,
      estrellas: data.estrellas,
      texto: data.texto,
      fotoKey,
      idioma: data.idioma,
      ip,
    });
    // Ley 29733: se registra el texto exacto que la persona aceptó, en su idioma.
    const dictionary = DICTIONARIES[data.idioma as keyof typeof DICTIONARIES] ?? ES;
    await ConsentimientosRepository.registrar([
      { origen: 'recomendacion', referenciaId: id, tipo: 'publicacion', textoAceptado: dictionary.recommend.consentPublish, ip },
      { origen: 'recomendacion', referenciaId: id, tipo: 'datos-personales', textoAceptado: dictionary.recommend.consentData, ip },
    ]);
    await RateLimit.record(LIMIT, ip);
  } catch (error) {
    console.error('[recomendaciones] no se pudo guardar:', error);
    if (fotoKey) {
      await getStorage().delete(fotoKey).catch(() => undefined);
    }
    return fail(500, 'save_failed');
  }

  // El aviso nunca rompe el guardado: notifyMelanie registra sus propios fallos.
  await notifyMelanie('recomendacion', {
    id,
    nombre: data.nombre,
    empresaCargo: data.empresaCargo,
    seguro: ES.recommend.insurances[data.seguro as (typeof RECOMENDACION_SEGUROS)[number]],
    estrellas: data.estrellas,
    texto: data.texto,
    conFoto: fotoKey !== null,
  });

  return ok({ id }, 201);
};
