import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel, createAiStreamResponse } from '@/lib/aiServer';
import { analyzeTasks, serializeTaskIntelligence } from '@/lib/taskIntelligence';
import type { Task } from '@/types';

export async function POST(request: Request) {
  try {
    const {
      query,
      tasks,
      documents,
      members,
      model,
      temperature,
      googleSearch,
      now,
      stream: wantStream,
      history
    } = await readAiJson<any>(request);

    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const client = await getAuthorizedGeminiClient(request);
    const safeTasks = Array.isArray(tasks) ? tasks.slice(0, 500) as Task[] : [];
    const intelligence = analyzeTasks(safeTasks, typeof now === 'string' && !Number.isNaN(Date.parse(now)) ? new Date(now) : new Date());

    let contextString = "";
    if (safeTasks.length > 0) {
      contextString += "\n== PHÂN TÍCH CÔNG VIỆC THEO THỜI GIAN ==\n" + JSON.stringify(serializeTaskIntelligence(intelligence), null, 2);
      contextString += "\n== DANH SÁCH CÔNG VIỆC HIỆN TẠI ==\n" + JSON.stringify(safeTasks.map((t: Task) => ({
        id: t.id,
        title: t.title.slice(0, 200),
        description: t.description?.slice(0, 600),
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        progress: t.progress,
        subtasksCount: t.subtasks?.length || 0,
        subtasksCompleted: t.subtasks?.filter((s: any) => s.completed).length || 0
      })), null, 2);
    }
    
    if (Array.isArray(documents) && documents.length > 0) {
      contextString += "\n== DANH SÁCH TÀI LIỆU DỰ ÁN ==\n" + JSON.stringify(documents.slice(0, 50).map((d: any) => ({
        title: String(d.title || '').slice(0, 200),
        category: d.category,
        contentPreview: d.content?.slice(0, 400) + (d.content?.length > 400 ? "..." : "")
      })), null, 2);
    }

    if (Array.isArray(members) && members.length > 0) {
      contextString += "\n== DANH SÁCH THÀNH VIÊN ĐỘI NGŨ ==\n" + JSON.stringify(members.slice(0, 200).map((m: any) => ({
        name: m.name,
        role: m.role,
        status: m.status
      })), null, 2);
    }

    const completedTasksCount = safeTasks.filter(t => t.status === 'completed').length;
    const completionPercent = safeTasks.length > 0 ? Math.round((completedTasksCount / safeTasks.length) * 100) : 0;

    const systemPrompt = `Bạn là Costack AI Agent - Trí tuệ nhân tạo hành động chuyên sâu (Autonomous Project & Productivity Agent) tích hợp trực tiếp vào Costack OS.
Bạn không chỉ tư vấn và giải đáp, mà còn có năng lực thực thi trực tiếp các hành động quản lý dự án, tối ưu hóa tiến độ và giải quyết công việc.
Thời điểm phân tích hiện tại: ${intelligence.generatedAt}. Hãy dùng chính xác nhóm overdue/dueToday/dueTomorrow đã được hệ thống tính sẵn, không tự suy diễn múi giờ.
Bạn nói cùng ngôn ngữ với người dùng (tiếng Việt hoặc tiếng Anh), phong thái chuyên nghiệp, mạch lạc, súc tích và hành động.

== BỐI CẢNH DỰ ÁN THỜI GIAN THỰC (REAL-TIME WORKSPACE CONTEXT) ==
${contextString}

== QUY TẮC VÀ NĂNG LỰC HÀNH ĐỘNG AGENT (AGENT ACTION CAPABILITIES) ==
Khi người dùng yêu cầu tạo việc, lên kế hoạch, phân rã công việc, cập nhật trạng thái, thêm checklist, xóa task hoặc xuất báo cáo:
1. Giải thích giải pháp và phân tích một cách ngắn gọn, súc tích, logic.
2. LUÔN đính kèm khối JSON hành động có cú pháp \`\`\`action ... \`\`\` (hoặc \`\`\`json chứa "action") ở cuối câu trả lời. Giao diện Costack sẽ tự động chuyển khối này thành Thẻ Hành Động Tương Tác (Action Card) để người dùng thực thi với 1 click:

- Tạo 1 công việc (Single task):
\`\`\`action
{
  "action": "create_task",
  "title": "Tên công việc rõ ràng",
  "priority": "urgent" | "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD",
  "description": "Mô tả chi tiết mục tiêu",
  "subtasks": ["Việc phụ 1", "Việc phụ 2"]
}
\`\`\`

- Lập kế hoạch nhiều công việc (Batch sprint/project planning):
\`\`\`action
{
  "action": "create_multiple_tasks",
  "tasks": [
    { "title": "Công việc 1", "priority": "high", "dueDate": "YYYY-MM-DD", "description": "..." },
    { "title": "Công việc 2", "priority": "medium", "dueDate": "YYYY-MM-DD", "description": "..." }
  ]
}
\`\`\`

- Cập nhật công việc (Status, Priority, Due Date):
\`\`\`action
{
  "action": "update_task",
  "taskId": "id_hoặc_tên_công_việc",
  "status": "completed" | "inprogress" | "todo",
  "priority": "urgent" | "high" | "medium" | "low",
  "dueDate": "YYYY-MM-DD"
}
\`\`\`

- Thêm danh sách việc phụ / checklist vào công việc hiện có:
\`\`\`action
{
  "action": "add_subtasks",
  "taskId": "id_hoặc_tên_công_việc",
  "taskTitle": "Tên công việc",
  "subtasks": ["Checklist 1", "Checklist 2", "Checklist 3"]
}
\`\`\`

- Xóa công việc đã hoàn thành hoặc không còn cần thiết:
\`\`\`action
{
  "action": "delete_task",
  "taskId": "id_hoặc_tên_công_việc",
  "taskTitle": "Tên công việc cần xóa"
}
\`\`\`

- Xuất báo cáo tổng quan dự án (Executive Project Report):
\`\`\`action
{
  "action": "project_report",
  "title": "Báo cáo tiến độ dự án",
  "summary": "Tóm tắt ngắn gọn tình hình dự án hiện tại...",
  "metrics": {
    "totalTasks": ${safeTasks.length},
    "completed": ${completedTasksCount},
    "overdue": ${intelligence.overdue.length},
    "completionRate": ${completionPercent}
  },
  "risks": ["Rủi ro 1", "Rủi ro 2"],
  "nextSteps": ["Bước ưu tiên 1", "Bước ưu tiên 2"]
}
\`\`\`

Luôn dùng bảng Markdown, gạch đầu dòng, icon và in đậm để trình bày khoa học, chuyên nghiệp.`;

    // Multi-turn contents array
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-14).forEach((msg: any) => {
        const role = msg.sender === 'user' || msg.role === 'user' ? 'user' : 'model';
        const text = typeof msg.text === 'string' ? msg.text : (typeof msg.content === 'string' ? msg.content : '');
        if (text && text.trim()) {
          contents.push({
            role,
            parts: [{ text: text.trim() }]
          });
        }
      });
    }

    // Append latest user turn
    contents.push({
      role: 'user',
      parts: [{ text: query.trim() }]
    });

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: temperature !== undefined ? temperature : 0.4,
    };

    if (googleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const resolvedModelName = resolveModel(model);

    // Streaming mode: return SSE text/event-stream with intelligence metadata
    if (wantStream) {
      const responseStream = await client.models.generateContentStream({
        model: resolvedModelName,
        contents: contents,
        config: config
      });
      return createAiStreamResponse(responseStream, {
        intelligence: serializeTaskIntelligence(intelligence),
      });
    }

    // Legacy non-streaming mode
    const response = await client.models.generateContent({
      model: resolvedModelName,
      contents: contents,
      config: config
    });

    return NextResponse.json({ success: true, text: response.text, intelligence: serializeTaskIntelligence(intelligence) });
  } catch (error: any) {
    console.error("Apexa Context Query error:", error);
    return NextResponse.json({ success: false, error: getAiErrorMessage(error, 'Lỗi xử lý bối cảnh AI') }, { status: getAiErrorStatus(error) });
  }
}
