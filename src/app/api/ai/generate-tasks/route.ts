import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { prompt, model, temperature } = await request.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: "Prompt không được để trống" }, { status: 400 });
    }
    const client = await getAuthorizedGeminiClient(request);

    const aiPrompt = `Based on the user request: "${prompt}". Analyze and propose a structured list of actionable tasks to accomplish it.`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: aiPrompt,
      config: {
        systemInstruction: "You are a professional Product Owner / Project Manager. Break down the user request into actionable tasks. Provide title, description, priority, estimated hours, relevant tags, and subtasks in the same language as the input prompt. Return a clean JSON matching the schema.",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : 0.7,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Clear task title in user's language" },
                  description: { type: Type.STRING, description: "Detailed task description in user's language" },
                  priority: { 
                    type: Type.STRING, 
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Task priority level"
                  },
                  hoursEstimate: { type: Type.INTEGER, description: "Estimated hours to complete (e.g. 2, 4, 8, 12)" },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Relevant task tags (e.g. Design, Frontend, Backend, API, Marketing, Research, DevOps)"
                  },
                  subtasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2 to 4 concrete subtasks"
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
    return NextResponse.json({
      success: false,
      tasks: [
        {
          title: "Thiết kế & Lên kế hoạch",
          description: "Phân tích yêu cầu và phác thảo các bước triển khai chi tiết.",
          priority: "high",
          hoursEstimate: 4,
          tags: ["Planning"],
          subtasks: ["Phân tích yêu cầu", "Lập dàn ý các bước", "Xác nhận với nhóm"]
        },
        {
          title: "Thực thi tính năng chính",
          description: "Xây dựng các thành phần và tích hợp chức năng theo yêu cầu.",
          priority: "medium",
          hoursEstimate: 8,
          tags: ["Development"],
          subtasks: ["Phát triển giao diện", "Kết nối dữ liệu", "Xử lý trường hợp biên"]
        },
        {
          title: "Kiểm thử & Bàn giao",
          description: "Kiểm tra chất lượng, sửa lỗi phát sinh và hoàn thiện.",
          priority: "low",
          hoursEstimate: 2,
          tags: ["QA"],
          subtasks: ["Kiểm thử chức năng", "Khắc phục lỗi", "Hoàn tất bàn giao"]
        }
      ],
      error: error.message || "Failed to contact Gemini, returned default fallback."
    });
  }
}
