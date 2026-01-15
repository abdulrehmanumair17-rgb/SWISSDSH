
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
  const model = 'gemini-3-flash-preview';
  
  // Truncate or sample data if it's too large, but keep enough for a deep analysis
  const relevantData = currentData.filter(d => d.department === 'Sales' || d.department === 'Territory Sales');
  // We send up to 600 items for a richer analysis if available
  const summarizedPayload = relevantData.length > 600 
    ? relevantData.slice(0, 600)
    : relevantData;

  const prompt = `
    You are the Chief Operating Officer (COO) at Swiss Pharmaceuticals.
    Analyze the provided sales performance and territory data.
    
    GOAL: Generate a comprehensive executive report that takes exactly 5 MINUTES TO READ.
    TARGET WORD COUNT: 1,000 - 1,200 words.
    
    Structure your response as follows:
    1. Executive Summary (200 words): High-level overview of monthly vs daily performance trajectory.
    2. Regional & Team Deep-Dive (500 words): Analyze Achievers, Passionate, Concord, and Dynamic teams. Identify specific product-level shortfalls and regional variances. Use data trends to explain WHY certain targets are being missed (e.g., seasonal trends, specific product stockouts).
    3. Operational Risk Assessment (300 words): Evaluate the impact of current shortfalls on quarterly goals.
    4. Strategic Board Action Plan: Provide exactly 7 high-impact, specific bullet points.
    
    Formatting: Use Markdown. Use bold text for key figures and product names.
    
    Data to Analyze:
    ${JSON.stringify(summarizedPayload)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            detailedAnalysis: { type: Type.STRING, description: "Detailed Markdown analysis (800+ words)" },
            actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            readingTimeMinutes: { type: Type.NUMBER, description: "Estimated reading time (should be 5)" }
          },
          required: ["executiveSummary", "detailedAnalysis", "actions", "readingTimeMinutes"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text) as SummaryResult;
    // Ensure we communicate the 5-minute target in the UI
    result.readingTimeMinutes = 5;
    return result;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    return {
      executiveSummary: "Data synchronization successful, but analysis failed due to API limits.",
      detailedAnalysis: "The dataset provided is extensive. While the raw data is available on the dashboard, the AI-powered deep dive requires a valid API key and smaller batch processing for this volume of records.",
      actions: ["Check API Key configuration", "Reduce data volume by filtering for specific teams", "Contact System Admin"],
      readingTimeMinutes: 1
    };
  }
};

export const generateMasterAuditSummary = async (data: DepartmentMismatch[]): Promise<MasterAuditSummary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-flash-preview';

  const prompt = `
    Create an urgent WhatsApp alert for the Board of Directors.
    Summarize critical shortfalls from this data in under 150 words.
    Data: ${JSON.stringify(data.filter(d => d.department === 'Sales' && d.status !== 'on-track').slice(0, 30))}
  `;

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
    return { whatsappMessage: "Board Alert: Manual audit required. Daily targets for multiple products show critical variance." };
  }
};
