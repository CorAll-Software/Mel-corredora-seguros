import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { FileCheck, KeyRound, TriangleAlert, UserPlus } from 'lucide-preact';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { CLAVE_MENSAJES, esRucValido, PORTAL_LIMITES, validarClaveNueva, type ClaveErrorCode } from '../../core/portal/cuenta';
import { WhatsAppService } from '../../core/services/whatsapp.service';

// Portal de Clientes con acceso real (issue #48): RUC + clave contra
// /api/portal/*, cambio obligatorio de la clave temporal en el primer ingreso
// y "Olvidé mi clave" con enlace de un solo uso por correo.

const year = new Date().getFullYear();

const helpUrl = WhatsAppService.buildGenericUrl('tengo problemas para acceder al portal de clientes.');
const constancyUrl = WhatsAppService.buildGenericUrl('solicito la constancia SCTR vigente para garita de mi empresa.');
const payrollUrl = WhatsAppService.buildGenericUrl(
  'solicito un movimiento (inclusión/exclusión) en la planilla mensual de mi póliza.'
);
const urgentUrl = WhatsAppService.buildUrgentCheckpointUrl();

interface Cuenta {
  ruc: string;
  razonSocial: string;
  contacto: string;
  debeCambiarClave: boolean;
}

type Vista = 'cargando' | 'login' | 'olvide' | 'olvide-enviado' | 'restablecer' | 'cambiar' | 'dentro';

const MENSAJES: Record<string, string> = {
  ...CLAVE_MENSAJES,
  invalid_credentials: 'El RUC o la clave no son correctos.',
  wrong_password: 'La clave actual no es correcta.',
  invalid_token: 'El enlace venció o ya se usó. Pide uno nuevo.',
  rate_limited: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  network: 'No pude conectar con el portal. Inténtalo de nuevo.',
};

async function post(path: string, body: unknown = {}): Promise<{ ok: boolean; status: number; error?: string; cuenta?: Cuenta }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; cuenta?: Cuenta };
    return { ok: res.ok, status: res.status, ...data };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  }
}

const mensaje = (error?: string) => MENSAJES[error ?? 'network'] ?? MENSAJES.network;

function Ayuda() {
  return (
    <p class="login-card__help">
      ¿Problemas de acceso?{' '}
      <a href={helpUrl} target="_blank" rel="noopener noreferrer">
        Escríbeme por WhatsApp
      </a>
    </p>
  );
}

interface FormCardProps {
  title: string;
  lead: string;
  error?: string | null;
  aviso?: string | null;
  submitLabel: string;
  enviando: boolean;
  onSubmit: () => void;
  children?: ComponentChildren;
  extra?: ComponentChildren;
}

// Tarjeta común de los formularios del portal (ingreso, claves, enlace).
function FormCard({ title, lead, error, aviso, submitLabel, enviando, onSubmit, children, extra }: FormCardProps) {
  return (
    <app-login-card>
      <div class="login-card">
        <h1>{title}</h1>
        <p class="login-card__lead">{lead}</p>
        {aviso && (
          <p class="login-card__ok" role="status">
            {aviso}
          </p>
        )}
        {error && (
          <p class="portal__error" role="alert">
            {error}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!enviando) onSubmit();
          }}
          noValidate
        >
          {children}
          <Button variant="primary" type="submit" block disabled={enviando}>
            {enviando ? 'Un momento…' : submitLabel}
          </Button>
        </form>
        {extra}
        <Ayuda />
      </div>
    </app-login-card>
  );
}

function ClaveInput({ id, label, value, onInput, autocomplete }: { id: string; label: string; value: string; onInput: (v: string) => void; autocomplete: string }) {
  return (
    <FormField label={label} inputId={id}>
      <input
        id={id}
        type="password"
        autocomplete={autocomplete}
        maxLength={PORTAL_LIMITES.claveMax}
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
      />
    </FormField>
  );
}

function ExpressDownload({ cuenta, aviso, onLogout, onCambiarClave }: { cuenta: Cuenta; aviso: string | null; onLogout: () => void; onCambiarClave: () => void }) {
  return (
    <app-express-download>
      <div class="express">
        <header class="express__head">
          <div>
            <h1>Autogestión</h1>
            <p>
              {cuenta.razonSocial} · RUC {cuenta.ruc}
            </p>
          </div>
          <div class="express__session">
            <Button variant="outline" type="button" onPressed={onCambiarClave}>
              <KeyRound size={18} /> Cambiar mi clave
            </Button>
            <Button variant="outline" type="button" onPressed={onLogout}>
              Cerrar sesión
            </Button>
          </div>
        </header>
        {aviso && (
          <p class="express__ok" role="status">
            {aviso}
          </p>
        )}

        <div class="express__grid">
          <Card>
            <article class="access">
              <span class="access__icon" aria-hidden="true">
                <FileCheck size={30} />
              </span>
              <h2>Constancia SCTR vigente</h2>
              <p>Descarga la última constancia emitida para presentación en garitas de ingreso.</p>
              <Button variant="primary" href={constancyUrl} target="_blank" block>
                Descargar express
              </Button>
            </article>
          </Card>
          <Card>
            <article class="access">
              <span class="access__icon" aria-hidden="true">
                <UserPlus size={30} />
              </span>
              <h2>Movimientos de planilla</h2>
              <p>Solicitud de inclusión o exclusión de trabajadores en la nómina mensual del seguro.</p>
              <Button variant="outline" href={payrollUrl} target="_blank" block>
                Solicitar movimiento
              </Button>
            </article>
          </Card>
          <Card>
            <article class="access access--urgent">
              <span class="access__icon" aria-hidden="true">
                <TriangleAlert size={30} />
              </span>
              <h2>Incidencias en garita</h2>
              <p>Canal prioritario cuando hay un problema con el pase de ingreso de tu personal en obra.</p>
              <Button variant="whatsapp" href={urgentUrl} target="_blank" block>
                Atención prioritaria
              </Button>
            </article>
          </Card>
        </div>
      </div>
    </app-express-download>
  );
}

export default function PortalClientes() {
  const brand = BRAND_CONFIG;

  const [vista, setVista] = useState<Vista>('cargando');
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [token, setToken] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [ruc, setRuc] = useState('');
  const [clave, setClave] = useState('');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const ir = (siguiente: Vista, conAviso: string | null = null) => {
    setVista(siguiente);
    setError(null);
    setAviso(conAviso);
    setClave('');
    setActual('');
    setNueva('');
    setConfirmacion('');
  };

  useEffect(() => {
    // El enlace del correo trae ?restablecer=<token>. Se quita de la barra de
    // direcciones para que no quede en el historial.
    const params = new URLSearchParams(window.location.search);
    const enlace = params.get('restablecer');
    if (enlace) {
      setToken(enlace);
      window.history.replaceState(null, '', window.location.pathname);
      setVista('restablecer');
      return;
    }
    fetch('/api/portal/sesion')
      .then((res) => (res.ok ? (res.json() as Promise<{ cuenta: Cuenta }>) : null))
      .then((data) => {
        if (data?.cuenta) {
          setCuenta(data.cuenta);
          setVista(data.cuenta.debeCambiarClave ? 'cambiar' : 'dentro');
        } else {
          setVista('login');
        }
      })
      .catch(() => setVista('login'));
  }, []);

  const enviar = async (accion: () => Promise<void>) => {
    setEnviando(true);
    setError(null);
    await accion();
    setEnviando(false);
  };

  const rucInput = (
    <FormField label="RUC de la empresa (11 dígitos)" inputId="portal-ruc">
      <input
        id="portal-ruc"
        name="ruc"
        inputMode="numeric"
        autocomplete="username"
        maxLength={11}
        placeholder="20123456789"
        value={ruc}
        onInput={(e) => {
          const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 11);
          e.currentTarget.value = value;
          setRuc(value);
        }}
      />
    </FormField>
  );

  const rucOk = () => {
    if (esRucValido(ruc)) return true;
    setError('Revisa el RUC: son 11 dígitos y empieza con 10, 15, 17 o 20.');
    return false;
  };

  const claveOk = (anterior?: string) => {
    const codigo: ClaveErrorCode | null = validarClaveNueva(nueva, confirmacion, anterior);
    if (codigo) setError(CLAVE_MENSAJES[codigo]);
    return codigo === null;
  };

  const ingresar = () =>
    enviar(async () => {
      if (!rucOk()) return;
      if (!clave) {
        setError('Escribe tu clave.');
        return;
      }
      const res = await post('/api/portal/login', { ruc, clave });
      if (res.ok && res.cuenta) {
        setCuenta(res.cuenta);
        ir(res.cuenta.debeCambiarClave ? 'cambiar' : 'dentro');
      } else {
        setError(mensaje(res.error));
      }
    });

  const cambiarClave = () =>
    enviar(async () => {
      const forzado = cuenta?.debeCambiarClave ?? false;
      if (!forzado && !actual) {
        setError('Escribe tu clave actual.');
        return;
      }
      if (!claveOk(forzado ? undefined : actual)) return;
      const res = await post('/api/portal/clave', { actual: forzado ? undefined : actual, nueva, confirmacion });
      if (res.ok) {
        setCuenta((c) => c && { ...c, debeCambiarClave: false });
        ir('dentro', 'Listo, tu clave se actualizó.');
      } else if (res.status === 401) {
        setCuenta(null);
        ir('login');
      } else {
        setError(mensaje(res.error));
      }
    });

  const pedirEnlace = () =>
    enviar(async () => {
      if (!rucOk()) return;
      const res = await post('/api/portal/olvide', { ruc });
      if (res.ok) ir('olvide-enviado');
      else setError(mensaje(res.error));
    });

  const restablecer = () =>
    enviar(async () => {
      if (!claveOk()) return;
      const res = await post('/api/portal/restablecer', { token, nueva, confirmacion });
      if (res.ok) {
        setToken('');
        ir('login', 'Listo, tu clave se actualizó. Ingresa con tu RUC y la clave nueva.');
      } else {
        setError(mensaje(res.error));
      }
    });

  const salir = async () => {
    await post('/api/portal/logout');
    setCuenta(null);
    ir('login');
  };

  const enlace = (texto: string, destino: Vista) => (
    <button type="button" class="login-card__link" onClick={() => ir(destino)}>
      {texto}
    </button>
  );

  const clavesNuevas = (
    <>
      <ClaveInput id="portal-nueva" label={`Clave nueva (mínimo ${PORTAL_LIMITES.claveMin}, con letras y números)`} value={nueva} onInput={setNueva} autocomplete="new-password" />
      <ClaveInput id="portal-confirmacion" label="Repite la clave nueva" value={confirmacion} onInput={setConfirmacion} autocomplete="new-password" />
    </>
  );

  let contenido: ComponentChildren;
  switch (vista) {
    case 'cargando':
      contenido = <p class="portal__loading">Cargando…</p>;
      break;
    case 'login':
      contenido = (
        <FormCard
          title="Portal de Clientes"
          lead="Autogestión de constancias y pólizas SCTR. Acceso exclusivo para empresas aseguradas."
          error={error}
          aviso={aviso}
          submitLabel="Ingresar al portal"
          enviando={enviando}
          onSubmit={ingresar}
          extra={<p class="login-card__help">{enlace('Olvidé mi clave', 'olvide')}</p>}
        >
          {rucInput}
          <ClaveInput id="portal-clave" label="Clave" value={clave} onInput={setClave} autocomplete="current-password" />
        </FormCard>
      );
      break;
    case 'olvide':
      contenido = (
        <FormCard
          title="Olvidé mi clave"
          lead="Escribe el RUC de tu empresa. Te envío un enlace al correo registrado para crear una clave nueva."
          error={error}
          submitLabel="Enviarme el enlace"
          enviando={enviando}
          onSubmit={pedirEnlace}
          extra={<p class="login-card__help">{enlace('Volver a ingresar', 'login')}</p>}
        >
          {rucInput}
        </FormCard>
      );
      break;
    case 'olvide-enviado':
      contenido = (
        <app-login-card>
          <div class="login-card">
            <h1>Revisa tu correo</h1>
            <p class="login-card__lead">
              Si el RUC tiene una cuenta con correo registrado, te envié un enlace para crear una clave nueva. Sirve una sola vez y vence en{' '}
              {PORTAL_LIMITES.enlaceMinutos} minutos. Si tu cuenta no tiene correo, escríbeme y te doy una clave temporal.
            </p>
            <p class="login-card__help">{enlace('Volver a ingresar', 'login')}</p>
            <Ayuda />
          </div>
        </app-login-card>
      );
      break;
    case 'restablecer':
      contenido = (
        <FormCard
          title="Crea tu clave nueva"
          lead="Elige una clave que solo conozcas tú."
          error={error}
          submitLabel="Guardar clave"
          enviando={enviando}
          onSubmit={restablecer}
          extra={error === MENSAJES.invalid_token ? <p class="login-card__help">{enlace('Pedir un enlace nuevo', 'olvide')}</p> : null}
        >
          {clavesNuevas}
        </FormCard>
      );
      break;
    case 'cambiar': {
      const forzado = cuenta?.debeCambiarClave ?? false;
      contenido = (
        <FormCard
          title={forzado ? 'Crea tu clave' : 'Cambiar mi clave'}
          lead={
            forzado
              ? `Hola, ${cuenta?.razonSocial}. Entraste con una clave temporal: crea una propia para continuar.`
              : 'Escribe tu clave actual y elige una nueva.'
          }
          error={error}
          submitLabel="Guardar clave"
          enviando={enviando}
          onSubmit={cambiarClave}
          extra={
            <p class="login-card__help">
              {forzado ? (
                <button type="button" class="login-card__link" onClick={salir}>
                  Cerrar sesión
                </button>
              ) : (
                enlace('Cancelar', 'dentro')
              )}
            </p>
          }
        >
          {!forzado && <ClaveInput id="portal-actual" label="Clave actual" value={actual} onInput={setActual} autocomplete="current-password" />}
          {clavesNuevas}
        </FormCard>
      );
      break;
    }
    case 'dentro':
      contenido = cuenta && <ExpressDownload cuenta={cuenta} aviso={aviso} onLogout={salir} onCambiarClave={() => ir('cambiar')} />;
      break;
  }

  return (
    <app-portal-clientes>
      <div class="portal">
        <header class="portal__bar">
          {/* Mismo logo MEL del navbar: wordmark + nombre completo y registro SBS (lineamiento SBS) */}
          <a href="/" class="portal__brand" aria-label="Volver al inicio">
            <span class="portal__mark" aria-hidden="true">MEL</span>
            <span class="portal__brand-text">
              <span class="portal__brand-name">{brand.ownerName}</span>
              <span class="portal__license">
                {brand.sbsChip}
                <br />
                {brand.sbsChipShort}
              </span>
            </span>
          </a>
          <span class="portal__badge">{brand.supervisionBadge}</span>
        </header>

        <main class="portal__main">{vista === 'dentro' ? contenido : <div class="portal__login">{contenido}</div>}</main>

        <footer class="portal__footer">
          <p>
            © {year} {brand.brandName} — {brand.roleTitle}. {brand.contact.email} · {brand.contact.phone}
          </p>
        </footer>
      </div>
    </app-portal-clientes>
  );
}
