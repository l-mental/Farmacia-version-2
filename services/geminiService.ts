
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
  // Use process.env.API_KEY directly as a named parameter to initialize the client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    /* Fix: Optimized configuration by using systemInstruction and responseSchema for structured JSON output */
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
    
    // Accessing .text property directly and parsing the JSON response
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Prescription Analysis Error:", error);
    throw error;
  }
};
