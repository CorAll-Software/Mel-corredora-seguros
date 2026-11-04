import { useEffect, useState } from 'preact/hooks';
import { CalendarCheck, Check, Globe, LogIn, Menu, X } from 'lucide-preact';
import { EmergencyButton } from './EmergencyButton';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { PAGES } from '../../core/config/navigation.config';
import { useTranslation } from '../../core/i18n/i18n';

const NAV_LINKS = [
  { fragment: 'soluciones', labelKey: 'navbar.linksSolutions' },
  { fragment: 'como-funciona', labelKey: 'navbar.linksHow' },
  { fragment: 'aseguradoras', labelKey: 'navbar.linksInsurers' },
  { fragment: 'sobre-melanie', labelKey: 'navbar.linksWhy' },
  { fragment: 'faq', labelKey: 'navbar.linksFaq' },
] as const;

export default function Navbar() {
  const tr = useTranslation();
  const brand = BRAND_CONFIG;
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onDocClick = () => setLangOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangOpen(false);
        setMenuOpen(false);
      }
    };
    // Al pasar a pantalla grande el menú móvil ya no tiene sentido: se cierra.
    const desktop = window.matchMedia('(min-width: 1025px)');
    const onResize = () => {
      if (desktop.matches) {
        setMenuOpen(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, []);

  // Logo: regreso suave al inicio + saludo de Mepo
  const goHome = (event: MouseEvent) => {
    window.dispatchEvent(new Event('mepo-wave'));
    if (window.location.pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectLang = (code: 'es' | 'en' | 'fr' | 'it') => {
    tr.setLang(code);
    setLangOpen(false);
  };

  // En la barra (también en celular), solo icono como emergencia y agendar; el idioma activo va en una insignia
  const langSelector = () => (
    <div class="navbar__lang" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        class="ico-btn"
        onClick={() => setLangOpen((open) => !open)}
        aria-expanded={langOpen}
        aria-haspopup="listbox"
        aria-label={`${tr.t('navbar.ariaLang')}: ${tr.current.name}`}
      >
        <Globe size={20} />
        <span class="ico-badge" aria-hidden="true">
          {tr.current.shortCode}
        </span>
        <span class="ico-tip" aria-hidden="true">
          {tr.t('navbar.ariaLang')}
        </span>
      </button>

      {langOpen && (
        <div class="navbar__lang-menu" role="listbox" aria-label={tr.t('navbar.ariaLang')}>
          {tr.languages.map((language) => (
            <button
              key={language.code}
              type="button"
              class={`navbar__lang-item${language.code === tr.lang ? ' navbar__lang-item--active' : ''}`}
              onClick={() => selectLang(language.code)}
            >
              <span>{language.name}</span>
              <span class="navbar__lang-code">
                {language.code === tr.lang && <Check size={14} class="navbar__lang-check" />}
                {language.shortCode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <app-top-navbar>
      <header class="navbar-wrap">
        <div class="navbar container">
          <a href="/" class="navbar__brand" aria-label="Inicio" onClick={goHome}>
            {/* TODO-LOGO-MEL: wordmark tipografico mientras llega el logo oficial (issue #19) */}
            <span class="navbar__brand-mark" aria-hidden="true">
              MEL
            </span>
            <span class="navbar__brand-text">
              <span class="navbar__brand-name">{brand.ownerName}</span>
              <span class="navbar__brand-legal">
                {brand.sbsChip}
                <br />
                {brand.sbsChipShort}
              </span>
            </span>
          </a>

          <nav class="navbar__links" aria-label="Navegación principal">
            {NAV_LINKS.map((link) => (
              <a key={link.fragment} href={`/#${link.fragment}`}>
                {tr.t(link.labelKey)}
              </a>
            ))}
          </nav>

          <div class="navbar__actions">
            <EmergencyButton />
            {langSelector()}
            {/* Puerta única a las zonas privadas: portal de empresas y panel de Melanie (#48) */}
            <a href={PAGES.portal} class="ico-btn" aria-label={tr.t('navbar.login')}>
              <LogIn size={20} />
              <span class="ico-tip" aria-hidden="true">
                {tr.t('navbar.login')}
              </span>
            </a>
            <a href="/#agendar" class="ico-btn ico-btn--cta" aria-label={tr.t('navbar.schedule')}>
              <CalendarCheck size={20} />
              <span class="ico-tip" aria-hidden="true">
                {tr.t('navbar.schedule')}
              </span>
            </a>
          </div>

          <button
            type="button"
            class="navbar__burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? tr.t('navbar.closeMenu') : tr.t('navbar.openMenu')}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav class="navbar__mobile" aria-label="Menú móvil">
            {NAV_LINKS.map((link) => (
              <a key={link.fragment} href={`/#${link.fragment}`} onClick={() => setMenuOpen(false)}>
                {tr.t(link.labelKey)}
              </a>
            ))}

            <a href="/#agendar" class="navbar__mobile-cta" onClick={() => setMenuOpen(false)}>
              {tr.t('navbar.schedule')}
            </a>
          </nav>
        )}
      </header>
    </app-top-navbar>
  );
}
