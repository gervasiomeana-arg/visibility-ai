import { ContentGenerationRequest } from '../types';
import { authService } from './authService';

export const aiService = {
  async askAssistant(prompt: string, businessContext?: { name: string; url: string; category: string; city: string; scores?: any }): Promise<string> {
    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: await authService.getAuthorizationHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prompt, businessContext }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.reply) return data.reply;
      }
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

  async generateContent(req: ContentGenerationRequest): Promise<string> {
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: await authService.getAuthorizationHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(req),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.content) return data.content;
      }
    } catch (e) {
      console.warn('API error, using fallback content generator:', e);
    }

    // High quality template fallback
    const { contentType, topic, keyword, city, businessType, goal } = req;

    if (contentType === 'web_page') {
      return `# ${keyword ? keyword.toUpperCase() : topic} EN ${city.toUpperCase()}

## Disfrutá de la mejor experiencia en ${city} pensada para vos y tu familia

¿Buscás el lugar ideal para relajarte y disfrutar sin preocupaciones? En nuestro establecimiento combinamos la calidez de la mejor atención con todas las comodidades que necesitás para que tu estadía sea inolvidable.

---

### ¿Por qué elegirnos en ${city}?

- **Ubicación inmejorable:** A pocos minutos de las principales atracciones y playas, permitiéndote moverte con total comodidad.
- **Espacios diseñados para el confort:** Habitaciones amplias, luminosas y totalmente equipadas para descansar como en casa.
- **Atención personalizada:** Nuestro equipo está a tu disposición las 24 horas para resolver cualquier necesidad.
- **Desayuno artesanal:** Comenzá cada día con productos frescos, opciones saludables y sabores caseros.

---

### Comodidades y Servicios incluidos:
✓ Conexión Wi-Fi de alta velocidad en todas las instalaciones  
✓ Estacionamiento seguro y monitoreado  
✓ Asesoramiento turístico y recomendaciones de paseos  
✓ Piscina climatizada y áreas de descanso  

---

### Consultá disponibilidad hoy mismo
No dejes tu descanso para último momento. Reservando de forma directa a través de nuestra web o WhatsApp obtenés el mejor precio garantizado y beneficios exclusivos.

👉 **[Escribinos por WhatsApp y reservá tu lugar hoy mismo]**`;
    }

    if (contentType === 'faq') {
      return `### Preguntas Frecuentes sobre ${businessType} en ${city}

**1. ¿Cuáles son los horarios de ingreso (Check-in) y salida (Check-out)?**
El horario de ingreso es a partir de las 14:00 hs y la salida es hasta las 10:30 hs. Si llegás antes o querés quedarte unas horas más, contamos con custodia de equipaje sin costo adicional para que sigas disfrutando.

**2. ¿Cuentan con estacionamiento para vehículos?**
Sí, disponemos de cocheras cubiertas y monitoreadas las 24 hs dentro del predio. Te sugerimos solicitar tu espacio al momento de confirmar la reserva.

**3. ¿Cómo funciona el servicio de desayuno?**
Ofrecemos desayuno buffet completo todas las mañanas de 7:30 a 10:30 hs, con pastelería artesanal, frutas frescas, infusiones y opciones aptas para celíacos previa consulta.

**4. ¿Aceptan mascotas?**
Aceptamos mascotas de porte pequeño bajo consulta previa y en habitaciones seleccionadas para garantizar el bienestar de todos nuestros huéspedes.

**5. ¿Cuáles son los medios de pago aceptados?**
Aceptamos transferencias bancarias, tarjetas de crédito y débito, y pagos en efectivo con promociones especiales por reserva directa.

**6. ¿Cómo llegar desde los principales accesos de ${city}?**
Nos encontramos en una zona estratégica de muy fácil acceso tanto en vehículo particular como en transporte público o taxi desde la terminal.`;
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
      return `🌊 ¡Planeá tu próxima escapada a ${city}! ☀️

¿Buscando un respiro de la rutina? Te esperamos con todo listo para que disfrutes de unos días inolvidables:

✨ Habitaciones confortables con vistas privilegiadas  
🥐 Desayuno buffet artesanal incluido todas las mañanas  
🏊‍♂️ Pileta climatizada para relajarte a cualquier hora  
🚗 Cochera privada para tu total tranquilidad  

📅 Aprovechá nuestros paquetes especiales de fin de semana con late check-out sin cargo.

📲 Consultanos por mensaje directo o tocá el botón para chatear por WhatsApp con nosotros. ¡Los cupos son limitados!

#${city.replace(/\s+/g, '')} #Turismo #Escapada #Descanso #Promociones`;
    }

    // Default general article
    return `### Guía Exclusiva: ${topic} en ${city}

Cuando se trata de buscar ${keyword} en ${city}, contar con información clara y confiable marca toda la diferencia. En este artículo te contamos todo lo que necesitás tener en cuenta para tomar la mejor decisión:

1. **Ubicación y accesibilidad:** Estar cerca de lo importante te ahorra tiempo y traslados.
2. **Servicios incluidos sin sorpresas:** Verificá que cuente con todos los servicios esenciales para tu comodidad.
3. **Atención y respaldo:** La calidez humana y la rapidez de respuesta son el verdadero diferencial.

¿Querés saber más o reservar tu lugar? Contactanos hoy mismo.`;
  },
};
