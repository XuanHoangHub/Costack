import { NextResponse } from 'next/server';
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';

export async function POST(request: Request) {
  try {
    const { userName, notifications, tasksCount, model, temperature } = await readAiJson<any>(request);
    const client = await getAuthorizedGeminiClient(request);

    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    const notifSummary = safeNotifications.map((n: any) => ({
      title: n.title,
      message: n.message,
      type: n.type,
      time: n.time
    }));

    const systemInstruction = "Bạn là Trợ lý Vận hành Trí tuệ Nhân tạo Apexa Brain.\nNhiệm vụ của bạn là đọc các thông báo quan trọng chưa xử lý và viết một bản tóm tắt nhanh đầu ngày (Executive Daily Digest) ấm áp, tràn đầy năng lượng, ngắn gọn (tối đa 4 câu tiếng Việt) gửi đến người dùng.\nTập trung vào: số đầu việc/thông báo cần xử lý gấp, lời nhắc tích cực và 1 hành động ưu tiên cao nhất hôm nay.";

    const prompt = `Người dùng: ${userName || 'Bạn'}\nTổng số công việc đang phụ trách: ${tasksCount || 0}\nDanh sách các thông báo/hoạt động gần đây:\n${JSON.stringify(notifSummary, null, 2)}\n\nHãy viết một đoạn tóm tắt ngắn gọn, truyền cảm hứng bằng tiếng Việt.`;

    const response = await client.models.generateContent({
      model: resolveModel(model),
      contents: prompt,
      config: {
        systemInstruction,
        temperature: temperature !== undefined ? temperature : 0.4,
      }
    });

    const digestText = response.text?.trim() || '';
    return NextResponse.json({ success: true, digest: digestText });
  } catch (error: any) {
    console.error('Inbox digest error:', error);
    return NextResponse.json({ success: false, error: getAiErrorMessage(error, 'Lỗi tạo tóm tắt hộp thư bằng AI') }, { status: getAiErrorStatus(error) });
  }
}
