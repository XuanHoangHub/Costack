/**
 * Helper to call Apexa AI APIs with dynamic client-side settings (model, temperature, search grounding).
 */
export async function callAiApi(endpoint: string, body: Record<string, unknown> = {}) {
  let savedApiKey = "";
  let savedModel = "";
  let savedTemp = "";
  let searchGrounding = false;

  if (typeof window !== "undefined") {
    savedApiKey = localStorage.getItem("apexa_gemini_api_key") || "";
    savedModel = localStorage.getItem("apexa_ai_model") || "";
    savedTemp = localStorage.getItem("apexa_ai_temperature") || "";
    searchGrounding = localStorage.getItem("apexa_ai_search_grounding") === "true";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (savedApiKey) {
    headers["x-gemini-api-key"] = savedApiKey;
  }

  // Determine if this request should enable Google Search grounding
  // Priority: explicit call parameter > localStorage saved setting
  const googleSearchEnabled = body.googleSearch !== undefined ? body.googleSearch : searchGrounding;

  const requestBody = {
    ...body,
    model: savedModel || undefined,
    temperature: savedTemp ? parseFloat(savedTemp) : undefined,
    googleSearch: googleSearchEnabled,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  return response;
}

/**
 * Generate subtasks breakdown for a task using Gemini AI with intelligent fallback.
 */
export async function generateSubtasksWithAi(title: string, description?: string): Promise<string[]> {
  try {
    const res = await callAiApi("/api/ai/subtasks", { title, description });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
        return data.subtasks;
      }
    }
  } catch (err) {
    console.warn("AI subtask generation fallback:", err);
  }

  // Smart fallback when AI key or endpoint isn't available
  return [
    `Nghiên cứu & Chuẩn bị tài liệu cho: ${title}`,
    `Xây dựng & Thực thi các bước xử lý chính`,
    `Kiểm thử, rà soát chất lượng & Hoàn thiện`,
  ];
}

/**
 * Suggest smart priority for a task based on title & context.
 */
export async function suggestTaskPriorityWithAi(title: string): Promise<'urgent' | 'high' | 'medium' | 'low'> {
  const lower = title.toLowerCase();
  if (lower.includes('gấp') || lower.includes('khẩn') || lower.includes('urgent') || lower.includes('lỗi nặng') || lower.includes('hotfix')) {
    return 'urgent';
  }
  if (lower.includes('quan trọng') || lower.includes('deadline') || lower.includes('release') || lower.includes('báo cáo')) {
    return 'high';
  }
  if (lower.includes('xem xét') || lower.includes('tối ưu') || lower.includes('nâng cấp') || lower.includes('cập nhật')) {
    return 'medium';
  }
  return 'low';
}

