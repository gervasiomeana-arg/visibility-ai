import type { SeoAuditItem } from '../src/types';

export function h1Guidance(metric?: string) {
  const match = metric?.match(/\b(\d+)\s+(?:H1\b|etiquetas\b)/i);
  const count = match ? Number(match[1]) : null;
  const whyItMatters = 'El encabezado principal ayuda a comprender el tema de la página y su estructura.';
  const howToVerify = 'Abrir Inspeccionar, buscar //h1 en Elementos y revisar el texto y la cantidad. Comparar con Ver código fuente para distinguir la página renderizada del HTML inicial.';
  const proposedChange = count === 1
    ? 'Revisar que el H1 existente describa la actividad confirmada de este negocio. No agregar otro por este hallazgo.'
    : count !== null && count > 1
    ? 'Revisar el texto y la jerarquía de los H1 detectados según el contenido de esta página. No tratar este resultado como ausencia de H1.'
    : 'Comprobar primero si existe un H1 en la página renderizada. Si existe, revisar su texto y no agregar otro. Solo si falta, proponer un encabezado visible que describa la actividad confirmada de este negocio; no exigir SSR únicamente por este hallazgo.';
  const detectedData = count !== null ? `${count} etiquetas <h1> detectadas en el HTML inicial analizado.` : 'El recuento de H1 no está registrado en este hallazgo.';
  const simpleExplanation = count === 0
    ? 'H1 no detectado en HTML inicial; pendiente de comprobar en la página renderizada. Esta auditoría no ejecuta JavaScript.'
    : count !== null ? `${count} H1 detectado${count === 1 ? '' : 's'} en el HTML inicial; revisar su contenido y estructura.`
    : 'Revisar el H1 y confirmar su presencia y texto antes de proponer cambios. No hay un recuento registrado.';
  return { count, whyItMatters, howToVerify, proposedChange, detectedData, simpleExplanation };
}

export function normalizeH1Item(item: SeoAuditItem): SeoAuditItem {
  if (item.key !== 'h1') return item;
  const guidance = h1Guidance(item.metricValue);
  return {
    ...item,
    whyItMatters: guidance.whyItMatters,
    howToVerify: guidance.howToVerify,
    proposedChange: guidance.proposedChange,
    solution: guidance.proposedChange,
    detectedData: guidance.detectedData,
    simpleExplanation: guidance.simpleExplanation,
    ...(guidance.count === 0 ? { status: 'warning' as const, statusLabel: 'Pendiente en página renderizada' } : {}),
  };
}
