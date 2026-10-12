export type SearchSaveState = { local: boolean; cloud: 'pending' | 'saved' | 'failed' | 'unavailable' };

export function searchSaveFeedback(state: SearchSaveState): { warning: boolean; message: string } {
  if (state.cloud === 'pending') return {
    warning: !state.local,
    message: state.local ? 'Guardado en este navegador. Guardando en tu espacio de trabajo…'
      : 'El navegador no pudo guardar todos los datos. Guardando en tu espacio de trabajo…',
  };
  if (state.cloud === 'saved') return {
    warning: !state.local,
    message: state.local ? 'Consultas e historial guardados en este navegador y en tu espacio de trabajo.'
      : 'Consultas e historial guardados en tu espacio de trabajo. El navegador no pudo conservar todos los datos localmente.',
  };
  if (!state.local) return { warning: true, message: 'Los resultados se recibieron, pero no se confirmó su guardado completo. Podrían perderse al recargar. Volvé a cargar el período cuando se restablezca el almacenamiento.' };
  return {
    warning: state.cloud === 'failed',
    message: state.cloud === 'failed'
      ? 'Consultas e historial guardados solo en este navegador. Supabase no pudo guardarlos en tu espacio de trabajo; no están confirmados para otro equipo. Volvé a cargar el período para reintentar.'
      : 'Consultas e historial guardados solo en este navegador. El guardado en un espacio de trabajo no está disponible en esta sesión.',
  };
}
