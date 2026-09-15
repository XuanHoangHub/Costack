const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface AiTaskContext {
  totalTasks?: number;
  dueTodayCount?: number;
  overdueCount?: number;
  completedCount?: number;
  highPriorityTasks?: string[];
}

export async function askApexaAi(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: string }> = [],
  context?: AiTaskContext
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        context,
      }),
    });

    if (!response.ok) {
      // Fallback simulated intelligent response if backend API is unreachable in mobile local testing
      return generateAiFallback(message, context);
    }

    const data = await response.json();
    return data.reply || data.content || generateAiFallback(message, context);
  } catch (error) {
    console.log('AI API fetch failed, using smart fallback response:', error);
    return generateAiFallback(message, context);
  }
}

function generateAiFallback(prompt: string, context?: AiTaskContext): string {
  const lower = prompt.toLowerCase();
  const dueToday = context?.dueTodayCount ?? 0;
  const overdue = context?.overdueCount ?? 0;
  const completed = context?.completedCount ?? 0;
  const total = context?.totalTasks ?? 0;
  const highPriority = context?.highPriorityTasks ?? [];

  if (lower.includes('hôm nay') || lower.includes('briefing') || lower.includes('today')) {
    let briefing = `📋 **Bản tin năng suất hôm nay**:\n\n`;
    briefing += `• Tổng cộng: **${total} công việc** (${completed} đã xong)\n`;
    if (dueToday > 0) {
      briefing += `• Cần hoàn thành hôm nay: **${dueToday} việc** ⏰\n`;
    } else {
      briefing += `• Không có công việc nào tới hạn hôm nay. Tuyệt vời! ✨\n`;
    }
    if (overdue > 0) {
      briefing += `• Cảnh báo: Có **${overdue} việc quá hạn** cần ưu tiên xử lý ngay ⚠️\n`;
    }
    if (highPriority.length > 0) {
      briefing += `\n🔥 **Việc ưu tiên cao nhất**:\n`;
      highPriority.slice(0, 3).forEach((title, idx) => {
        briefing += `${idx + 1}. ${title}\n`;
      });
    }
    briefing += `\n💡 *Mẹo: Hãy dành 25 phút Pomodoro để dứt điểm việc quan trọng nhất trước!*`;
    return briefing;
  }

  if (lower.includes('task') || lower.includes('việc') || lower.includes('subtask') || lower.includes('chia nhỏ')) {
    return '💡 **Gợi ý phương pháp chia nhỏ công việc (Work Breakdown)**:\n\n1. **Xác định mục tiêu rõ ràng**: Kết quả mong đợi sau khi hoàn thành là gì?\n2. **Tạo 3-5 subtasks cụ thể**: Mỗi subtask có thời lượng từ 15-45 phút.\n3. **Gán hạn chót ngắn hạn**: Tập trung xử lý từng phần một.\n4. **Ghi chú & Đánh giá**: Ghi lại khó khăn để Upgen AI tối ưu cho lần sau!';
  }

  if (lower.includes('ưu tiên') || lower.includes('prioritize')) {
    if (highPriority.length > 0) {
      let advice = `🎯 **Ma trận ưu tiên Upgen (Eisenhower Matrix)**:\n\n`;
      advice += `Các đầu việc cần bạn tập trung trước mắt:\n`;
      highPriority.forEach((title, i) => {
        advice += `• ${i + 1}. ${title}\n`;
      });
      advice += `\nKhuyên dùng: Hoàn thành các việc Khẩn cấp / Cao trước 12:00 trưa để giảm tải áp lực cuối ngày.`;
      return advice;
    }
    return `🎯 **Ma trận ưu tiên Upgen**:\n\n1. **Khẩn cấp & Quan trọng**: Xử lý ngay trong buổi sáng.\n2. **Quan trọng nhưng chưa gấp**: Lên lịch thực hiện cố định.\n3. **Ít quan trọng**: Ủy quyền hoặc dời lại.\n4. Hiện tại danh sách của bạn chưa có việc khẩn cấp nào!`;
  }

  return `🤖 **Upgen Brain Assistant**:\nTôi đã ghi nhận câu hỏi: "${prompt}".\n\nHệ thống AI của Upgen đang theo dõi **${total} công việc** của bạn trên toàn bộ không gian làm việc. Nếu bạn cần tôi phân tích tiến độ hoặc đề xuất lịch làm việc, hãy chọn các gợi ý nhanh bên dưới!`;
}
