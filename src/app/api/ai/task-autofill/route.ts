import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { title, description, context, model, temperature } = await readAiJson<any>(request);
    
    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Tiêu đề công việc là bắt buộc." }, { status: 400 });
    }

    const client = await getAuthorizedGeminiClient(request);

    const systemInstruction = `Bạn là Trợ lý Giám đốc Dự án và Quản lý Tác vụ Thông minh của Apexa OS.
Nhiệm vụ của bạn là phân tích tiêu đề công việc và mô tả ban đầu (nếu có) để tự động cấu hình và tối ưu hóa các thông số công việc giúp người dùng:
1. Độ ưu tiên (suggestedPriority): 'low' | 'medium' | 'high' | 'urgent' kèm lý do giải thích ngắn gọn (priorityReason).
2. Thời gian ước tính (suggestedHoursEstimate): số giờ thực tế hợp lý (ví dụ: 1, 2, 4, 8, 12, 16...).
3. Nhãn dán phù hợp (suggestedTags): mảng các tag liên quan như 'Design', 'Frontend', 'Backend', 'API', 'Bug', 'Marketing', 'Research', 'DevOps', 'Content'...
4. Công việc con (suggestedSubtasks): 3-5 việc con có thể thực hiện được theo trình tự logic.
5. Mô tả chi tiết (enhancedDescription): một bản mô tả công việc được cấu trúc rõ ràng theo chuẩn Markdown (Bao gồm: Mục tiêu chính, Các bước triển khai, Tiêu chí nghiệm thu). Viết bằng tiếng Việt tự nhiên, súc tích.

Hãy trả về JSON hợp lệ theo đúng cấu trúc Schema được định nghĩa.`;

    const prompt = `Phân tích và điền thông tin tối ưu cho công việc sau:
- Tiêu đề: "${title}"
- Mô tả sơ bộ: "${description || 'Chưa có'}"
${context ? `- Bối cảnh dự án/không gian: "${context}"` : ''}`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : 0.4,
        responseSchema: {
          type: Type.OBJECT,
          required: ["suggestedPriority", "priorityReason", "suggestedHoursEstimate", "suggestedTags", "suggestedSubtasks", "enhancedDescription"],
          properties: {
            suggestedPriority: { 
              type: Type.STRING, 
              enum: ["low", "medium", "high", "urgent"] 
            },
            priorityReason: { type: Type.STRING },
            suggestedHoursEstimate: { type: Type.NUMBER },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            suggestedSubtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            enhancedDescription: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text.trim());

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("Task autofill error:", error);
    return NextResponse.json(
      { success: false, error: getAiErrorMessage(error, 'Lỗi tự động điền công việc bằng AI') },
      { status: getAiErrorStatus(error) }
    );
  }
}
