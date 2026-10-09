import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireSupabaseAuth } from './supabaseAuth';
import {
  createRateLimiter,
  envRateLimit,
  rateLimitWindowMs,
} from './rateLimit';

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
    const { prompt, businessContext } = req.body;

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

    const systemInstruction = `Eres "Visibility AI Assistant", el asesor de visibilidad digital y marketing local más claro, empático y práctico para dueños de empresas, hoteles, restaurantes, inmobiliarias y comercios.
Reglas clave:
- NO hables con jerga técnica incomprensible (evita tecnicismos como TTFB, canonicals, robots meta tags sin explicarlos en lenguaje llano).
- Habla en español rioplatense o neutro, con tono profesional, cercano y orientado a ventas y consultas.
- Responde siempre a la pregunta del usuario: "¿Mi negocio aparece donde buscan mis clientes?"
- Da consejos concretos que el dueño pueda implementar o pedirle a su diseñador en 15-30 minutos.
- Si se proporciona contexto del negocio (${JSON.stringify(businessContext || {})}), personaliza la respuesta con el nombre del negocio, su ciudad y tipo de actividad.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
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

    return res.json({ content: response.text });
  } catch (error: any) {
    console.error('Error in /api/content/generate:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

export default router;
