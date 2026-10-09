import { ContentGenerationRequest } from '../types';
import { authService } from './authService';
import { apiFetchJson } from './apiClient';
import { AssistantTurn, h1Fallback, normalizeAssistantHistory } from '../../shared/assistantContext';

export const aiService = {
  async askAssistant(
    prompt: string,
    businessContext?: {
      name: string;
      url: string;
      category: string;
      city: string;
      description?: string;
      scores?: any;
      workspaceId?: string;
      businessId?: string;
      lastAudit?: any;
    },
    history: AssistantTurn[] = []
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
            history: normalizeAssistantHistory(history),
            workspaceId: businessContext?.workspaceId,
            businessId: businessContext?.businessId,
          }),
        }
      );
      if (data.reply) return data.reply;
    } catch (e) {
      console.warn('API error, using local business assistant engine fallback:', e);
    }

    // Local fallback adhering strictly to verification, non-promising, and domain rules
    const p = prompt.toLowerCase();
    const biz = businessContext?.name || 'tu negocio';
    const city = businessContext?.city || 'tu ciudad';
    const desc = businessContext?.description;
    const isOpenVoley =
      biz.toLowerCase().includes('voley') ||
      (businessContext?.url || '').toLowerCase().includes('openvoley');

    const profileIntro = isOpenVoley
      ? `Para **Open Voley** (herramienta de scouting, estadísticas y análisis de voleibol para entrenadores)`
      : desc
      ? `Para **${biz}** (${desc})`
      : `Para **${biz}**`;

    const h1Reply = h1Fallback(prompt, history, businessContext?.lastAudit?.items || []);
    if (h1Reply) return h1Reply;

    if (p.includes('mejorar primero') || p.includes('prioridad') || p.includes('urgente')) {
      const items = businessContext?.lastAudit?.items || [];
      const errorItem = items.find((i: any) => i.status === 'error');

      if (errorItem) {
        return `${profileIntro}, según la última auditoría técnica real:

- **Dato medido:** Se detectó "${errorItem.title}" (${errorItem.metricValue || errorItem.statusLabel}).
- **Interpretación:** ${errorItem.simpleExplanation}
- **Propuesta:** ${errorItem.proposedChange || errorItem.solution}
- **Comprobación:** ${errorItem.howToVerify || 'Revisar el código fuente del sitio tras el cambio.'}

*Nota de precisión:* Implementar esta propuesta resuelve el factor técnico observado; no constituye una promesa de subir posiciones ni de captar clientes inmediatos.`;
      }

      return `${profileIntro}: sin una auditoría técnica completa guardada, no es responsable afirmar qué problema tiene prioridad crítica. Te recomiendo revisar los factores medidos en la pestaña SEO Técnico antes de priorizar acciones.`;
    }

    if (p.includes('competencia') || p.includes('aparece antes') || p.includes('competidor')) {
      return `${profileIntro}: actualmente no contamos con datos competitivos medidos ni rankings comparativos verificados. No voy a especular sobre competidores ni inventar diferencias que no estén sustentadas en datos reales. Si contás con competidores específicos que quieras analizar, indicalos para compararlos objetivamente.`;
    }

    if (p.includes('contenido') || p.includes('crear')) {
      if (isOpenVoley) {
        return `${profileIntro}:
- **Dato medido:** La web comunica un software de scouting y análisis para entrenadores de voleibol.
- **Interpretación:** Conviene que la página principal y sus secciones describan con precisión las funciones técnicas (análisis táctico, estadísticas por set, rotaciones).
- **Propuesta:** Estructurar el mensaje en torno a casos reales de entrenamiento de voleibol. Por ejemplo, como H1 borrador: **"Open Voley: scouting y estadísticas para entrenadores"**.
- **Comprobación:** Validar que el texto refleje el software real sin suponer CMS como WordPress o Wix.`;
      }

      return `${profileIntro}: para orientar el contenido con precisión necesitamos definir los servicios confirmados y el perfil del cliente. ¿Podrías indicarme qué servicio o duda técnica puntual te gustaría abordar?`;
    }

    if (p.includes('consultas') || p.includes('clientes') || p.includes('reservas')) {
      return `${profileIntro}:
- **Dato medido vs. propuesta:** La visibilidad técnica en buscadores facilita que la página sea descubierta, pero la generación de consultas depende de la propuesta de valor, claridad de contacto y confianza de la web.
- **Propuesta:** Asegurar que los medios de contacto (o registro de prueba) sean visibles y claros en dispositivos móviles, sin prometer incrementos porcentuales garantizados.`;
    }

    return `Como asistente técnico para ${profileIntro}:
Puedo ayudarte a desglosar los datos medidos en tu auditoría técnica, distinguir hechos de interpretaciones y redactar propuestas prácticas sin falsas promesas de indexación o ranking.

¿Sobre qué hallazgo o aspecto técnico querés que profundicemos?`;
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
