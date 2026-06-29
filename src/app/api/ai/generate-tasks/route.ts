import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: "Prompt không được để trống" }, { status: 400 });
    }
    const client = getGeminiClient();

    const aiPrompt = `Dựa trên yêu cầu của người dùng: "${prompt}". Hãy phân tích và đề xuất một danh sách các công việc cụ thể cần thực hiện để hoàn thành yêu cầu đó.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: aiPrompt,
      config: {
        systemInstruction: "Bạn là một Trưởng dự án (Product Owner/Project Manager) chuyên nghiệp. Hãy phân tách yêu cầu của người dùng thành các công việc nhỏ (tasks), gán cho chúng mức độ ưu tiên, số giờ ước lượng phù hợp, nhãn dán, và danh sách công việc con (subtasks). Trả về kết quả dưới dạng JSON theo đúng schema được định nghĩa.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Tiêu đề công việc ngắn gọn, rõ ràng, bằng tiếng Việt" },
                  description: { type: Type.STRING, description: "Mô tả chi tiết những việc cần làm, bằng tiếng Việt" },
                  priority: { 
                    type: Type.STRING, 
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Mức độ ưu tiên của công việc"
                  },
                  hoursEstimate: { type: Type.INTEGER, description: "Số giờ ước lượng cần để hoàn thành (ví dụ: 2, 4, 8, 12, 16)" },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Các tag phù hợp cho công việc (ví dụ: Design, Frontend, Backend, API, Marketing, Research, DevOps)"
                  },
                  subtasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Danh sách 2-4 công việc con cần làm để hoàn thành nhiệm vụ này"
                  }
                },
                required: ["title", "description", "priority", "hoursEstimate", "tags", "subtasks"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const text = response.text || "{\"tasks\":[]}";
    const result = JSON.parse(text.trim());
    return NextResponse.json({ success: true, tasks: result.tasks || [] });
  } catch (error: any) {
    console.error("Generate tasks error:", error);
    // Return friendly local fallback if API fails
    return NextResponse.json({
      success: false,
      tasks: [
        {
          title: "Thiết kế giao diện người dùng (UI/UX Design)",
          description: "Phác thảo wireframe và thiết kế chi tiết giao diện cho tính năng mới dựa trên yêu cầu.",
          priority: "high",
          hoursEstimate: 8,
          tags: ["Design"],
          subtasks: ["Phác thảo layout", "Thiết kế Figma mockup", "Nhận phản hồi từ team"]
        },
        {
          title: "Phát triển mã nguồn tính năng mới (Development)",
          description: "Xây dựng mã nguồn cho frontend và tích hợp các API liên quan.",
          priority: "medium",
          hoursEstimate: 12,
          tags: ["Frontend", "API"],
          subtasks: ["Viết component UI", "Kết nối API dữ liệu", "Xử lý lỗi biên dịch"]
        },
        {
          title: "Kiểm thử và triển khai (Testing & Deploy)",
          description: "Chạy thử nghiệm tính năng, sửa các lỗi phát sinh và hoàn tất quy trình deploy.",
          priority: "low",
          hoursEstimate: 4,
          tags: ["Testing"],
          subtasks: ["Viết unit test", "Sửa lỗi CSS/JS", "Deploy bản cập nhật"]
        }
      ],
      error: error.message || "Failed to contact Gemini, returned default fallback."
    });
  }
}
