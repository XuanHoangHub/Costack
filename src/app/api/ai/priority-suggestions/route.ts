import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { tasks } = await request.json();
    const client = getGeminiClient();

    const inputTasks = (tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate || "Chưa đặt",
      subtasksCount: t.subtasks?.length || 0,
      hoursEstimate: t.hoursEstimate || 0,
    }));

    const systemInstruction = `Bạn là Giám đốc Dự án và Chuyên gia tối ưu hóa hiệu suất thông minh của Avaxa OS.
Nhiệm vụ của bạn là phân tích danh sách công việc hiện có (đặc biệt chú ý đến DEADLINE và ĐỘ KHÓ tự đánh giá từ mô tả/tên việc/ước lượng thời gian/số lượng công việc phụ) để đưa ra đề xuất ƯU TIÊN hành động tối ưu giúp người dùng tập trung vào các việc quan trọng nhất.

Hãy trả về một phản hồi JSON có cấu trúc chính xác như sau:
{
  "suggestions": [
    {
      "taskId": "ID của công việc",
      "taskTitle": "Tên công việc",
      "estimatedDifficulty": "Dễ" | "Trung bình" | "Khó" | "Cực kỳ khó",
      "analysis": "Phân tích ngắn gọn (khoảng 1-2 câu tiếng Việt) giải thích tại sao công việc này quan trọng, liên kết trực tiếp giữa độ khó và deadline (ví dụ: công việc Khó nhưng sắp hết hạn cần ưu tiên trước)",
      "suggestedPriority": "URGENT" | "HIGH" | "MEDIUM" | "LOW",
      "reasoningScore": 1-100 (điểm số mức độ ưu tiên/khẩn cấp từ cao đến thấp: 100 là cực kỳ khẩn, 1 là ít khẩn hơn)
    }
  ],
  "generalSummary": "Tóm tắt chiến lược hành động hôm nay (khoảng 3-4 câu tiếng Việt) khuyên người dùng nên tập trung vào cụm công việc nào trước, phối hợp quy tắc khẩn cấp Eisenhower hoặc bóc tách việc khó trước."
}

Chỉ trả về JSON hợp lệ theo đúng cấu trúc trên. Không giải thích dông dài ngoài JSON.`;

    const promptMessage = `Hãy phân tích bối cảnh danh sách công việc thời gian thực này để đề xuất thứ tự ưu tiên tối ưu:\n\n${JSON.stringify(inputTasks, null, 2)}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["suggestions", "generalSummary"],
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["taskId", "taskTitle", "estimatedDifficulty", "analysis", "suggestedPriority", "reasoningScore"],
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  estimatedDifficulty: { type: Type.STRING },
                  analysis: { type: Type.STRING },
                  suggestedPriority: { type: Type.STRING },
                  reasoningScore: { type: Type.INTEGER }
                }
              }
            },
            generalSummary: { type: Type.STRING }
          }
        },
        temperature: 0.3,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Priority suggestions error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi phân tích thứ tự ưu tiên" }, { status: 500 });
  }
}
