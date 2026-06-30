import { GoogleGenAI } from "@google/genai";

export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    throw new Error("GEMINI_API_KEY is missing. Vui lòng thiết lập API key trong môi trường hoặc trong Cài đặt.");
  }
  
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'avaxa-productivity',
      }
    }
  });
}
