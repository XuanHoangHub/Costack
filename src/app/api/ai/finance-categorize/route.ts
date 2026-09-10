import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { description, amount, model, temperature } = await readAiJson<{
      description?: string;
      amount?: number;
      model?: string;
      temperature?: number;
    }>(request);

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp mô tả giao dịch." },
        { status: 400 }
      );
    }

    const client = await getAuthorizedGeminiClient(request);

    const prompt = `Phân tích giao dịch sau để xác định loại giao dịch và danh mục tài chính phù hợp:
Mô tả: "${description}"
${amount ? `Số tiền: ${amount}` : ''}

Hãy chọn:
- type: "income" hoặc "expense"
- category: Một trong các danh mục phổ biến như ("Ăn uống", "Đi lại / Xăng xe", "Phần mềm / Công nghệ", "Văn phòng phẩm", "Lương / Nhân sự", "Tiếp khách", "Quảng cáo / Marketing", "Điện nước / Internet", "Doanh thu bán hàng", "Thù lao dịch vụ", "Đầu tư", "Chi phí khác")
- suggestedTags: Mảng gồm 1 đến 3 từ khóa/nhãn ngắn gọn
- confidence: Độ tin cậy của đề xuất từ 0 đến 1`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction: "Bạn là chuyên gia kế toán và tài chính thông minh. Phân tích ngữ nghĩa mô tả giao dịch và trả về kết quả JSON chính xác theo đúng cấu trúc schema.",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : 0.2,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ["income", "expense"],
              description: "Loại giao dịch: income (thu) hoặc expense (chi)"
            },
            category: {
              type: Type.STRING,
              description: "Tên danh mục phù hợp nhất"
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Gợi ý 1-3 nhãn liên quan"
            },
            confidence: {
              type: Type.NUMBER,
              description: "Độ tin cậy của đề xuất từ 0 đến 1"
            }
          },
          required: ["type", "category", "suggestedTags"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text.trim());
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("AI Finance categorize error:", error);
    return NextResponse.json(
      { success: false, error: getAiErrorMessage(error, 'Lỗi khi phân loại giao dịch bằng AI') },
      { status: getAiErrorStatus(error) }
    );
  }
}
