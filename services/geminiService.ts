
import { GoogleGenAI, Type } from "@google/genai";

// Removed intermediate variable and used process.env.API_KEY directly in the functions below

export const getGeminiHealthAdvice = async (query: string) => {
  // Use process.env.API_KEY directly as a named parameter to initialize the client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    /* Fix: Separated system instruction from user content for better model steering */
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: "Eres un asistente farmacéutico experto. Responde a la siguiente duda de salud de forma profesional, clara y siempre incluyendo un aviso de que no sustituyes a un médico.",
      }
    });
    // Accessing .text property directly as it returns the string output (not a method)
    return response.text || "Lo siento, no pude procesar tu solicitud en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hubo un error al consultar con el asistente de salud.";
  }
};

export const analyzePrescription = async (base64Data: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
        ]
      },
      config: {
        systemInstruction: "Analiza esta receta médica. Extrae los nombres de los medicamentos, la dosificación indicada y cualquier advertencia importante. Devuelve la respuesta en formato JSON claro.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: { type: Type.ARRAY, items: { type: Type.STRING } },
            dosage: { type: Type.STRING },
            warnings: { type: Type.STRING },
            isAuthentic: { type: Type.BOOLEAN, description: "¿Parece una receta médica real?" }
          },
          required: ["medications", "dosage", "warnings", "isAuthentic"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Prescription Analysis Error:", error);
    throw error;
  }
};

export const getSystemAssistantResponse = async (query: string, systemData: any) => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  // Local Fallback Logic for basic queries if API fails or key is missing
  const getLocalResponse = (q: string, data: any) => {
    const lowerQ = q.toLowerCase();
    if (lowerQ.includes('stock') || lowerQ.includes('inventario') || lowerQ.includes('medicamento')) {
      const rows = data.inventory.map((m: any) => `| ${m.name} | ${m.stock} | $${m.price} | ${m.controlled ? '⚠️ Sí' : 'Libre'} |`).join('\n');
      return `### 📦 Inventario de Medicamentos\n\n| Medicamento | Stock | Precio | Estado |\n| :--- | :---: | :---: | :---: |\n${rows}\n\n*Nota: Esta es una respuesta automática del sistema.*`;
    }
    if (lowerQ.includes('venta') || lowerQ.includes('recaudación')) {
      const total = data.sales.reduce((sum: number, s: any) => sum + s.total, 0);
      return `El total de ventas registradas es de **$${total.toFixed(2)}** sobre **${data.sales.length}** transacciones.\n\n*Nota: Esta es una respuesta automática del sistema.*`;
    }
    return null;
  };

  if (!apiKey) {
    const fallback = getLocalResponse(query, systemData);
    return fallback || "El asistente de IA no está configurado (falta API Key), pero puedo ayudarte con consultas básicas de stock o ventas.";
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const systemContext = JSON.stringify(systemData, null, 2);
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: `Eres el Asistente Inteligente de FarmaSalud Enterprise ERP. 
        Tu objetivo es ayudar al personal de la farmacia con información del sistema.
        
        TIENES ACCESO A LOS SIGUIENTES DATOS EN TIEMPO REAL:
        ${systemContext}
        
        REGLAS DE FORMATO:
        1. Usa Markdown enriquecido de alta calidad.
        2. Para listas de medicamentos o datos tabulares, usa SIEMPRE tablas de Markdown con encabezados claros.
        3. Las tablas deben tener este formato: | Medicamento | Stock | Precio | Estado |
        4. Usa negritas para resaltar valores críticos (ej: **STOCK BAJO**).
        5. Usa emojis de forma profesional (📦 para inventario, 💰 para finanzas, ⚠️ para alertas).
        6. Evita bloques de texto densos; prefiere listas con viñetas o tablas.
        
        REGLAS DE CONTENIDO:
        1. Solo responde preguntas sobre el sistema.
        2. Sé preciso con los números.
        3. Si detectas stock bajo (menos de 10 unidades), advierte al usuario.
        4. Mantén un tono profesional y eficiente.`,
      }
    });
    return response.text || "Lo siento, no pude procesar tu consulta sobre el sistema.";
  } catch (error) {
    console.error("System Assistant Error:", error);
    const fallback = getLocalResponse(query, systemData);
    return fallback || "Hubo un error al consultar con el asistente de IA. Por favor, intenta de nuevo o consulta los módulos manuales.";
  }
};
