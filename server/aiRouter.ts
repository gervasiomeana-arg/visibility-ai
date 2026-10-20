import { youtubeConfigured } from './youtubePublic';
import { researchPresence, PresenceIdentityError } from './presenceResearch';
import { validateResearchInput } from '../shared/competitorResearch';
import { researchCompetitor } from './competitorResearchService';
import express from 'express';
import { validateContentInput, buildContentPrompt, validateContentOutput } from '../shared/contentContext';
import { generateWithGemini, geminiConfigured, geminiModel, sendAiFailure, AiProviderError } from './geminiService';
import { requireSupabaseAuth } from './supabaseAuth';
import {
  createRateLimiter,
  envRateLimit,
  rateLimitWindowMs,
} from './rateLimit';
import { recordUsageEventSafe } from './usageTelemetry';
import { normalizeAssistantHistory } from '../shared/assistantContext';
import { validateProfileSuggestionInput } from '../shared/businessProfileSuggestion';
import { suggestBusinessProfile } from './businessProfileService';

const MAX_PROMPT_LENGTH = 4000;
const MAX_FIELD_LENGTH = 2000;

const router = express.Router();

const aiRateLimit = createRateLimiter({
  name: 'ai',
  maxRequests: envRateLimit('AI_RATE_LIMIT_PER_WINDOW', 120),
  windowMs: rateLimitWindowMs(),
});

const competitorResearchLimit = createRateLimiter({ name: 'competitor-research', maxRequests: 12, windowMs: rateLimitWindowMs() });
const profileSuggestionLimit = createRateLimiter({ name: 'profile-suggestion', maxRequests: 12, windowMs: rateLimitWindowMs() });
router.post('/business/profile/suggest', requireSupabaseAuth, profileSuggestionLimit, async (req, res) => {
  let input;
  try { input = validateProfileSuggestionInput(req.body); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Datos no válidos.' }); }
  if (!geminiConfigured()) return res.status(503).json({ error: 'La propuesta necesita GEMINI_API_KEY configurada en el servidor.' });
  try {
    const { result, tokens } = await suggestBusinessProfile(input, params => generateWithGemini(params));
    recordUsageEventSafe(req, { workspaceId: typeof req.body.workspaceId === 'string' ? req.body.workspaceId : undefined, businessId: input.businessId, userId: res.locals.authUser?.id, eventType: 'ai_content', units: tokens, metadata: { operation: 'business_profile_suggestion' } });
    return res.json(result);
  } catch (error) {
    // Provider/network errors may contain private request details; do not forward them.
    const message = error instanceof Error ? error.message : '';
    const reviewable = /^(El HTML inicial|La IA no devolvió)/.test(message);
    if (reviewable) return res.status(422).json({ error: message });
    if (error instanceof AiProviderError) return sendAiFailure(res, error, 'profile_suggestion');
    return res.status(502).json({ error: 'No se pudo leer la web y preparar la propuesta. Revisá la dirección y reintentá; el perfil guardado sigue disponible.' });
  }
});
router.get('/integrations/status', requireSupabaseAuth, (_req,res) => {
  const model=geminiModel();
  return res.json({
    gemini:{configured:geminiConfigured(),model:/^(?:models\/)?gemini-[A-Za-z0-9._-]{1,100}$/.test(model)?model:'Modelo personalizado',quota:'not-checked'},
    youtube:{configured:youtubeConfigured(),missing:youtubeConfigured()?[]:['YOUTUBE_API_KEY']},
  });
});
router.post('/presence/research', requireSupabaseAuth, competitorResearchLimit, async (req,res) => {
  try { return res.json(await researchPresence(req.body)); }
  catch(error) {
    if(error instanceof AiProviderError) return sendAiFailure(res,error,'presence_research');
    if(error instanceof PresenceIdentityError) return res.status(422).json({error:error.message});
    return res.status(422).json({error:'No se obtuvo una investigación con fuentes verificables. Revisá cliente, consulta, mercado y configuración de Gemini. No se guardaron resultados.'});
  }
});
router.post('/competitors/research', requireSupabaseAuth, competitorResearchLimit, async (req, res) => {
  let input;
  try { input = validateResearchInput(req.body); if (typeof req.body.businessId !== 'string' || !req.body.businessId.trim() || req.body.businessId.length > 120) throw new Error('Seleccioná un negocio para guardar la investigación.'); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Datos de investigación no válidos.' }); }
  if (!geminiConfigured()) return res.status(503).json({ error: 'La investigación web necesita GEMINI_API_KEY configurada en el servidor.' });
  try {
    const { result } = await researchCompetitor(input, req.body.businessId, async params => {
      const response = await generateWithGemini(params);
      recordUsageEventSafe(req, { workspaceId: typeof req.body.workspaceId === 'string' ? req.body.workspaceId : undefined, businessId: req.body.businessId, userId: res.locals.authUser?.id, eventType: 'ai_content', units: Number(response.usageMetadata?.totalTokenCount || 0), metadata: { operation: 'competitor_research' } });
      return response;
    });
    return res.json(result);
  } catch (error: any) {
    const sourceError = typeof error?.message === 'string' && error.message.startsWith('La búsqueda no devolvió');
    if (sourceError) return res.status(422).json({ error: error.message });
    return sendAiFailure(res, error, 'competitor_research');
  }
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

    if (!geminiConfigured()) {
      return res.status(503).json({ error: 'El asistente no está configurado. Revisá GEMINI_API_KEY en el servidor.' });
    }

    const systemInstruction = `Eres "Visibility AI Assistant", el asesor técnico y estratégico de visibilidad digital de Visibility AI.
Tu objetivo es dar respuestas claras, rigurosas, basadas estrictamente en evidencia y libres de afirmaciones engañosas o falsas promesas.

PRINCIPIOS OBLIGATORIOS Y REGLAS DE RESPUESTA:
1. CONTEXTO DEL NEGOCIO Y AUDITORÍA REAL:
- Utiliza exclusivamente los datos del negocio seleccionado y los resultados de su última auditoría técnica real provistos en el contexto: ${JSON.stringify(businessContext || {})}.
- REDES: nunca inventes seguidores, visualizaciones, alcance, interacciones, fuentes, capturas ni historial. Si no hay medición verificable para el perfil y período exactos, responde «Sin datos verificados». No extrapoles meses, no repartas interacciones entre Me gusta y comentarios, no equipares visualizaciones con personas ni muestras con totales. Una consulta pública actual no reconstruye meses anteriores.
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
- Para imágenes, distingue atributo ALT ausente de alt="". Un ALT vacío es válido en imágenes decorativas; no sugieras añadirles una descripción ni prometas conversiones por hacerlo. aria-hidden="true" o role="presentation"/"none" son marcas de intención decorativa, pero la función real requiere contexto. Si el usuario confirma que la imagen es decorativa y tiene alt="", no recomiendes modificarla para corregir una supuesta ausencia de atributo. Un ALT vacío sin esas marcas también puede ser válido: solicita comprobar su función antes de llamarlo error.
- FCP/LCP elevados no prueban que JavaScript o la ausencia de H1 en HTML inicial sean la causa. Identificarla requiere mediciones adicionales.
- Si la auditoría incluye un desglose LCP, distingue la espera antes de solicitar el recurso de su descarga y renderizado. Son fases observadas: no sumarlas para reconstruir el LCP simulado. Recomienda corregir solo las comprobaciones fallidas que figuren en los datos; una comprobación aprobada de carga sin lazy loading no justifica recomendar retirar loading="lazy". Si falta el desglose, no inventes sus tiempos ni atribuyas la causa a una imagen.
- Cuando el usuario pida una guía completa para solucionar un problema, estructura tu respuesta cubriendo con claridad:
  • Por qué importa el hallazgo
  • Qué se detectó (dato medido)
  • Qué cambio se propone
  • Cómo comprobarlo
- NO supongas que el sitio usa WordPress o Wix a menos que esté expresamente confirmado en los datos medidos del negocio. Adapta las instrucciones a nivel HTML/servidor o consulta cuál es la plataforma si se requiere una guía específica.
- Para Open Voley, cuando corresponda un borrador de encabezado H1 o título, sugiere como propuesta: "Open Voley: scouting y estadísticas para entrenadores".

Responde en español (tono profesional, cercano, empático y sin tecnicismos innecesarios).`;

    const response = await generateWithGemini({
      model: geminiModel(),
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
        httpOptions: { timeout: 45000 },
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
        model: geminiModel(),
      },
    });

    if (!response.text?.trim()) return res.status(502).json({ error: 'El asistente no devolvió una respuesta. Intentá nuevamente.' });
    return res.json({ reply: response.text.trim() });
  } catch (error: any) {
    return sendAiFailure(res, error, 'assistant');
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
      workspaceId,
      businessId,
    } = req.body;

    const validationError = validateContentInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!geminiConfigured()) {
      return res.status(503).json({ error: 'El generador no está configurado. Revisá GEMINI_API_KEY en el servidor.' });
    }
    const promptText = buildContentPrompt(req.body);

    const response = await generateWithGemini({
      model: geminiModel(),
      contents: promptText,
      config: {
        temperature: 0.7,
        httpOptions: { timeout: 45000 },
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
        model: geminiModel(),
        contentType:
          typeof contentType === 'string' ? contentType : undefined,
      },
    });

    if (!response.text?.trim()) return res.status(502).json({ error: 'El generador no devolvió contenido. Intentá nuevamente.' });
    const outputError = validateContentOutput(response.text);
    if (outputError) return res.status(422).json({ error: outputError });
    return res.json({ content: response.text });
  } catch (error: any) {
    return sendAiFailure(res, error, 'content');
  }
});

export default router;
