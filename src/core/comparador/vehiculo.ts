// Datos del vehículo por placa (issue #50). Hoy no hay una vía oficial y
// permitida para consultarlos (ver docs/INVESTIGACION-CONSULTA-PLACA.md): el
// comparador los pide a mano. Esto deja listo el dominio para cuando la haya.

// Solo lo que usa la tarifa; nunca el propietario (Ley 29733).
export interface DatosVehiculo {
  placa: string;
  marca: string;
  modelo: string | null;
  anio: number | null;
}

// "abc-123", "A1B 234" → "ABC123". null si no tiene forma de placa peruana
// (6 caracteres alfanuméricos con al menos un dígito).
export function normalizarPlaca(valor: string): string | null {
  const placa = valor.toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z0-9]{6}$/.test(placa) && /\d/.test(placa) ? placa : null;
}
