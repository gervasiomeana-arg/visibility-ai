const definitions: Record<string, { label: string; why: string; change: string }> = {
  fcp: {
    label: 'FCP',
    why: 'FCP mide cuánto tarda en aparecer el primer texto o imagen. Ayuda a evaluar cuándo la página empieza a mostrar contenido.',
    change: 'Revisar en el informe móvil los diagnósticos de respuesta del servidor, CSS y recursos que bloquean el renderizado. Elegir una mejora según la evidencia del informe; el valor de FCP por sí solo no identifica la causa.',
  },
  lcp: {
    label: 'LCP',
    why: 'LCP mide cuándo aparece el elemento de contenido más grande visible. Ayuda a evaluar la carga del contenido principal.',
    change: 'Identificar el elemento LCP en el informe móvil y revisar qué retrasa su carga o renderizado. Optimizar ese recurso o sus dependencias según el diagnóstico; no asumir que es una imagen ni que el H1 causa la demora.',
  },
  cls: {
    label: 'CLS',
    why: 'CLS mide la inestabilidad visual: los desplazamientos inesperados de elementos pueden dificultar la lectura y los clics.',
    change: 'Identificar los elementos que se desplazan en el informe móvil. Revisar dimensiones reservadas y contenido insertado durante la carga antes de elegir una corrección.',
  },
  tbt: {
    label: 'TBT',
    why: 'TBT mide el tiempo de bloqueo por tareas largas durante la carga en la prueba de laboratorio. Ayuda a investigar demoras en la respuesta de la página.',
    change: 'Revisar las tareas largas y el trabajo del hilo principal en el informe móvil. Reducir o dividir el trabajo identificado; el valor de TBT por sí solo no identifica qué script lo causa.',
  },
  'pagespeed-performance': {
    label: 'Rendimiento PageSpeed',
    why: 'La puntuación resume varias mediciones de rendimiento de una prueba de laboratorio. Ayuda a orientar el diagnóstico; no mide posiciones en Google ni consultas de clientes.',
    change: 'Revisar las métricas y los diagnósticos del informe móvil. Priorizar una mejora respaldada por el informe y volver a medir.',
  },
};

export function performanceSolution(key: string, metricValue?: string) {
  const definition = definitions[key];
  if (!definition) return undefined;
  return {
    whyItMatters: definition.why,
    detectedData: metricValue
      ? `${definition.label}: ${metricValue}. Medición de laboratorio de Google PageSpeed/Lighthouse en móvil, correspondiente a esa prueba; no representa datos de todos los visitantes.`
      : `${definition.label}: el valor numérico no está disponible en esta tarea. Consultar el informe original o ejecutar una nueva auditoría móvil; no inferir una medición.`,
    proposedChange: definition.change,
    howToVerify: 'Abrir PageSpeed Insights (https://pagespeed.web.dev/), analizar la misma URL y seleccionar Móvil. Revisar la métrica en la sección de diagnóstico de rendimiento (Lighthouse), conservar la fecha y comparar varias ejecuciones antes y después en condiciones similares: los resultados pueden variar. Distinguir esta prueba de los datos de usuarios reales, si están disponibles.',
  };
}

// Older tasks kept the measurement only in the assistant prompt.
export function legacyPerformanceMetric(prompt?: string): string | undefined {
  const match = prompt?.match(/Dato\s+(?:detectado|medido):\s*(\d+(?:[.,]\d+)?\s*(?:ms|s|\/100)?)(?:\.|\s)*$/i);
  return match?.[1].trim();
}
