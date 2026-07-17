import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { message, history, model, temperature, googleSearch } = await request.json();
    const customApiKey = request.headers.get("x-gemini-api-key") || undefined;
    const client = getGeminiClient(customApiKey);

    const systemPrompt = "Bạn là Avaxa Brain, siêu trợ lý AI được tích hợp trong hệ điều hành năng suất Avaxa Productivity OS. Bạn thông thạo tiếng Việt, chuyên nghiệp, hỗ trợ tối đa cho doanh nghiệp và đội ngũ. Hãy trả lời ngắn gọn, tinh gọn, hữu ích và trực quan.";

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
