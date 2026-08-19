import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { title, description, model, temperature } = await request.json();
    const client = await getAuthorizedGeminiClient(request);

    const prompt = `Từ công việc "${title}" có mô tả: "${description || 'Không có mô tả chi tiết'}". Hãy phân tích và đề xuất danh sách 3 đến 5 công việc phụ (subtasks) thực tế và khả thi cần hoàn thành.`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction: "Bạn là trưởng dự án thông thái. Hãy phân tích công việc và trả về kết quả dưới dạng JSON là một mảng chuỗi các subtasks có cấu trúc. Không giải thích dông dài, chỉ trả về JSON hợp lệ đại diện cho mảng chuỗi.",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : undefined,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "Mảng danh sách các đề xuất công việc phụ"
        }
      }
    });

    const text = response.text || "[]";
    const subtasks = JSON.parse(text.trim());
    return NextResponse.json({ success: true, subtasks });
  } catch (error: any) {
    console.error("Subtasks generation error:", error);
    return NextResponse.json({ 
      success: false, 
      subtasks: [
        "Xem xét tài liệu chi tiết công việc",
        "Thực hiện các bước triển khai chính",
        "Kiểm thử và đánh giá kết quả hoàn thiện"
      ],
      error: error.message || "Failed to contact Gemini, returned default fallback."
    });
  }
}
