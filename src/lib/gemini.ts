import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./secrets";

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

export async function generateWithFallback(contents: any[], config: any) {
  const apiKey = await getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const errors: string[] = [];

  for (const model of MODELS) {
    try {
      console.log(`[Gemini API] Attempting generation with ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });
      return response;
    } catch (error: any) {
      console.warn(`[Gemini API] Model ${model} failed: ${error.message}`);
      
      // If it's a 429 (Rate Limit) or 503 (High Demand), we try the next model
      if (error.status === 429) {
        errors.push(`${model}: Rate limit exceeded (429)`);
      } else if (error.status === 503) {
        errors.push(`${model}: High demand (503)`);
      } else {
        errors.push(`${model}: ${error.message}`);
      }
      // Continue to the next model in the array
    }
  }
  
  // If we exhaust all models, categorize the error
  const isRateLimit = errors.some(e => e.includes("429"));
  const isHighDemand = errors.some(e => e.includes("503"));
  
  if (isRateLimit) {
    throw new Error("You're reflecting too fast! You've hit the free tier rate limit. Please wait a moment and try again.");
  }
  
  if (isHighDemand) {
    throw new Error("The AI models are currently experiencing extremely high demand. Please try again in a few moments.");
  }
  
  // Otherwise, throw a clear aggregate error
  console.error("[Gemini API] All fallback models failed. Errors:", errors);
  throw new Error(`AI Generation failed. Please try again later. (Internal details: ${errors.join(" | ")})`);
}
