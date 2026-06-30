import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { query, tasks, documents, members, model, temperature, googleSearch } = await request.json();
    const customApiKey = request.headers.get("x-gemini-api-key") || undefined;
    const client = getGeminiClient(customApiKey);

    let contextString = "";
    if (tasks && tasks.length > 0) {
      contextString += "\n== DANH SÁCH CÔNG VIỆC HIỆN TẠI ==\n" + JSON.stringify(tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        progress: t.progress,
        subtasksCount: t.subtasks?.length || 0,
        subtasksCompleted: t.subtasks?.filter((s: any) => s.completed).length || 0
      })), null, 2);
    }
    
    if (documents && documents.length > 0) {
      contextString += "\n== DANH SÁCH TÀI LIỆU DỰ ÁN ==\n" + JSON.stringify(documents.map((d: any) => ({
        title: d.title,
        category: d.category,
        contentPreview: d.content?.slice(0, 400) + (d.content?.length > 400 ? "..." : "")
      })), null, 2);
    }

    if (members && members.length > 0) {
      contextString += "\n== DANH SÁCH THÀNH VIÊN ĐỘI NGŨ ==\n" + JSON.stringify(members.map((m: any) => ({
        name: m.name,
        role: m.role,
        status: m.status
      })), null, 2);
    }

    const systemPrompt = `Bạn là Avaxa Brain, bộ óc thông thái tối cao của hệ điều hành năng suất Avaxa. Bạn có quyền truy cập trực tiếp vào bối cảnh thời gian thực của dự án (công việc, tài liệu, đồng nghiệp).
Hãy trả lời câu hỏi của người dùng một cách chính xác, thông minh và tinh tế. Bạn nói tiếng Việt chuyên nghiệp, lưu loát, ấm áp và truyền cảm hứng.
Sử dụng các bảng biểu, gạch đầu dòng, in đậm để định dạng câu trả lời khoa học, trực quan như một chuyên gia vận hành thứ thiệt.`;

    const contents = `YÊU CẦU CỦA USER: "${query}"\n\nBỐI CẢNH DỰ ÁN HIỆN TẠI ĐỂ PHÂN TÍCH:\n${contextString}`;

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: temperature !== undefined ? temperature : 0.4,
    };

    if (googleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await client.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: contents,
      config: config
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Avaxa Context Query error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi xử lý bối cảnh AI" }, { status: 500 });
  }
}
