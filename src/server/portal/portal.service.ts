import {
  generarClaveTemporal,
  PORTAL_LIMITES,
  validarClaveNueva,
  validarCuenta,
  type ClaveErrorCode,
  type CuentaErrores,
  type CuentaPortal,
} from '../../core/portal/cuenta';
import type { CuentaConClave, PortalRepository } from './portal.repository';

// Casos de uso del Portal de Clientes (issue #48): Melanie crea y desactiva
// cuentas; el cliente ingresa con RUC + clave, cambia la clave temporal en su
// primer ingreso y puede recuperarla con un enlace de un solo uso.

export interface PortalDeps {
  claves: {
    hash(clave: string): Promise<string>;
    verificar(hash: string, clave: string): Promise<boolean>;
    // Comparación de relleno cuando el RUC no existe (mismo tiempo de respuesta).
    simular(clave: string): Promise<boolean>;
  };
  tokens: {
    nuevo(): string;
    hash(token: string): string;
  };
  // Cierra las sesiones abiertas del cliente (al desactivar o cambiar la clave).
  cerrarSesiones(clienteId: number): Promise<void>;
  enviarEnlace(cuenta: CuentaPortal, path: string): Promise<void>;
  aleatorio(max: number): number;
  ahora?: () => Date;
}

export type CambioClaveError = ClaveErrorCode | 'wrong_password' | 'not_found';
export type Resultado<E> = { ok: true } | { ok: false; error: E };

function publica({ passwordHash: _hash, ...cuenta }: CuentaConClave): CuentaPortal {
  return cuenta;
}

export class PortalService {
  constructor(
    private readonly repo: PortalRepository,
    private readonly deps: PortalDeps,
  ) {}

  private ahora(): Date {
    return this.deps.ahora?.() ?? new Date();
  }

  listar(): Promise<CuentaPortal[]> {
    return this.repo.listar();
  }

  // Crea la cuenta con una clave temporal que se muestra una sola vez a Melanie.
  async crear(
    raw: Record<string, unknown>,
    adminId: number | null,
  ): Promise<{ ok: true; cuenta: CuentaPortal; claveTemporal: string } | { ok: false; errores: CuentaErrores }> {
    const validacion = validarCuenta(raw);
    if (!validacion.ok) {
      return validacion;
    }
    if (await this.repo.buscarPorRuc(validacion.cuenta.ruc)) {
      return { ok: false, errores: { ruc: 'taken' } };
    }
    const claveTemporal = generarClaveTemporal(this.deps.aleatorio);
    const cuenta = await this.repo.crear(validacion.cuenta, await this.deps.claves.hash(claveTemporal), adminId);
    return { ok: true, cuenta, claveTemporal };
  }

  // Cuando el cliente no tiene correo o no recibe el enlace, Melanie genera otra
  // clave temporal y se la envía ella.
  async nuevaClaveTemporal(id: number): Promise<string | null> {
    const claveTemporal = generarClaveTemporal(this.deps.aleatorio);
    if (!(await this.repo.guardarClave(id, await this.deps.claves.hash(claveTemporal), true))) {
      return null;
    }
    await this.deps.cerrarSesiones(id);
    return claveTemporal;
  }

  async cambiarActivo(id: number, activo: boolean): Promise<boolean> {
    const ok = await this.repo.cambiarActivo(id, activo);
    if (ok && !activo) {
      await this.deps.cerrarSesiones(id);
    }
    return ok;
  }

  // Devuelve la cuenta solo si existe, está activa y la clave es correcta. Quien
  // llama responde siempre con el mismo mensaje genérico.
  async autenticar(ruc: string, clave: string): Promise<CuentaPortal | null> {
    const cuenta = await this.repo.buscarPorRuc(ruc.replace(/\D/g, ''));
    if (!cuenta) {
      await this.deps.claves.simular(clave);
      return null;
    }
    const valida = await this.deps.claves.verificar(cuenta.passwordHash, clave);
    if (!valida || !cuenta.activo) {
      return null;
    }
    await this.repo.registrarIngreso(cuenta.id);
    return publica(cuenta);
  }

  // Cuenta de una sesión abierta; una cuenta desactivada deja de valer al instante.
  async cuentaActiva(id: number): Promise<CuentaPortal | null> {
    const cuenta = await this.repo.buscarPorId(id);
    return cuenta?.activo ? publica(cuenta) : null;
  }

  // En el cambio obligatorio del primer ingreso no se vuelve a pedir la clave
  // temporal (se acaba de escribir para entrar); en un cambio voluntario, sí.
  async cambiarClave(id: number, datos: { actual?: string; nueva: string; confirmacion: string }): Promise<Resultado<CambioClaveError>> {
    const cuenta = await this.repo.buscarPorId(id);
    if (!cuenta?.activo) {
      return { ok: false, error: 'not_found' };
    }
    if (!cuenta.debeCambiarClave && !(await this.deps.claves.verificar(cuenta.passwordHash, datos.actual ?? ''))) {
      return { ok: false, error: 'wrong_password' };
    }
    const error = validarClaveNueva(datos.nueva, datos.confirmacion);
    if (error) {
      return { ok: false, error };
    }
    if (await this.deps.claves.verificar(cuenta.passwordHash, datos.nueva)) {
      return { ok: false, error: 'same_as_old' };
    }
    await this.repo.guardarClave(id, await this.deps.claves.hash(datos.nueva), false);
    return { ok: true };
  }

  // Siempre termina sin error visible: la respuesta no revela si el RUC existe.
  async solicitarEnlace(ruc: string): Promise<void> {
    const cuenta = await this.repo.buscarPorRuc(ruc.replace(/\D/g, ''));
    if (!cuenta?.activo || !cuenta.correo) {
      return;
    }
    const token = this.deps.tokens.nuevo();
    const expira = new Date(this.ahora().getTime() + PORTAL_LIMITES.enlaceMinutos * 60_000);
    await this.repo.guardarToken(cuenta.id, this.deps.tokens.hash(token), expira);
    await this.deps.enviarEnlace(publica(cuenta), `/portal-clientes?restablecer=${encodeURIComponent(token)}`);
  }

  async restablecer(token: string, nueva: string, confirmacion: string): Promise<Resultado<ClaveErrorCode | 'invalid_token'>> {
    // Primero la clave: un error de escritura no debe gastar el enlace.
    const error = validarClaveNueva(nueva, confirmacion);
    if (error) {
      return { ok: false, error };
    }
    const id = token ? await this.repo.consumirToken(this.deps.tokens.hash(token), this.ahora()) : null;
    const cuenta = id === null ? undefined : await this.repo.buscarPorId(id);
    if (!cuenta?.activo) {
      return { ok: false, error: 'invalid_token' };
    }
    await this.repo.guardarClave(cuenta.id, await this.deps.claves.hash(nueva), false);
    await this.deps.cerrarSesiones(cuenta.id);
    return { ok: true };
  }
}
