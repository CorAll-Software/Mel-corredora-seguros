import { z } from 'zod';
import { RECOMENDACION_LIMITES, RECOMENDACION_SEGUROS } from '../../core/models/recomendacion.model';
import { SUPPORTED_LANGUAGES } from '../../core/i18n/languages';
import { acceptedCheckbox, honeypot, optionalText, requiredText } from './common';

// Campos de texto del formulario "Deja tu recomendación" (la foto se valida aparte).
export const recomendacionSchema = z.object({
  nombre: requiredText(RECOMENDACION_LIMITES.nombre),
  empresaCargo: optionalText(RECOMENDACION_LIMITES.empresaCargo),
  seguro: z.enum(RECOMENDACION_SEGUROS, { error: 'required' }),
  estrellas: z.coerce.number({ error: 'rating' }).int('rating').min(1, 'rating').max(5, 'rating'),
  texto: requiredText(RECOMENDACION_LIMITES.texto),
  autorizaPublicacion: acceptedCheckbox,
  aceptaDatos: acceptedCheckbox,
  idioma: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [string, ...string[]]).catch('es'),
  website: honeypot,
});

export type RecomendacionInput = z.infer<typeof recomendacionSchema>;

// Las casillas llegan del FormData como "true" / "on".
export function recomendacionFromForm(form: FormData): Record<string, unknown> {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : undefined;
  };
  const checked = (name: string) => ['true', 'on', '1'].includes(text(name) ?? '');
  return {
    nombre: text('nombre') ?? '',
    empresaCargo: text('empresaCargo'),
    seguro: text('seguro'),
    estrellas: text('estrellas'),
    texto: text('texto') ?? '',
    autorizaPublicacion: checked('autorizaPublicacion'),
    aceptaDatos: checked('aceptaDatos'),
    idioma: text('idioma'),
    website: text('website'),
  };
}
