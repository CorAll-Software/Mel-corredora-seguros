// Contadores del inicio del panel. Un contador en null significa que ese módulo
// todavía no está disponible (se activa con su issue del hito m5-demo-funcional).
export interface PanelCounters {
  recomendacionesPendientes: number | null;
  solicitudesNuevas: number | null;
}

export const PanelRepository = {
  async counters(): Promise<PanelCounters> {
    return {
      recomendacionesPendientes: null,
      solicitudesNuevas: null,
    };
  },
};
