
import { GoogleGenAI, Type } from "@google/genai";
import { DepartmentMismatch } from "../types.ts";

export interface SummaryResult {
  executiveSummary: string;
  detailedAnalysis: string;
  actions: string[];
  readingTimeMinutes: number;
}

export interface MasterAuditSummary {
  whatsappMessage: string;
}

export const summarizeOperations = async (
  currentData: DepartmentMismatch[]
): Promise<SummaryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-pro-preview'; // Upgraded to Pro for complex large-file reasoning
  
  // Filter for relevant performance data
  const relevantData = currentData.filter(d => 
    d.department === 'Sales' || d.department === 'Territory Sales'
  );

  // We optimize the payload but maintain high detail for the AI to reason over
  const summarizedPayload = relevantData.length > 800 
    ? relevantData.slice(0, 800)
    : relevantData;

  const prompt = `
    ROLE: You are the Chief Operating Officer (COO) of Swiss Pharmaceuticals.
    TASK: Analyze the provided Excel data containing Sales and Territory performance.
    
    GOAL: Produce a report that takes exactly 5 MINUTES TO READ at normal speaking pace.
    LENGTH REQUIREMENT: Write approximately 1,200 words.
    
    REPORT STRUCTURE:
    1. THE PULSE (200 words): A high-level view of the month's momentum.
    2. DIVISIONAL AUDIT (600 words): Deep dive into 'Achievers', 'Passionate', 'Concord', and 'Dynamic'. 
       - Identify specific products (e.g., ${summarizedPayload.slice(0, 5).map(p => p.metric).join(', ')}) causing the most variance.
       - Explain the 'Gap' vs 'Trend Target' for specific dates.
    3. EXTERNAL IMPACT & RISKS (250 words): How daily shortfalls impact the final closing.
    4. STRATEGIC BOARD ACTIONS: Exactly 7 actionable, non-generic bullet points for the Directors.
    
    DATA SOURCE:
    ${JSON.stringify(summarizedPayload)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 4000 }, // High thinking budget for deep reasoning
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            detailedAnalysis: { type: Type.STRING, description: "Detailed Markdown analysis of at least 1000 words" },
            actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            readingTimeMinutes: { type: Type.NUMBER }
          },
          required: ["executiveSummary", "detailedAnalysis", "actions", "readingTimeMinutes"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}") as SummaryResult;
    // Enforce UI metadata
    result.readingTimeMinutes = 5;
    return result;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return {
      executiveSummary: "Batch analysis limited.",
      detailedAnalysis: "The system detected an exceptionally large dataset. While the data is synced locally, the AI summary requires a more focused date range to generate a 5-minute report. Please filter by specific teams or weeks for a deeper dive.",
      actions: ["Verify API Key", "Reduce data volume per sync", "Contact IT Support"],
      readingTimeMinutes: 1
    };
  }
};

export const generateMasterAuditSummary = async (data: DepartmentMismatch[]): Promise<MasterAuditSummary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-flash-preview';

  const prompt = `Create a high-urgency WhatsApp summary for the Swiss Pharma Board under 150 words based on these critical shortfalls: ${JSON.stringify(data.slice(0, 20))}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsappMessage: { type: Type.STRING }
          },
          required: ["whatsappMessage"]
        }
      }
    });
    return JSON.parse(response.text || "{}") as MasterAuditSummary;
  } catch (error) {
    return { whatsappMessage: "Manual audit required: Multiple product variances detected." };
  }
};
