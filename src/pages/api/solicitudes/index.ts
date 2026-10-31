import type { APIRoute } from 'astro';
import { z } from 'zod';
import { COTIZADOR_CONSENTIMIENTO } from '../../../core/models/quote.model';
import type { Origen } from '../../../core/solicitudes/solicitud';
import { SUPPORTED_LANGUAGES } from '../../../core/i18n/languages';
import { ES } from '../../../core/i18n/dictionaries/es';
import { EN } from '../../../core/i18n/dictionaries/en';
import { FR } from '../../../core/i18n/dictionaries/fr';
import { IT } from '../../../core/i18n/dictionaries/it';
import { clientIp, fail, ok, parseJson } from '../../../server/http';
import { RateLimit } from '../../../server/rate-limit';
import { ConsentimientosRepository } from '../../../server/repositories/consentimientos.repository';
import { solicitudesService } from '../../../server/solicitudes';
import { acceptedCheckbox } from '../../../server/validation/common';

export const prerender = false;

// Anti-spam sin captcha: campo trampa + máximo 10 solicitudes por IP y hora (en
// el comparador una persona puede pedir varias aseguradoras seguidas).
const LIMIT = { ambito: 'solicitud', max: 10, windowMinutes: 60 };

const DICTIONARIES = { es: ES, en: EN, fr: FR, it: IT } as const;
type Idioma = keyof typeof DICTIONARIES;

// Ley 29733: se registra el texto exacto de la casilla que la persona marcó en
// ese formulario y en su idioma (el cotizador solo existe en español).
function textoConsentimiento(origen: Origen, idioma: Idioma): string {
  const d = DICTIONARIES[idioma] ?? ES;
  switch (origen) {
    case 'comparador':
      return d.comparador.fields.acepta;
    case 'ficha':
      return d.form.consent;
    case 'dudas':
      return d.ask.consent;
    case 'agenda':
      return d.schedule.consent;
    case 'cotizador':
      return COTIZADOR_CONSENTIMIENTO;
    case 'portal':
    case 'acceso':
      // No llegan por aquí: tienen sus propias páginas (/portal/planilla y /solicitar-acceso).
      return '';
  }
}

// Los datos de la solicitud los valida el dominio; aquí solo lo propio del
// formulario web: consentimiento, idioma y campo trampa.
const envioSchema = z
  .object({
    acepta: acceptedCheckbox,
    idioma: z.enum(SUPPORTED_LANGUAGES.map((l) => l.code) as [Idioma, ...Idioma[]]).catch('es'),
    // Campo trampa anti-bots: debe llegar vacío.
    website: z.string().max(500).optional(),
  })
  .loose();

// POST /api/solicitudes — guarda una solicitud como 'nueva' y avisa a Melanie.
// El formulario abre WhatsApp aunque esto falle (issue #47).
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const parsed = await parseJson(request, envioSchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  const { acepta: _acepta, idioma, website, ...datos } = parsed.data;
  // Un bot que rellenó el campo trampa recibe un "ok" sin que se guarde nada.
  if (website) {
    return ok();
  }

  // Los pedidos del portal solo entran con la sesión de la empresa, y los de
  // acceso por su propio formulario.
  if (datos.origen === 'portal' || datos.origen === 'acceso') {
    return fail(400, 'validation_error', { origen: 'invalid' });
  }

  const ip = clientIp(request, clientAddress) ?? 'desconocida';
  try {
    if (await RateLimit.isLimited(LIMIT, ip)) {
      return fail(429, 'rate_limited');
    }
    const resultado = await solicitudesService.registrar(datos, { idioma, ip });
    if (!resultado.ok) {
      return fail(400, 'validation_error', resultado.errores);
    }
    const { solicitud } = resultado;
    await ConsentimientosRepository.registrar([
      {
        origen: 'solicitud',
        referenciaId: solicitud.id,
        tipo: 'datos-personales',
        textoAceptado: textoConsentimiento(solicitud.origen, idioma),
        ip,
      },
    ]);
    await RateLimit.record(LIMIT, ip);
    return ok({ id: solicitud.id }, 201);
  } catch (error) {
    console.error('[solicitudes] no se pudo guardar:', error);
    return fail(500, 'save_failed');
  }
};
