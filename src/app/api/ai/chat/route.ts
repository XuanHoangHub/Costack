import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { message, history } = await request.json();
    const client = getGeminiClient();

    const systemPrompt = "Bạn là Avaxa Brain, siêu trợ lý AI được tích hợp trong hệ điều hành năng suất Avaxa Productivity OS (lấy cảm hứng từ ClickUp và Lark). Bạn thông thạo tiếng Việt, chuyên nghiệp, hỗ trợ tối đa cho doanh nghiệp và đội ngũ. Hãy trả lời ngắn gọn, tinh gọn, hữu ích và trực quan.";

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý AI" }, { status: 500 });
  }
}
