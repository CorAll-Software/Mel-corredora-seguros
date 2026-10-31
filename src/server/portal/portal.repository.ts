import type { CuentaInput, CuentaPortal } from '../../core/portal/cuenta';

// Puerto de persistencia del portal de clientes. El caso de uso
// (portal.service.ts) depende de esta interfaz, no de Drizzle.

export interface CuentaConClave extends CuentaPortal {
  passwordHash: string;
}

export interface PortalRepository {
  crear(datos: CuentaInput, passwordHash: string, adminId: number | null): Promise<CuentaPortal>;
  buscarPorRuc(ruc: string): Promise<CuentaConClave | undefined>;
  buscarPorId(id: number): Promise<CuentaConClave | undefined>;
  // Más recientes primero.
  listar(): Promise<CuentaPortal[]>;
  guardarClave(id: number, passwordHash: string, debeCambiar: boolean): Promise<boolean>;
  cambiarActivo(id: number, activo: boolean): Promise<boolean>;
  registrarIngreso(id: number): Promise<void>;

  // Enlaces de "Olvidé mi clave". Guardar uno nuevo anula los anteriores.
  guardarToken(clienteId: number, tokenHash: string, expiraEn: Date): Promise<void>;
  // Marca el token como usado si existe, no se usó y no venció; devuelve el cliente.
  consumirToken(tokenHash: string, ahora: Date): Promise<number | null>;
}
