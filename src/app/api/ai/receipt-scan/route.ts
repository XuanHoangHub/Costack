import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient, getAiErrorMessage, getAiErrorStatus, readAiJson, resolveModel } from '@/lib/aiServer';
import { Type } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { image, categories = [], model, temperature } = await readAiJson<any>(request, 8_388_608);
    const client = await getAuthorizedGeminiClient(request, 8_388_608); // 8MB limit for image analysis

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: "Hình ảnh hóa đơn không hợp lệ." }, { status: 400 });
    }

    // Extract base64 data and mimeType
    const base64Data = image.split(",")[1] || image;
    const mimeType = image.split(";")[0]?.split(":")[1] || "image/jpeg";

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const targetModel = resolveModel(model);
    const categoryHint = Array.isArray(categories) && categories.length > 0
      ? `Danh sách các hạng mục chi tiêu đang có sẵn trong hệ thống: [${categories.join(", ")}]. Hãy ưu tiên chọn hạng mục chi khớp hoặc gần nhất với danh sách này nếu phù hợp.`
      : "Đề xuất hạng mục chi tiêu phù hợp nhất bằng tiếng Việt (Ví dụ: Ăn uống & Tiếp khách, Văn phòng phẩm & Thiết bị, Tiền thuê & Mặt bằng, Điện nước & Tiện ích, Di chuyển & Công tác, Tiếp thị & Quảng cáo, Mua sắm vật tư, Phần mềm & Dịch vụ, Chi phí khác).";

    const promptText = `Hãy phân tích thật kỹ hình ảnh chứng từ/hóa đơn/biên lai/phiếu thu chi/bill này và trích xuất thông tin tài chính một cách chính xác nhất.
${categoryHint}
Lưu ý quan trọng:
1. Số tiền (amount): Trích xuất TỔNG TIỀN THANH TOÁN CUỐI CÙNG (Grand Total / Tổng cộng thanh toán) dưới dạng một số nguyên hoặc số thập phân dương (ví dụ: nếu hóa đơn ghi 150.000đ thì amount = 150000). Bỏ qua các ký tự đ, VND, dấu chấm phân cách hàng nghìn.
2. Ngày giao dịch (date): Định dạng chuẩn YYYY-MM-DD (Ví dụ: 2026-08-24). Nếu chỉ thấy ngày tháng năm, hãy chuyển sang định dạng YYYY-MM-DD. Nếu không tìm thấy ngày trên hóa đơn, hãy trả về chuỗi rỗng.
3. Đối tác / Đơn vị cung cấp (merchant): Tên công ty, tên nhà hàng, quán ăn, siêu thị, tài xế, hoặc người thụ hưởng xuất hóa đơn.
4. Ghi chú (note): Tóm tắt ngắn gọn mục đích chi tiêu hoặc các mặt hàng tiêu biểu.
5. Danh sách mặt hàng (items): Liệt kê các dòng sản phẩm/dịch vụ trên bill nếu đọc được.`;

    const response = await client.models.generateContent({
      model: targetModel,
      contents: [imagePart, promptText],
      config: {
        systemInstruction: "Bạn là chuyên gia kế toán và chuyên gia trích xuất dữ liệu hóa đơn/biên lai/chứng từ tài chính thông minh của Apexa AI. Trích xuất chính xác các trường dữ liệu số tiền, ngày tháng, nhà cung cấp, phân loại danh mục và chi tiết hàng hóa từ ảnh hóa đơn tiếng Việt và quốc tế. Trả về đúng định dạng JSON theo schema được cung cấp.",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Tổng số tiền thanh toán cuối cùng (dạng số, ví dụ: 250000)" },
            date: { type: Type.STRING, description: "Ngày giao dịch trên hóa đơn định dạng YYYY-MM-DD" },
            merchant: { type: Type.STRING, description: "Tên người bán, nhà cung cấp, nhà hàng hoặc bên nhận tiền" },
            category: { type: Type.STRING, description: "Hạng mục chi phí phù hợp nhất" },
            taxCode: { type: Type.STRING, description: "Mã số thuế của bên bán nếu có" },
            invoiceNumber: { type: Type.STRING, description: "Số hóa đơn, số phiếu, mã hóa đơn điện tử hoặc mã giao dịch" },
            note: { type: Type.STRING, description: "Tóm tắt ngắn gọn lý do chi tiêu hoặc danh sách món chính" },
            paymentMethod: {
              type: Type.STRING,
              enum: ["bank_transfer", "cash", "card", "other"],
              description: "Phương thức thanh toán thể hiện trên hóa đơn"
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Tên mặt hàng/dịch vụ" },
                  quantity: { type: Type.NUMBER, description: "Số lượng" },
                  unitPrice: { type: Type.NUMBER, description: "Đơn giá" },
                  total: { type: Type.NUMBER, description: "Thành tiền" }
                },
                required: ["name"]
              }
            },
            confidence: { type: Type.NUMBER, description: "Mức độ tin cậy của kết quả OCR (từ 0 đến 1)" }
          },
          required: ["amount", "merchant", "category", "note"]
        }
      }
    });

    const rawText = response.text || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = {};
    }

    return NextResponse.json({
      success: true,
      data: {
        amount: Number(parsedData.amount) || 0,
        date: parsedData.date || new Date().toISOString().slice(0, 10),
        merchant: parsedData.merchant || "",
        category: parsedData.category || "Chi phí khác",
        taxCode: parsedData.taxCode || "",
        invoiceNumber: parsedData.invoiceNumber || "",
        note: parsedData.note || (parsedData.merchant ? `Chi cho ${parsedData.merchant}` : "Chi phí theo hóa đơn"),
        paymentMethod: parsedData.paymentMethod || "bank_transfer",
        items: Array.isArray(parsedData.items) ? parsedData.items : [],
        confidence: typeof parsedData.confidence === 'number' ? parsedData.confidence : 0.95
      }
    });
  } catch (error: any) {
    console.error("Receipt AI OCR error:", error);
    return NextResponse.json(
      { success: false, error: getAiErrorMessage(error, "Không thể nhận diện hóa đơn. Vui lòng thử lại hoặc tải ảnh rõ nét hơn.") },
      { status: getAiErrorStatus(error) }
    );
  }
}
