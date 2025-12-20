import { GoogleGenAI } from "@google/genai";

function getAIClient() {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  
  if (!apiKey || !baseUrl) {
    throw new Error("AI Integrations not configured. Please set up Gemini integration.");
  }
  
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl,
    },
  });
}

export interface ActionPlanSuggestion {
  issue: string;
  recommendation: string;
  priority: "high" | "medium" | "low";
  deadline: string;
}

export async function generateActionPlans(
  checklistData: any,
  observations: string,
  location: string
): Promise<ActionPlanSuggestion[]> {
  const prompt = `Você é um especialista em Segurança do Trabalho no Brasil. Analise os dados da inspeção abaixo e gere planos de ação específicos e práticos.

**Local da Inspeção:** ${location}

**Observações do Inspetor:** ${observations}

**Dados do Checklist:**
${JSON.stringify(checklistData, null, 2)}

Com base nos itens marcados como não conformes ou com pendências, gere de 3 a 5 planos de ação. Para cada plano, forneça:
1. **issue**: Descrição clara do problema identificado
2. **recommendation**: Recomendação específica e prática para resolver o problema
3. **priority**: Prioridade (high, medium, low) baseada no risco
4. **deadline**: Prazo sugerido em dias (ex: "7 dias", "30 dias", "imediato")

Responda APENAS em formato JSON válido, como um array de objetos:
[
  {
    "issue": "...",
    "recommendation": "...",
    "priority": "high|medium|low",
    "deadline": "..."
  }
]`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error("Error generating action plans:", error);
    throw error;
  }
}

export async function analyzeInspectionPhoto(
  photoBase64: string,
  context: string
): Promise<{ risks: string[]; recommendations: string[] }> {
  const prompt = `Você é um especialista em Segurança do Trabalho. Analise esta imagem de uma inspeção de segurança.

**Contexto:** ${context}

Identifique:
1. **risks**: Lista de riscos potenciais visíveis na imagem
2. **recommendations**: Recomendações de melhoria

Responda em JSON:
{
  "risks": ["risco 1", "risco 2"],
  "recommendations": ["recomendação 1", "recomendação 2"]
}`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: photoBase64.replace(/^data:image\/\w+;base64,/, ""),
              },
            },
          ],
        },
      ],
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { risks: [], recommendations: [] };
  } catch (error) {
    console.error("Error analyzing photo:", error);
    throw error;
  }
}
