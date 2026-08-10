import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { message, history, model, temperature, googleSearch } = await request.json();
    const customApiKey = request.headers.get("x-gemini-api-key") || undefined;
    const client = getGeminiClient(customApiKey);

    const systemPrompt = "You are Avaxa Brain, the AI assistant integrated into Avaxa Productivity OS. You are fluent in English and Vietnamese, professional, helpful, concise, and structured. Always respond in the same language that the user uses or requests.";

    // Map history to Content[] format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        // Handle standard Gemini format or Client message formats
        if (msg.role && msg.parts) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: typeof msg.parts === "string" ? [{ text: msg.parts }] : msg.parts
          });
        } else if (msg.senderId && msg.content) {
          contents.push({
            role: msg.senderId === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      });
    }

    // Append the latest user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: temperature !== undefined ? temperature : 0.7,
    };

    if (googleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await client.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: contents,
      config: config
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý AI" }, { status: 500 });
  }
}
