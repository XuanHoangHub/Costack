import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { image, mode, prompt, model, temperature } = await readAiJson<any>(request, 8_388_608);
    const client = await getAuthorizedGeminiClient(request, 8_388_608);

    if (!image) {
      return NextResponse.json({ success: false, error: "Image is required" }, { status: 400 });
    }

    // Extract base64 data and mimeType
    const base64Data = image.split(",")[1] || image;
    const mimeType = image.split(";")[0]?.split(":")[1] || "image/png";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const targetModel = resolveModel(model);

    if (mode === "tasks") {
      const response = await client.models.generateContent({
        model: targetModel,
        contents: [
          imagePart,
          "Hãy phân tích sơ đồ/bản vẽ trên bảng trắng (whiteboard) này và trích xuất một danh sách các công việc cụ thể cần thực hiện dưới dạng JSON theo đúng schema."
        ],
        config: {
          systemInstruction: "Bạn là một Trưởng dự án (Product Owner/Project Manager). Phân tích hình ảnh bản vẽ thiết kế, wireframe hoặc sơ đồ flowchart từ bảng trắng, đề xuất các công việc (tasks) tương ứng để triển khai dự án này. Trả về kết quả JSON khớp với schema bằng tiếng Việt.",
          responseMimeType: "application/json",
          temperature: temperature !== undefined ? temperature : undefined,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Tiêu đề công việc bằng tiếng Việt ngắn gọn" },
                    description: { type: Type.STRING, description: "Mô tả chi tiết những việc cần làm dựa trên sơ đồ bằng tiếng Việt" },
                    priority: { type: Type.STRING, enum: ["low", "medium", "high", "urgent"] },
                    hoursEstimate: { type: Type.INTEGER, description: "Ước lượng thời gian hoàn thành bằng giờ (ví dụ: 2, 4, 8)" },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    subtasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["title", "description", "priority", "hoursEstimate", "tags", "subtasks"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      });

      const text = response.text || '{"tasks":[]}';
      return NextResponse.json({ success: true, tasks: JSON.parse(text).tasks || [] });
    } else {
      // mode is 'explain' or 'optimize'
      const systemInstruction = mode === "optimize"
        ? "Bạn là Chuyên gia Kiến trúc Hệ thống & Tối ưu hóa Quy trình. Hãy phân tích bản vẽ bảng trắng và đề xuất các điểm cải tiến, phát hiện điểm nghẽn, hoặc lỗi thiết kế quy trình/kiến trúc bằng Tiếng Việt chuẩn mực."
        : "Bạn là siêu trợ lý AI Apexa Brain. Hãy giải thích và lập tài liệu mô tả chi tiết cho sơ đồ/bản vẽ bảng trắng được cung cấp. Phản hồi bằng Tiếng Việt lưu loát, cấu trúc Markdown rõ ràng.";

      const userPrompt = prompt || (mode === "optimize" ? "Hãy đề xuất các giải pháp tối ưu cho sơ đồ này." : "Hãy giải thích sơ đồ này.");

      const response = await client.models.generateContent({
        model: targetModel,
        contents: [imagePart, userPrompt],
        config: {
          systemInstruction,
          temperature: temperature !== undefined ? temperature : 0.5
        }
      });

      return NextResponse.json({ success: true, text: response.text });
    }
  } catch (error: any) {
    console.error("Whiteboard AI analysis error:", error);
    return NextResponse.json({ success: false, error: getAiErrorMessage(error, 'Failed to analyze whiteboard image') }, { status: getAiErrorStatus(error) });
  }
}
