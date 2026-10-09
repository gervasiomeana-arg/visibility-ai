import { ContentGenerationRequest } from '../types';
import { authService } from './authService';
import { apiFetchJson } from './apiClient';

export const aiService = {
  async askAssistant(
    prompt: string,
    businessContext?: {
      name: string;
      url: string;
      category: string;
      city: string;
      scores?: any;
      workspaceId?: string;
      businessId?: string;
    }
  ): Promise<string> {
    try {
      const data = await apiFetchJson<{ reply?: string | null }>(
        '/api/assistant/chat',
        {
          method: 'POST',
          headers: await authService.getAuthorizationHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            prompt,
            businessContext,
            workspaceId: businessContext?.workspaceId,
            businessId: businessContext?.businessId,
          }),
        }
      );
      if (data.reply) return data.reply;
    } catch (e) {
      console.warn('API error, using local business assistant engine fallback:', e);
    }

    // Local fallback with rich business-oriented advice
    const p = prompt.toLowerCase();
    const biz = businessContext?.name || 'tu negocio';
    const city = businessContext?.city || 'tu ciudad';

    if (p.includes('mejorar primero') || p.includes('prioridad') || p.includes('urgente')) {
      return `Para **${biz}**, todavía no tengo mediciones reales suficientes para afirmar qué problema es el más urgente.

Mientras estemos en modo DEMO, te recomiendo priorizar solo lo que Visibility AI pueda verificar con una fuente real. Cuando conectemos el análisis técnico, voy a ordenar las acciones por impacto y evidencia.

Por ahora puedo ayudarte a revisar una recomendación concreta sin presentarla como un diagnóstico verificado.`;
    }

    if (p.includes('competencia') || p.includes('aparece antes') || p.includes('competidor')) {
      return `Todavía no tengo datos competitivos reales de **${biz}** en **${city}**. En modo DEMO no voy a inventar posiciones, autoridad ni ventajas frente a competidores.

Cuando conectemos una fuente real de keywords y resultados de búsqueda, voy a poder comparar:
- búsquedas donde aparecés vos y ellos,
- posiciones relativas,
- páginas que capturan esas búsquedas,
- oportunidades concretas para cerrar la brecha.

Si querés, puedo explicarte cómo leer una comparación competitiva cuando esos datos estén disponibles.`;
    }

    if (p.includes('contenido') || p.includes('crear')) {
      return `Todavía no tengo evidencia suficiente para afirmar qué contenido será el más rentable para **${biz}**.

Como punto de partida, podés evaluar:
- **Una página específica del servicio principal** que responda claramente qué ofrecés y en qué zona trabajás.
- **Preguntas frecuentes** basadas en dudas reales de tus clientes.
- **Contenido para tu Perfil de Empresa en Google** cuando esa integración esté conectada.

Estas son recomendaciones generales, no resultados medidos. Cuando tengamos consultas reales de Search Console, puedo priorizarlas según evidencia.`;
    }

    if (p.includes('consultas') || p.includes('clientes') || p.includes('reservas')) {
      return `Para facilitar más consultas directas, podés revisar estas acciones:
1. **Canal de contacto visible en móvil**: WhatsApp, teléfono o formulario, según cómo prefieran contactarte tus clientes.
2. **Llamadas a la acción claras**: Explicá exactamente qué sucede al tocar cada botón, por ejemplo "Consultar disponibilidad" o "Pedir presupuesto".
3. **Evidencia real del servicio**: Fotos propias, casos, testimonios o información concreta que ayude a decidir.

Estas recomendaciones son generales. Visibility AI no debe atribuirles un aumento porcentual hasta contar con medición real antes y después.`;
    }

    if (p.includes('problema') || p.includes('explicame') || p.includes('explicar')) {
      return `En esta etapa, los problemas visibles dentro de Visibility AI pueden ser ejemplos de demostración y no deben interpretarse como hallazgos reales sobre **${biz}**.

Cuando una auditoría esté respaldada por una fuente real, te voy a explicar cada hallazgo con cuatro cosas: qué detectamos, de dónde sale el dato, por qué importa y qué acción conviene tomar.`;
    }

    return `Como asistente de visibilidad para **${biz}** en **${city}**, mi objetivo es ayudarte a conseguir más clientes sin tecnicismos. 

Sin datos de demanda verificados, puedo sugerir acciones generales para revisar:
- Clarificar la página de tu servicio principal.
- Responder preguntas frecuentes reales de tus clientes.
- Mantener actualizado tu Perfil de Empresa en Google cuando esté conectado.

¿Hay algún punto o problema en particular del informe que quieras que revisemos juntos?`;
  },

  async generateContent(
    req: ContentGenerationRequest,
    context?: { workspaceId?: string; businessId?: string }
  ): Promise<string> {
    try {
      const data = await apiFetchJson<{ content?: string | null }>(
        '/api/content/generate',
        {
          method: 'POST',
          headers: await authService.getAuthorizationHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            ...req,
            workspaceId: context?.workspaceId,
            businessId: context?.businessId,
          }),
        }
      );
      if (data.content) return data.content;
    } catch (e) {
      console.warn('API error, using fallback content generator:', e);
    }

    // High quality template fallback
    const { contentType, topic, keyword, city, businessType, goal } = req;

    if (contentType === 'web_page') {
      return `# ${keyword ? keyword.toUpperCase() : topic} EN ${city.toUpperCase()}

## Borrador editable para una página comercial

Este texto es una propuesta de redacción y **no debe publicarse sin validar los datos del negocio**.

### Presentación
Si buscás ${keyword || topic} en ${city}, acá podés explicar de forma clara qué ofrece ${businessType || 'tu negocio'}, a quién está dirigido y por qué conviene consultarte.

### Qué conviene incluir
- El servicio principal y sus características reales.
- Zona de atención o ubicación.
- Diferenciales que puedas comprobar.
- Horarios, condiciones y medios de contacto verificados.
- Fotos propias, casos o testimonios autorizados.

### Próximo paso
**Consultanos para recibir información, disponibilidad o presupuesto.**

> Antes de publicar: reemplazá este borrador con información confirmada del negocio y eliminá cualquier afirmación que no puedas verificar.`;
    }

    if (contentType === 'faq') {
      return `### Preguntas Frecuentes sobre ${businessType} en ${city}

Este es un borrador de estructura. Completá cada respuesta únicamente con información real del negocio.

**1. ¿Qué servicios ofrecen?**
Describí acá los servicios efectivamente disponibles.

**2. ¿Dónde están ubicados o qué zona atienden?**
Indicá dirección, cobertura o modalidad de atención verificada.

**3. ¿Cuáles son los horarios?**
Agregá días y horarios reales.

**4. ¿Cómo puedo consultar o reservar?**
Incluí los canales de contacto que realmente utilicen.

**5. ¿Qué medios de pago aceptan?**
Mencioná solo los medios de pago confirmados.

**6. ¿Hay políticas o condiciones importantes?**
Explicá cancelaciones, requisitos, tiempos de entrega u otras condiciones reales según corresponda.`;
    }

    if (contentType === 'seo_meta') {
      return `### Propuesta de Título y Descripción SEO

**Título de Página (Title Tag - 58 caracteres):**
${keyword} | Tu Mejor Opción en ${city}

**Descripción para Google (Meta Description - 152 caracteres):**
Descubrí el mejor servicio de ${keyword} en ${city}. Confort, ubicación privilegiada y atención personalizada. ¡Consultá tarifas y reservá al mejor precio!

**Etiquetas H1 sugeridas:**
- H1: ${keyword} en ${city} - Confort y atención garantizada
- H2: Conoce nuestras instalaciones y servicios exclusivos
- H2: Opiniones de quienes ya nos eligieron en ${city}`;
    }

    if (contentType === 'google_post') {
      return `📍 ${businessType} en ${city}

Borrador para una publicación de Google:

¿Querés conocer más sobre ${topic || keyword || 'nuestro servicio'}?

Podés usar esta publicación para contar una novedad, promoción o servicio **realmente disponible**, sumar una foto propia y cerrar con una llamada a la acción clara.

📲 Contactanos para recibir información actualizada.

Antes de publicar, verificá precios, promociones, horarios, disponibilidad y cualquier beneficio mencionado.`;
    }

    // Default general article
    return `### Borrador: ${topic} en ${city}

Este contenido es una propuesta editable. No contiene datos medidos ni características verificadas del negocio.

Para desarrollar un artículo útil sobre **${keyword || topic}**, conviene incluir:

1. Información concreta que responda la intención de búsqueda.
2. Datos reales del negocio, servicio o zona.
3. Preguntas frecuentes tomadas de consultas verdaderas de clientes.
4. Una llamada a la acción coherente con el objetivo: ${goal || 'generar una consulta'}.

Antes de publicar, verificá todos los datos y adaptá el texto a la voz real del negocio.`;
  },
};
