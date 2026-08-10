import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { title, content, action, model, temperature } = await request.json();
    const customApiKey = request.headers.get("x-gemini-api-key") || undefined;
    const client = getGeminiClient(customApiKey);

    let instruction = "";
    if (action === "summarize") {
      instruction = "Summarize this document concisely with bullet points and clear subheadings in the same language as the input text.";
    } else if (action === "improve") {
      instruction = "Rewrite this document with a polished, professional tone, fixing typos and improving sentence structure while retaining core meaning. Respond in the document's language.";
    } else if (action === "expand") {
      instruction = "Expand on key aspects of this document, adding necessary action items and structured sections. Respond in the document's language.";
    }

    const response = await client.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: `Document Title: "${title}"\nContent:\n${content}`,
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
