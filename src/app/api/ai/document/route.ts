import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { title, content, action, model, temperature } = await request.json();
    const customApiKey = request.headers.get("x-gemini-api-key") || undefined;
    const client = getGeminiClient(customApiKey);

    let instruction = "";
    if (action === "summarize") {
      instruction = "Hãy tóm tắt văn bản này thành một bản tóm tắt ngắn, dễ đọc, sử dụng gạch đầu dòng và tiêu đề con tinh tế bằng tiếng Việt.";
    } else if (action === "improve") {
      instruction = "Hãy viết lại nội dung văn bản này với phong cách chuyên nghiệp hơn, sửa lỗi chính tả, cải thiện cấu trúc câu nhưng vẫn giữ nguyên ý nghĩa cốt lõi.";
    } else if (action === "expand") {
      instruction = "Hãy mở rộng chi tiết thêm các khía cạnh liên quan, bổ sung các hành động cần thiết và cấu trúc tổ chức cho tài liệu này.";
    }

    const response = await client.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: `Tên tài liệu: "${title}"\nNội dung:\n${content}`,
      config: {
        systemInstruction: instruction,
        temperature: temperature !== undefined ? temperature : 0.6,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Document AI error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý AI tài liệu" }, { status: 500 });
  }
}
