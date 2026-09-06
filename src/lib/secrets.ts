import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let geminiApiKeyCache: string | null = null;

export async function getGeminiApiKey(): Promise<string> {
  // Use local env var if available (local development)
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  // Otherwise fetch from Secret Manager (production on Cloud Run)
  if (geminiApiKeyCache) return geminiApiKeyCache;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  const client = new SecretManagerServiceClient();
  const name = `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;
  
  try {
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) throw new Error("Empty secret payload");
    
    geminiApiKeyCache = payload.trim();
    return geminiApiKeyCache;
  } catch (error) {
    console.error("Failed to fetch GEMINI_API_KEY from Secret Manager:", error);
    throw new Error("Missing Gemini API Key");
  }
}
