import { useEffect, useState } from 'preact/hooks';
import { MepoWelcome } from '../landing/MepoWelcome';
import { Hero } from '../landing/Hero';
import { SolutionsCarousel } from '../landing/SolutionsCarousel';
import { RiskManagementBlock } from '../landing/RiskManagementBlock';
import { HowItWorks } from '../landing/HowItWorks';
import { InsurerLogoStrip } from '../landing/InsurerLogoStrip';
import { WhyMelanie } from '../landing/WhyMelanie';
import { AppointmentScheduler } from '../landing/AppointmentScheduler';
import { FaqChat } from '../landing/FaqChat';
import { ServiceDetailModal } from '../landing/ServiceDetailModal';
import { useTranslation } from '../../core/i18n/i18n';
import { LANDING_FAQS_DATA } from '../../core/data/landing.data';
import type { AudienceCategory, ServiceDetail } from '../../core/models/insurance-service.model';

export default function LandingPage() {
  const tr = useTranslation();
  const [activeTab, setActiveTab] = useState<AudienceCategory>('empresas');
  const [detail, setDetail] = useState<ServiceDetail | null>(null);

  // Animación de aparición de las secciones al avanzar y volver con el scroll
  // (IntersectionObserver): entran con fade+slide, salen y se re-animan al regresar.
  // Las secciones se montan/desmontan con la pestaña activa -> dependencia activeTab.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('reveal--visible', entry.isIntersecting);
        }
      },
      // Margen interno: dispara cuando la sección entra al 88% visible de la pantalla
      { rootMargin: '-12% 0px -12% 0px', threshold: 0 }
    );
    const sections = document.querySelectorAll<HTMLElement>(
      'app-landing section[id], app-landing .welcome, app-landing .risk__broker'
    );
    for (const section of sections) {
      section.classList.add('reveal');
      observer.observe(section);
    }

    // El Hero asoma en la pantalla inicial (la bienvenida no la llena): con el
    // observer general quedaria revelado al instante y nunca animaria al bajar.
    // Histéresis propia: anima al cruzar 25% visible (bajando o subiendo) y solo
    // se oculta cuando sale por completo de pantalla.
    const hero = document.querySelector<HTMLElement>('app-landing .hero');
    const heroObserver = hero
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.intersectionRatio >= 0.249) {
                hero.classList.add('reveal--visible');
              } else if (!entry.isIntersecting) {
                hero.classList.remove('reveal--visible');
              }
            }
          },
          { threshold: [0, 0.25] }
        )
      : null;
    if (hero && heroObserver) {
      hero.classList.add('reveal');
      heroObserver.observe(hero);
    }

    return () => {
      observer.disconnect();
      heroObserver?.disconnect();
    };
  }, [activeTab]);

  const faqs = LANDING_FAQS_DATA.map((_, index) => ({
    question: tr.t(`faq.q${index + 1}`),
    answer: tr.t(`faq.a${index + 1}`),
  }));

  return (
    <app-landing>
      <MepoWelcome />

      <Hero activeTab={activeTab} onTabChange={setActiveTab} />

      <SolutionsCarousel activeTab={activeTab} onDetailPressed={setDetail} />

      {/* Área de Riesgos Virtual (feedback §5, issue #15): solo con la pestaña Empresas activa */}
      <RiskManagementBlock activeTab={activeTab} />

      <HowItWorks />

      <InsurerLogoStrip />

      <WhyMelanie />

      <AppointmentScheduler />

      <section class="section screen landing-faq" id="faq">
        <FaqChat faqs={faqs} />
      </section>

      {detail && <ServiceDetailModal service={detail} onClose={() => setDetail(null)} />}
    </app-landing>
  );
}
