import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireSupabaseAuth } from './supabaseAuth';
import {
  createRateLimiter,
  envRateLimit,
  rateLimitWindowMs,
} from './rateLimit';
import { recordUsageEventSafe } from './usageTelemetry';
import { normalizeAssistantHistory } from '../shared/assistantContext';

const MAX_PROMPT_LENGTH = 4000;
const MAX_FIELD_LENGTH = 2000;

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({ apiKey });
}

const router = express.Router();

const aiRateLimit = createRateLimiter({
  name: 'ai',
  maxRequests: envRateLimit('AI_RATE_LIMIT_PER_WINDOW', 120),
  windowMs: rateLimitWindowMs(),
});

router.post(
  '/assistant/chat',
  requireSupabaseAuth,
  aiRateLimit,
  async (req, res) => {
  try {
    const { prompt, businessContext, workspaceId, businessId, history } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(413).json({ error: 'Prompt is too long' });
    }

    if (!aiClient) {
      return res.json({
        reply: null,
        note: 'No GEMINI_API_KEY configured, client fallback will be used.',
      });
    }

    const systemInstruction = `Eres "Visibility AI Assistant", el asesor técnico y estratégico de visibilidad digital de Visibility AI.
Tu objetivo es dar respuestas claras, rigurosas, basadas estrictamente en evidencia y libres de afirmaciones engañosas o falsas promesas.

PRINCIPIOS OBLIGATORIOS Y REGLAS DE RESPUESTA:
1. CONTEXTO DEL NEGOCIO Y AUDITORÍA REAL:
- Utiliza exclusivamente los datos del negocio seleccionado y los resultados de su última auditoría técnica real provistos en el contexto: ${JSON.stringify(businessContext || {})}.
- NO inventes servicios, público objetivo, ventajas de mercado ni competidores. Si falta información necesaria sobre la actividad o la audiencia del negocio, pide una aclaración al usuario en lugar de asumir o especular.
- REGLA ESPECÍFICA PARA OPEN VOLEY / "APP VOLEY": Para el negocio "app voley" o Open Voley (url o nombre vinculado a openvoley), Open Voley es una "herramienta de scouting, estadísticas y análisis de voleibol para entrenadores". BAJO NINGÚN CONCEPTO lo presentes como organizador de torneos ni como plataforma de gestión de campeonatos. Su público objetivo son entrenadores y analistas de voleibol. Esta descripción pertenece únicamente a este perfil y no debe aplicarse a ningún otro negocio.

2. PRECISIÓN Y SUPRESIÓN DE FALSAS PROMESAS:
- Elimina cualquier promesa o sugerencia de que un cambio puntual va a subir posiciones en Google, acelerar la indexación o conseguir más clientes/ventas de forma garantizada. Los resultados dependen de la competencia, algoritmos y múltiples señales técnicas y de demanda.
- Distingue siempre con total claridad tres planos en tus respuestas:
  a) DATOS MEDIDOS: Hechos verificados en el código analizado o respuesta HTTP (ej: código 200, caracteres del title, etiquetas en el HTML inicial).
  b) INTERPRETACIONES: Qué significa técnicamente o cómo lo leen los motores de búsqueda (mencionando limitaciones técnicas de la medición).
  c) PROPUESTAS: Recomendaciones prácticas que el usuario puede aplicar y verificar.

3. EVALUACIÓN DE ENCABEZADOS Y CASO "0 H1":
- El auditor técnico de Visibility AI analiza el HTML inicial recibido desde el servidor sin ejecutar JavaScript en el cliente (no renderiza mediante navegador headless).
- Si se detectan 0 H1 ("0 H1"):
  - Indica expresamente: "No se detectó un H1 en el HTML analizado".
  - Explica que si la página fue construida con JavaScript / renderizado en cliente (como React, Vue, etc.), el contenido o encabezado podría estar generándose dinámicamente en el navegador del usuario.
  - NO afirmes que Google tampoco lo encuentra (Googlebot procesa JavaScript en una fase posterior, aunque disponer del H1 en el HTML inicial sigue siendo la mejor práctica para velocidad y rastreo confiable).

4. ESTRUCTURA DE SOLUCIONES Y PLATAFORMAS:
- Responde primero al pedido concreto. Si solicita un primer paso sencillo o comprobar sin modificar, da solo una comprobación breve y no propongas cambios ni repitas una guía completa.
- Usa el historial para mantener continuidad. Las comprobaciones aportadas por el usuario se identifican como tales, no como mediciones propias.
- Si el usuario confirmó que el H1 existe en el DOM renderizado, no recomiendes agregar otro. Revisa su texto y la evidencia de renderizado/indexación antes de evaluar SSR o prerenderizado; no son una obligación derivada de 0 H1 en HTML inicial.
- FCP/LCP elevados no prueban que JavaScript o la ausencia de H1 en HTML inicial sean la causa. Identificarla requiere mediciones adicionales.
- Cuando el usuario pida una guía completa para solucionar un problema, estructura tu respuesta cubriendo con claridad:
  • Por qué importa el hallazgo
  • Qué se detectó (dato medido)
  • Qué cambio se propone
  • Cómo comprobarlo
- NO supongas que el sitio usa WordPress o Wix a menos que esté expresamente confirmado en los datos medidos del negocio. Adapta las instrucciones a nivel HTML/servidor o consulta cuál es la plataforma si se requiere una guía específica.
- Para Open Voley, cuando corresponda un borrador de encabezado H1 o título, sugiere como propuesta: "Open Voley: scouting y estadísticas para entrenadores".

Responde en español (tono profesional, cercano, empático y sin tecnicismos innecesarios).`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...normalizeAssistantHistory(history).map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        { role: 'user', parts: [{ text: prompt }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const totalTokens = Number(
      (response as any)?.usageMetadata?.totalTokenCount || 0
    );

    recordUsageEventSafe(req, {
      workspaceId:
        typeof workspaceId === 'string' ? workspaceId : undefined,
      businessId:
        typeof businessId === 'string' ? businessId : undefined,
      userId: res.locals.authUser?.id,
      eventType: 'ai_assistant',
      units: totalTokens,
      metadata: {
        model: 'gemini-3.8-flash',
      },
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Error in /api/assistant/chat:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

router.post(
  '/content/generate',
  requireSupabaseAuth,
  aiRateLimit,
  async (req, res) => {
  try {
    const {
      contentType,
      topic,
      keyword,
      city,
      businessType,
      goal,
      tone,
      workspaceId,
      businessId,
    } = req.body;

    if (!topic && !keyword) {
      return res.status(400).json({
        error: 'Topic or keyword is required',
      });
    }

    const fields = [
      contentType,
      topic,
      keyword,
      city,
      businessType,
      goal,
      tone,
    ];

    if (
      fields.some(
        (value) =>
          typeof value === 'string' &&
          value.length > MAX_FIELD_LENGTH
      )
    ) {
      return res.status(413).json({
        error: 'One or more fields are too long',
      });
    }

    if (!aiClient) {
      return res.json({
        content: null,
        note: 'No GEMINI_API_KEY configured, client fallback will be used.',
      });
    }

    const typeNames: Record<string, string> = {
      web_page: 'Página web completa de servicio o destino',
      blog_article: 'Artículo de blog informativo de alto valor',
      service_description: 'Descripción atractiva de servicio',
      faq: 'Sección de Preguntas Frecuentes (FAQ) para clientes e Inteligencia Artificial',
      seo_meta: 'Título optimizado (Title tag), Meta Description y encabezados H1/H2',
      google_post: 'Publicación promocional atractiva para ficha de Google Business Profile (Google Maps)',
    };

    const promptText = `Genera contenido para un negocio de tipo "${businessType || 'comercio'}" en la ciudad de "${city || 'localidad'}".
Tipo de contenido requerido: ${typeNames[contentType] || contentType}.
Tema principal: ${topic}
Palabra clave principal a posicionar en Google: ${keyword}
Objetivo comercial del texto: ${goal || 'Conseguir más consultas de clientes'}
Tono deseado: ${tone || 'Profesional, cálido, confiable y persuasivo'}

Instrucciones:
1. El texto debe estar en español excelente, listo para ser copiado y pegado en la web o red social.
2. Debe convencer al cliente de elegir este negocio por encima de la competencia.
3. Incluir llamadas a la acción claras (WhatsApp, reserva o visita).
4. No incluir explicaciones meta, entrega directamente el contenido formateado en Markdown limpio.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        temperature: 0.7,
      },
    });

    const totalTokens = Number(
      (response as any)?.usageMetadata?.totalTokenCount || 0
    );

    recordUsageEventSafe(req, {
      workspaceId:
        typeof workspaceId === 'string' ? workspaceId : undefined,
      businessId:
        typeof businessId === 'string' ? businessId : undefined,
      userId: res.locals.authUser?.id,
      eventType: 'ai_content',
      units: totalTokens,
      metadata: {
        model: 'gemini-3.8-flash',
        contentType:
          typeof contentType === 'string' ? contentType : undefined,
      },
    });

    return res.json({ content: response.text });
  } catch (error: any) {
    console.error('Error in /api/content/generate:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
