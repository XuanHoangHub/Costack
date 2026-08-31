import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { title, description, model, temperature } = await readAiJson<any>(request);
    const client = await getAuthorizedGeminiClient(request);

    const prompt = `Hãy phân tích tiêu đề công việc: "${title}" và mô tả chi tiết: "${description || 'Không có mô tả chi tiết'}".
Dựa trên ý nghĩa ngữ cảnh và các từ khoá, hãy gợi ý các nhãn phù hợp từ danh sách sau: ['Design', 'Frontend', 'Backend', 'Bugs', 'API', 'Marketing', 'Research', 'DevOps'].`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction: "Bạn là một PM thông thái. Hãy rà soát nội dung công việc và trả về danh sách các nhãn phù hợp dưới dạng mảng JSON chứa các chuỗi nhãn dán. Không giải thích gì thêm, chỉ trả về chuỗi JSON đại diện cho mảng các chuỗi, ví dụ: [\"Design\", \"Frontend\"].",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : undefined,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "Mảng danh sách các nhãn dán phù hợp"
        }
      }
    });

    const text = response.text || "[]";
    const tags = JSON.parse(text.trim());
    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error("AI Tags suggestion error:", error);
    return NextResponse.json(
      { success: false, tags: [], error: getAiErrorMessage(error, 'Lỗi khi gợi ý nhãn bằng AI') },
      { status: getAiErrorStatus(error) },
    );
  }
}
