import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel, createAiStreamResponse } from '@/lib/aiServer';

export async function POST(request: Request) {
  try {
    const { message, history, context, taskContext, model, temperature, googleSearch, stream: wantStream } = await readAiJson<any>(request);
    const client = await getAuthorizedGeminiClient(request, 512_000);

    let systemPrompt = `You are Costack AI Agent, an autonomous productivity assistant integrated into Costack OS. You are fluent in English and Vietnamese, professional, helpful, concise, and structured. Always respond in the same language that the user uses or requests.
When asked to create tasks, organize sprints, plan projects, or update statuses, explain your suggestion and ALWAYS append a structured JSON action block in \`\`\`action ... \`\`\` format:
- For creating a task:
\`\`\`action
{ "action": "create_task", "title": "Task title", "priority": "high"|"medium"|"low", "dueDate": "YYYY-MM-DD", "description": "...", "subtasks": ["..."] }
\`\`\`
- For multiple tasks:
\`\`\`action
{ "action": "create_multiple_tasks", "tasks": [{ "title": "...", "priority": "high", "dueDate": "YYYY-MM-DD" }] }
\`\`\`
- For updating task:
\`\`\`action
{ "action": "update_task", "taskId": "...", "status": "completed"|"inprogress"|"todo" }
\`\`\`
The Costack UI will automatically convert this block into an interactive 1-click execution card for the user.`;

    const stringContext = taskContext || (typeof context === 'string' ? context : null);
    if (stringContext) {
      systemPrompt += `\n\nBỐI CẢNH CÔNG VIỆC/SPACE ĐANG LÀM VIỆC:\n${stringContext}`;
    } else if (context && typeof context === 'object') {
      systemPrompt += `\n\nTHÔNG TIN BỐI CẢNH DỰ ÁN THỜI GIAN THỰC CỦA NGƯỜI DÙNG:
- Tổng số công việc: ${context.totalTasks ?? 'Chưa rõ'}
- Việc đến hạn hôm nay: ${context.dueTodayCount ?? 0}
- Việc quá hạn: ${context.overdueCount ?? 0}
- Việc đã hoàn thành: ${context.completedCount ?? 0}
${Array.isArray(context.highPriorityTasks) && context.highPriorityTasks.length > 0 ? `- Công việc ưu tiên cao/khẩn cấp: ${context.highPriorityTasks.join(', ')}` : ''}
Hãy tham chiếu dữ liệu này một cách tự nhiên và chính xác khi người dùng hỏi về tiến độ, công việc gấp hoặc kế hoạch làm việc.`;
    }

    // Map history to Content[] format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        // Handle standard Gemini format or Client message formats
        if (msg.role && msg.parts) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: typeof msg.parts === "string" ? [{ text: msg.parts }] : msg.parts
          });
        } else if (msg.senderId && msg.content) {
          contents.push({
            role: msg.senderId === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      });
    }

    // Append the latest user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const config: any = {
      systemInstruction: systemPrompt,
      temperature: temperature !== undefined ? temperature : 0.7,
    };

    if (googleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Streaming mode: return SSE text/event-stream
    if (wantStream) {
      const responseStream = await client.models.generateContentStream({
        model: resolveModel(model),
        contents: contents,
        config: config
      });
      return createAiStreamResponse(responseStream);
    }

    // Legacy non-streaming mode for backward compatibility
    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: contents,
      config: config
    });

    const outputText = response.text || '';
    return NextResponse.json({ success: true, text: outputText, reply: outputText });
  } catch (error: any) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ success: false, error: getAiErrorMessage(error, 'Lỗi xử lý AI') }, { status: getAiErrorStatus(error) });
  }
}
