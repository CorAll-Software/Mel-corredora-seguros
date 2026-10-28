import { useEffect, useRef, useState } from 'preact/hooks';
import { FileCheck, TriangleAlert, UserPlus } from 'lucide-preact';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { WhatsAppService } from '../../core/services/whatsapp.service';

const year = new Date().getFullYear();

const helpUrl = WhatsAppService.buildGenericUrl('tengo problemas para acceder al portal de clientes.');
const constancyUrl = WhatsAppService.buildGenericUrl('solicito la constancia SCTR vigente para garita de mi empresa.');
const payrollUrl = WhatsAppService.buildGenericUrl(
  'solicito un movimiento (inclusión/exclusión) en la planilla mensual de mi póliza.'
);
const urgentUrl = WhatsAppService.buildUrgentCheckpointUrl();

interface LoginCardProps {
  ruc: string;
  access: string;
  rucError: string | null;
  accessError: string | null;
  onRucChange: (value: string) => void;
  onAccessChange: (value: string) => void;
  onSubmit: (data: { ruc: string; access: string }) => void;
}

function LoginCard({ ruc, access, rucError, accessError, onRucChange, onAccessChange, onSubmit }: LoginCardProps) {
  const onRucInput = (event: Event) => {
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value.replace(/\D/g, '').slice(0, 11);
    inputEl.value = value;
    onRucChange(value);
  };

  return (
    <app-login-card>
      <div class="login-card">
        <h1>Portal de Clientes</h1>
        <p class="login-card__lead">
          Autogestión de constancias y pólizas SCTR. Acceso exclusivo para empresas aseguradas.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ ruc, access });
          }}
          noValidate
        >
          <FormField label="RUC de la empresa (11 dígitos)" inputId="portal-ruc" error={rucError}>
            <input
              id="portal-ruc"
              name="ruc"
              inputMode="numeric"
              maxLength={11}
              placeholder="20123456789"
              value={ruc}
              onInput={onRucInput}
            />
          </FormField>
          <FormField
            label="DNI del contacto registrado (8 dígitos) o contraseña corporativa"
            inputId="portal-access"
            error={accessError}
          >
            <input
              id="portal-access"
              name="access"
              type="password"
              placeholder="••••••••"
              value={access}
              onInput={(e) => onAccessChange(e.currentTarget.value)}
            />
          </FormField>
          <Button variant="primary" type="submit" block>
            Ingresar al portal
          </Button>
        </form>
        <p class="login-card__help">
          ¿Problemas de acceso?{' '}
          <a href={helpUrl} target="_blank" rel="noopener noreferrer">
            Escríbeme por WhatsApp
          </a>
        </p>
      </div>
    </app-login-card>
  );
}

function ExpressDownload({ ruc, onLogout }: { ruc: string; onLogout: () => void }) {
  return (
    <app-express-download>
      <div class="express">
        <header class="express__head">
          <div>
            <h1>Autogestión</h1>
            <p>Empresa RUC {ruc} · Acceso activo con la corredora.</p>
          </div>
          <Button variant="outline" type="button" onPressed={onLogout}>
            Cerrar sesión
          </Button>
        </header>

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

  const [ruc, setRuc] = useState('');
  const [access, setAccess] = useState('');
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rucError, setRucError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (loginTimer.current !== null) {
        window.clearTimeout(loginTimer.current);
      }
    },
    []
  );

  const onLogin = ({ ruc: rucValue, access: accessValue }: { ruc: string; access: string }) => {
    setRucError(null);
    setAccessError(null);
    setLoginError(null);

    const rucValido = /^\d{11}$/.test(rucValue) && (rucValue.startsWith('10') || rucValue.startsWith('20'));
    if (!rucValido) {
      setRucError('RUC inválido: requiere 11 dígitos e iniciar con 10 o 20.');
      return;
    }
    const isDni = /^\d{8}$/.test(accessValue);
    if (!isDni && accessValue.trim().length < 8) {
      setAccessError('Ingresa un DNI de 8 dígitos o tu contraseña corporativa.');
      return;
    }

    // Login demostrativo: la autenticación real invocará al backend de autogestión.
    setLoading(true);
    loginTimer.current = window.setTimeout(() => {
      setLoading(false);
      setSession(true);
    }, 600);
  };

  const logout = () => {
    setSession(false);
    setAccess('');
  };

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

        <main class="portal__main">
          {!session ? (
            <div class="portal__login">
              {loginError && (
                <p class="portal__error" role="alert">
                  {loginError}
                </p>
              )}
              {loading ? (
                <p class="portal__loading">Validando credenciales…</p>
              ) : (
                <LoginCard
                  ruc={ruc}
                  access={access}
                  rucError={rucError}
                  accessError={accessError}
                  onRucChange={setRuc}
                  onAccessChange={setAccess}
                  onSubmit={onLogin}
                />
              )}
            </div>
          ) : (
            <ExpressDownload ruc={ruc} onLogout={logout} />
          )}
        </main>

        <footer class="portal__footer">
          <p>
            © {year} {brand.brandName} — {brand.roleTitle}. {brand.contact.email} · {brand.contact.phone}
          </p>
        </footer>
      </div>
    </app-portal-clientes>
  );
}
