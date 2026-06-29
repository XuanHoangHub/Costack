import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { task, assigneeName } = await request.json();
    if (!task) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin công việc." }, { status: 400 });
    }

    const client = getGeminiClient();

    const subtasksText = task.subtasks && task.subtasks.length > 0
      ? task.subtasks.map((s: any, idx: number) => `  ${idx + 1}. [${s.completed ? "x" : " "}] ${s.title}`).join("\n")
      : "  (Không có công việc phụ)";

    const tagsText = task.tags && task.tags.length > 0 ? task.tags.join(", ") : "Không có";

    const systemInstruction = `Bạn là Giám đốc Dự án và Cố vấn Vận hành thông thái của Avaxa Productivity OS.
Nhiệm vụ của bạn là lập một "Báo cáo Tóm tắt Trạng thái" (Status Report Summary) cực kỳ tinh tế, gãy gọn và giàu thông tin cho công việc được cung cấp.
Văn phong của bạn phải chuyên nghiệp, súc tích, mang hơi thở công nghệ hiện đại và ấm áp, viết hoàn toàn bằng tiếng Việt.
Hãy tận dụng định dạng Markdown (như sử dụng in đậm, các gạch đầu dòng có emoji phù hợp) để báo cáo dễ đọc và đẹp mắt.`;

    const contents = `Hãy thực hiện tóm tắt trạng thái và đưa ra nhận xét ngắn gọn cho công việc sau:

- **Tiêu đề**: ${task.title}
- **Mô tả công việc**: ${task.description || "Chưa có mô tả chi tiết"}
- **Mức độ ưu tiên**: ${task.priority ? task.priority.toUpperCase() : "MEDIUM"}
- **Trạng thái**: ${task.status ? task.status.toUpperCase() : "TODO"}
- **Tiến độ tổng quát**: ${task.progress || 0}%
- **Người thực hiện**: ${assigneeName || "Chưa phân công"}
- **Thời hạn (Due Date)**: ${task.dueDate || "Không giới hạn"}
- **Tags**: ${tagsText}
- **Thời gian (Log/Est)**: Ước lượng ${task.hoursEstimate || 0} giờ / Thực tế đã làm ${task.hoursLogged || 0} giờ

**Danh sách Checklist phụ (Subtasks)**:
${subtasksText}

Yêu cầu báo cáo bao gồm các mục tiêu chính sau (định dạng ngắn gọn, trực quan, không rườm rà):
1. 📊 **Trạng thái & Tiến độ Hiện tại**: Nhận xét ngắn gọn về tỉ lệ hoàn thiện công việc chung và danh sách checklist.
2. 💡 **Điểm mấu chốt & Khó khăn (nếu có)**: Nhận xét xem công việc có bị quá hạn, tỷ lệ log giờ có đột biến so với ước lượng không, hoặc các điểm đáng lưu ý.
3. 🎯 **Hành động Tiếp theo Đề xuất**: Đưa ra 2 hành động cụ thể để đẩy nhanh/hoàn tất công việc này.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Task summarize error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi tóm tắt công việc bằng AI" }, { status: 500 });
  }
}
