import { z } from 'zod';

// Piezas de validación compartidas por los endpoints (mismos esquemas en cliente y servidor).

// Texto obligatorio sin espacios sobrantes.
export const requiredText = (max: number) => z.string().trim().min(1, 'required').max(max, 'too_long');

// Texto opcional: una cadena vacía se guarda como null.
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .optional()
    .transform((value) => (value ? value : null));

// Casilla de consentimiento: solo vale si se marcó explícitamente (Ley 29733).
export const acceptedCheckbox = z.literal(true, { error: 'consent_required' });

// Campo trampa anti-bots: debe llegar vacío.
export const honeypot = z.string().max(0, 'spam').optional();
