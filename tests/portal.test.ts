import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  esRucValido,
  generarClaveTemporal,
  validarClaveNueva,
  validarCuenta,
  type CuentaInput,
  type CuentaPortal,
} from '../src/core/portal/cuenta';
import type { CuentaConClave, PortalRepository } from '../src/server/portal/portal.repository';
import { PortalService } from '../src/server/portal/portal.service';

// Pruebas del portal de clientes (issue #48) con repositorio en memoria y
// "hash" de mentira: los casos de uso no dependen de la base ni de argon2.

class MemoriaPortalRepository implements PortalRepository {
  cuentas = new Map<number, CuentaConClave>();
  tokens: { clienteId: number; tokenHash: string; expiraEn: Date; usado: boolean }[] = [];
  private next = 1;

  async crear(datos: CuentaInput, passwordHash: string) {
    const cuenta: CuentaConClave = {
      ...datos,
      id: this.next++,
      passwordHash,
      debeCambiarClave: true,
      activo: true,
      ultimoIngreso: null,
      createdAt: new Date(),
    };
    this.cuentas.set(cuenta.id, cuenta);
    const { passwordHash: _h, ...publica } = cuenta;
    return publica as CuentaPortal;
  }
  async buscarPorRuc(ruc: string) {
    return [...this.cuentas.values()].find((c) => c.ruc === ruc);
  }
  async buscarPorId(id: number) {
    return this.cuentas.get(id);
  }
  async listar() {
    return [...this.cuentas.values()].reverse();
  }
  async guardarClave(id: number, passwordHash: string, debeCambiar: boolean) {
    const c = this.cuentas.get(id);
    if (!c) return false;
    Object.assign(c, { passwordHash, debeCambiarClave: debeCambiar });
    return true;
  }
  async cambiarActivo(id: number, activo: boolean) {
    const c = this.cuentas.get(id);
    if (!c) return false;
    c.activo = activo;
    return true;
  }
  async registrarIngreso(id: number) {
    this.cuentas.get(id)!.ultimoIngreso = new Date();
  }
  async guardarToken(clienteId: number, tokenHash: string, expiraEn: Date) {
    this.tokens = this.tokens.filter((t) => t.clienteId !== clienteId);
    this.tokens.push({ clienteId, tokenHash, expiraEn, usado: false });
  }
  async consumirToken(tokenHash: string, ahora: Date) {
    const t = this.tokens.find((x) => x.tokenHash === tokenHash && !x.usado && x.expiraEn > ahora);
    if (!t) return null;
    t.usado = true;
    return t.clienteId;
  }
}

const DATOS = { ruc: '20123456789', razonSocial: 'Constructora Andina SAC', contacto: 'Rosa Quispe', correo: 'rosa@andina.pe' };

let repo: MemoriaPortalRepository;
let service: PortalService;
let sesionesCerradas: number[];
let enlaces: string[];
let ahora: Date;
let tokenSeq: number;

beforeEach(() => {
  repo = new MemoriaPortalRepository();
  sesionesCerradas = [];
  enlaces = [];
  ahora = new Date('2026-11-02T10:00:00Z');
  tokenSeq = 0;
  let semilla = 7;
  service = new PortalService(repo, {
    claves: {
      hash: async (c) => `h:${c}`,
      verificar: async (h, c) => h === `h:${c}`,
      simular: async () => false,
    },
    tokens: { nuevo: () => `tok${++tokenSeq}`, hash: (t) => `th:${t}` },
    cerrarSesiones: async (id) => {
      sesionesCerradas.push(id);
    },
    enviarEnlace: async (_c, path) => {
      enlaces.push(path);
    },
    aleatorio: (max) => (semilla = (semilla * 31 + 11) % 997) % max,
    ahora: () => ahora,
  });
});

async function crearCuenta() {
  const r = await service.crear(DATOS, 1);
  assert.ok(r.ok);
  return r;
}

describe('validaciones del dominio', () => {
  it('valida RUC, datos de la cuenta y claves', () => {
    assert.ok(esRucValido('20123456789'));
    assert.ok(!esRucValido('30123456789'));
    assert.ok(!esRucValido('2012345678'));
    const r = validarCuenta({ ruc: '20-123456789', razonSocial: ' A  B ', contacto: '', correo: 'malo' });
    assert.deepEqual(!r.ok && r.errores, { contacto: 'required', correo: 'invalid' });
    assert.equal(validarClaveNueva('corta1', 'corta1'), 'too_short');
    assert.equal(validarClaveNueva('solotexto', 'solotexto'), 'weak');
    assert.equal(validarClaveNueva('clave1234', 'clave1235'), 'mismatch');
    assert.equal(validarClaveNueva('clave1234', 'clave1234'), null);
  });

  it('la clave temporal combina letras y números sin caracteres confusos', () => {
    const clave = generarClaveTemporal((max) => Math.floor(Math.random() * max));
    assert.equal(clave.length, 10);
    assert.match(clave, /[a-zA-Z]/);
    assert.match(clave, /\d/);
    assert.doesNotMatch(clave, /[01OolI]/);
  });
});

describe('PortalService', () => {
  it('crea la cuenta con clave temporal y no repite RUC', async () => {
    const r = await crearCuenta();
    assert.ok(r.cuenta.debeCambiarClave);
    assert.equal(repo.cuentas.get(r.cuenta.id)!.passwordHash, `h:${r.claveTemporal}`);
    const repetida = await service.crear(DATOS, 1);
    assert.deepEqual(!repetida.ok && repetida.errores, { ruc: 'taken' });
  });

  it('un RUC sin cuenta, una clave incorrecta o una cuenta desactivada no entran', async () => {
    const { cuenta, claveTemporal } = await crearCuenta();
    assert.equal(await service.autenticar('20999999999', claveTemporal), null);
    assert.equal(await service.autenticar(DATOS.ruc, 'otra-clave'), null);
    assert.equal((await service.autenticar(DATOS.ruc, claveTemporal))?.id, cuenta.id);

    assert.ok(await service.cambiarActivo(cuenta.id, false));
    assert.deepEqual(sesionesCerradas, [cuenta.id]);
    assert.equal(await service.autenticar(DATOS.ruc, claveTemporal), null);
    assert.equal(await service.cuentaActiva(cuenta.id), null);
  });

  it('cambio obligatorio en el primer ingreso y cambio voluntario con la clave actual', async () => {
    const { cuenta, claveTemporal } = await crearCuenta();
    // Primer ingreso: no pide la temporal, pero no deja reutilizarla.
    assert.deepEqual(await service.cambiarClave(cuenta.id, { nueva: claveTemporal, confirmacion: claveTemporal }), { ok: false, error: 'same_as_old' });
    assert.deepEqual(await service.cambiarClave(cuenta.id, { nueva: 'MiClave2026', confirmacion: 'MiClave2026' }), { ok: true });
    assert.equal(repo.cuentas.get(cuenta.id)!.debeCambiarClave, false);
    assert.equal(await service.autenticar(DATOS.ruc, claveTemporal), null);
    assert.ok(await service.autenticar(DATOS.ruc, 'MiClave2026'));

    // Después ya exige la clave actual.
    assert.deepEqual(await service.cambiarClave(cuenta.id, { nueva: 'OtraClave9', confirmacion: 'OtraClave9' }), { ok: false, error: 'wrong_password' });
    assert.deepEqual(await service.cambiarClave(cuenta.id, { actual: 'MiClave2026', nueva: 'OtraClave9', confirmacion: 'OtraClave9' }), { ok: true });
  });

  it('el enlace de "Olvidé mi clave" sirve una vez, vence y cierra sesiones', async () => {
    const { cuenta } = await crearCuenta();
    await service.solicitarEnlace('20999999999');
    assert.equal(enlaces.length, 0);

    await service.solicitarEnlace(DATOS.ruc);
    assert.deepEqual(enlaces, ['/portal-clientes?restablecer=tok1']);

    // Un error de escritura no gasta el enlace.
    assert.deepEqual(await service.restablecer('tok1', 'corta', 'corta'), { ok: false, error: 'too_short' });
    assert.deepEqual(await service.restablecer('tok1', 'Nueva2026x', 'Nueva2026x'), { ok: true });
    assert.deepEqual(sesionesCerradas, [cuenta.id]);
    assert.ok(await service.autenticar(DATOS.ruc, 'Nueva2026x'));
    assert.deepEqual(await service.restablecer('tok1', 'Otra2026xx', 'Otra2026xx'), { ok: false, error: 'invalid_token' });

    // Vencido a los 60 minutos.
    await service.solicitarEnlace(DATOS.ruc);
    ahora = new Date(ahora.getTime() + 61 * 60_000);
    assert.deepEqual(await service.restablecer('tok2', 'Otra2026xx', 'Otra2026xx'), { ok: false, error: 'invalid_token' });
  });

  it('sin correo o desactivada no se envía enlace; Melanie puede dar otra clave temporal', async () => {
    const r = await service.crear({ ...DATOS, correo: '' }, 1);
    assert.ok(r.ok);
    await service.solicitarEnlace(DATOS.ruc);
    assert.equal(enlaces.length, 0);

    const nueva = await service.nuevaClaveTemporal(r.cuenta.id);
    assert.ok(nueva && nueva !== r.claveTemporal);
    assert.equal(await service.autenticar(DATOS.ruc, r.claveTemporal), null);
    assert.equal((await service.autenticar(DATOS.ruc, nueva))?.debeCambiarClave, true);
    assert.equal(await service.nuevaClaveTemporal(999), null);
  });
});
