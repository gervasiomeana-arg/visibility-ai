export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Keep context bounded and accept only conversational roles, never system instructions.
export function normalizeAssistantHistory(value: unknown): AssistantTurn[] {
  if (!Array.isArray(value)) return [];
  return value.filter((turn): turn is AssistantTurn =>
    turn && (turn.role === 'user' || turn.role === 'assistant') &&
    typeof turn.content === 'string' && turn.content.trim().length > 0
  ).slice(-12).map((turn) => ({ role: turn.role, content: turn.content.slice(0, 4000) }));
}

export function h1Fallback(
  prompt: string,
  history: AssistantTurn[],
  items: Array<{ key?: string; metricValue?: string; status?: string }> = [],
): string | null {
  const normalizedHistory = normalizeAssistantHistory(history);
  const userText = [...normalizedHistory.filter((turn) => turn.role === 'user').map((turn) => turn.content), prompt].join('\n');
  if (!/h1|encabezado/i.test(userText)) return null;
  if (!/h1|encabezado|primer paso|paso sencillo|sin modificar|sin cambiar|recomendación|recomendacion|este hallazgo|comprobarlo/i.test(prompt)) return null;

  const confirmations = userText.split('\n').filter((line) =>
    /(?:h1.*(?:ya existe|sí existe|si existe|existe en|encontré|encontre))|(?:(?:encontré|encontre).*?(?:coincidencia|h1))/i.test(line) &&
    !/no (?:existe|encontré|encontre)|no hay/i.test(line)
  );
  const renderedConfirmed = confirmations.length > 0;
  const finding = items.find((item) => item.key === 'h1');
  const measured = finding?.metricValue
    ? `La última auditoría registró: ${finding.metricValue}. Esa prueba analiza el HTML inicial, sin ejecutar JavaScript.`
    : 'No tengo una medición de H1 en la última auditoría disponible; no puedo afirmar que falte.';

  if (/primer paso|paso sencillo|sin modificar|sin cambiar/i.test(prompt)) {
    return renderedConfirmed
      ? 'Como ya confirmaste que el H1 existe en la página renderizada, el primer paso es copiar su texto desde Inspeccionar para revisar si describe la actividad. No modifiques nada ni agregues otro H1.'
      : 'Sin modificar nada: abrí la página, hacé clic derecho → Inspeccionar y, en Elements / Elementos, presioná Ctrl + F y buscá //h1. Decime cuántas coincidencias aparecen y qué texto tienen. Esto comprueba la página renderizada, que puede diferir del HTML inicial de la auditoría.';
  }

  if (renderedConfirmed) {
    return `Según tu comprobación, el H1 existe en la página renderizada. No agregues otro encabezado para resolver el resultado de la auditoría.\n\n${measured}\n\nLa recomendación cambia: revisar el texto del H1 existente y comprobar el HTML renderizado en la Inspección de URLs de Search Console. La ausencia en el HTML inicial no demuestra que Google no pueda leerlo. Tampoco demuestra que el H1 o JavaScript causen tiempos FCP/LCP elevados. Evaluar renderizado en servidor requiere confirmar la tecnología y el problema antes de proponer cambios.`;
  }

  return `${measured}\n\nAntes de cambiar el sitio, comprobá si el H1 existe en la página renderizada: clic derecho → Inspeccionar → Elements / Elementos → Ctrl + F → //h1. Si aparece, revisá su texto; si no aparece, evaluá agregar un título principal visible que describa la actividad confirmada. No puedo atribuir problemas de indexación ni lentitud a este hallazgo por sí solo.`;
}
