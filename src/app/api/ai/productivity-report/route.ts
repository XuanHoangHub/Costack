import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, resolveModel } from '@/lib/aiServer';

export async function POST(request: Request) {
  try {
    const { tasks, members, model, temperature } = await request.json();
    const client = await getAuthorizedGeminiClient(request);

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeMembers = Array.isArray(members) ? members : [];

    // Calculate aggregated metrics
    const totalT = safeTasks.length;
    const completedT = safeTasks.filter((t: any) => t.status === 'completed').length;
    const inProgressT = safeTasks.filter((t: any) => t.status === 'inprogress').length;
    const urgentT = safeTasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high').length;
    const totalEst = safeTasks.reduce((acc: number, t: any) => acc + (Number(t.hoursEstimate) || 0), 0);
    const totalLog = safeTasks.reduce((acc: number, t: any) => acc + (Number(t.hoursLogged) || 0), 0);

    // Group member performance
    const memberMetrics = safeMembers.map((m: any) => {
      const mTasks = safeTasks.filter((t: any) => t.assigneeId === m.id);
      const mCompleted = mTasks.filter((t: any) => t.status === 'completed').length;
      const mHours = mTasks.reduce((acc: number, t: any) => acc + (Number(t.hoursLogged) || 0), 0);
      return {
        name: m.name,
        role: m.role,
        tasksCount: mTasks.length,
        completedCount: mCompleted,
        hoursLogged: mHours
      };
    });

    const systemInstruction = `Bạn là Trưởng ban Cố vấn Năng suất & Chiến lược Vận hành tối cao của hệ điều hành Apexa OS.
Nhiệm vụ của bạn là xem xét bức tranh tổng thể về tiến độ, thời lượng làm việc (Hours Estimate vs Hours Logged), phân bổ nguồn lực của toàn đội ngũ và viết một BÁO CÁO NĂNG SUẤT TUẦN (WEEKLY PRODUCTIVITY INTELLIGENCE REPORT) thật sâu sắc, thực tế, chuyên nghiệp và truyền cảm hứng.
Hãy sử dụng định dạng Markdown cao cấp: Tiêu đề rõ ràng, icon trực quan, số liệu in đậm, bảng biểu nếu cần. Giọng văn sắc bén, thẳng thắn, thông minh và khích lệ.`;

    const prompt = `Dưới đây là bức tranh dữ liệu tổng hợp của tuần vừa qua:
- Tổng số lượng công việc: ${totalT} (Đã hoàn thành: ${completedT}, Đang làm: ${inProgressT}, Khẩn cấp/Quan trọng: ${urgentT})
- Tổng số giờ ước tính: ${totalEst} giờ
- Tổng số giờ thực tế đã cống hiến: ${totalLog} giờ
- Thống kê chi tiết thành viên:
${JSON.stringify(memberMetrics, null, 2)}

Yêu cầu báo cáo bao gồm 4 phần chính bằng Tiếng Việt:
### 1. Tổng Quan Sức Khỏe Dự Án
- Đánh giá tổng quát tỉ lệ hoàn thành nhiệm vụ (${completedT}/${totalT}) và tiến độ sức khỏe dự án tuần này.
### 2. Phân Tích Hiệu Suất & Thời Gian (Hours Logged)
- Nhận định về tổng số giờ ước tính (${totalEst}h) so với tổng số giờ thực tế đã cống hiến (${totalLog}h). Đưa ra phân tích thông thái về việc ước lượng của đội ngũ và tỷ lệ phân phối thời gian tiêu hao.
### 3. Bản Đồ Đóng Góp Đội Ngũ (Team Patterns)
- Phân tích chi tiết đóng góp của các thành viên trực thuộc dựa trên lượng task họ làm và số giờ họ log. Đưa ra điểm lưu ý điều phối nhân sự.
### 4. Khuyến Nghị Chiến Lược Tuần Tới
- Đề xuất 3 hành động cụ thể và khả thi để tinh giản quy trình quản trị, cân bằng lại khối lượng tải của teammates và tăng tốc độ phân giao.`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction,
        temperature: temperature !== undefined ? temperature : 0.5,
      }
    });

    return NextResponse.json({ success: true, text: response.text });
  } catch (error: any) {
    console.error("Productivity Report error:", error);
    return NextResponse.json({ success: false, error: getAiErrorMessage(error, 'Lỗi tạo báo cáo AI') }, { status: getAiErrorStatus(error) });
  }
}
