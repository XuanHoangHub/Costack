import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus } from '@/lib/aiServer';

export async function POST(request: Request) {
  try {
    const { tasks, members, model, temperature } = await request.json();
    const client = await getAuthorizedGeminiClient(request);

    const totalT = (tasks || []).length;
    const completedT = (tasks || []).filter((t: any) => t.status === "completed").length;
    const reviewT = (tasks || []).filter((t: any) => t.status === "review").length;
    const inProgressT = (tasks || []).filter((t: any) => t.status === "inprogress").length;
    const todoT = (tasks || []).filter((t: any) => t.status === "todo").length;

    let totalEst = 0;
    let totalLog = 0;
    (tasks || []).forEach((t: any) => {
      totalEst += t.hoursEstimate || 0;
      totalLog += t.hoursLogged || 0;
    });

    const assigneeStats: Record<string, { total: number, completed: number, hoursLogged: number, name: string }> = {};
    (members || []).forEach((m: any) => {
      assigneeStats[m.id] = { total: 0, completed: 0, hoursLogged: 0, name: m.name };
    });

    (tasks || []).forEach((t: any) => {
      const assId = t.assigneeId || "unassigned";
      if (!assigneeStats[assId]) {
        assigneeStats[assId] = { total: 0, completed: 0, hoursLogged: 0, name: "Chưa phân công" };
      }
      assigneeStats[assId].total += 1;
      if (t.status === "completed") {
        assigneeStats[assId].completed += 1;
      }
      assigneeStats[assId].hoursLogged += (t.hoursLogged || 0);
    });

    const datasetSummary = {
      taskOverview: { total: totalT, completed: completedT, inProgress: inProgressT, review: reviewT, todo: todoT },
      hoursTracking: { totalEstimated: totalEst, totalLogged: totalLog },
      memberContributions: assigneeStats
    };

    const systemInstruction = `Bạn là Trưởng phòng Vận hành và Chuyên gia Phân tích Hiệu suất của Apexa Suite System (hệ điều hành cộng tác tối ưu).
Nhiệm vụ của bạn là lập "Báo cáo Đánh giá Năng suất Tuần" cực kỳ sâu sắc, chuyên sâu và truyền cảm hứng dựa trên các chỉ số công việc thực tế được cung cấp.
Hãy trả lời hoàn toàn bằng tiếng Việt với văn văn phong chuyên nghiệp, mạch lạc, tinh tế. Dùng cấu trúc Markdown chuẩn: tiêu đề con là '###', in đậm, và gạch đầu dòng để làm thông tin cực kỳ nổi bật, dễ đọc.
Tránh lặp lại dữ liệu thô một cách buồn tẻ; tập trung giải thích ý nghĩa các con số (ví dụ: tỉ lệ tiêu thụ thời gian, hiệu suất làm việc của đội ngũ, điểm nghẽn dự án, hướng xử lý).`;

    const prompt = `Hãy phân tích bối cảnh dự án sau đây và lập Báo cáo Đánh giá Hiệu năng & Năng suất Tuần (Productivity Insight Report):

DỮ LIỆU ĐĂNG KÝ VẬN HÀNH DỰ ÁN:
${JSON.stringify(datasetSummary, null, 2)}

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
      model: model || "gemini-3.5-flash",
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
