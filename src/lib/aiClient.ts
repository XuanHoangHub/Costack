import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export class AiAccessError extends Error {
  readonly code = 'AI_PLAN_REQUIRED';

  constructor() {
    super('Costack AI chỉ dành cho tài khoản trả phí. Vui lòng nâng cấp gói để tiếp tục.');
    this.name = 'AiAccessError';
  }
}

export const isAiAccessError = (error: unknown): error is AiAccessError =>
  error instanceof AiAccessError || (error instanceof Error && (error.message.includes('Costack AI chỉ dành cho tài khoản trả phí') || error.message.includes('Apexa AI chỉ dành cho tài khoản trả phí')));

function requirePaidAiAccess() {
  if (typeof window === 'undefined') return;
  const currentUser = useAuthStore.getState().currentUser;
  if (currentUser?.isPremium) return;
  useUiStore.getState().setShowPremiumModal(true);
  throw new AiAccessError();
}

/**
 * Calls Apexa's managed AI service. Personal/BYOK credentials are never read
 * or forwarded; the browser sends only the signed-in Supabase session.
 */
export async function callAiApi(endpoint: string, body: Record<string, unknown> = {}) {
  let savedModel = "";
  let savedTemp = "";
  let searchGrounding = false;

  requirePaidAiAccess();

  if (typeof window !== "undefined") {
    // Remove credentials saved by older BYOK builds. Apexa AI is managed
    // server-side and never accepts a user-provided provider key.
    localStorage.removeItem("apexa_gemini_api_key");
    savedModel = localStorage.getItem("apexa_ai_model") || "";
    savedTemp = localStorage.getItem("apexa_ai_temperature") || "";
    searchGrounding = localStorage.getItem("apexa_ai_search_grounding") === "true";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== 'undefined') {
    const { supabase } = await import('@/lib/supabaseClient');
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
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

  if (response.status === 403) {
    useUiStore.getState().setShowPremiumModal(true);
    throw new AiAccessError();
  }

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
    if (isAiAccessError(err)) throw err;
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

export interface AiTaskAutofillResult {
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
  priorityReason: string;
  suggestedHoursEstimate: number;
  suggestedTags: string[];
  suggestedSubtasks: string[];
  enhancedDescription: string;
}

/**
 * Smart autofill task attributes based on task title and context using Gemini AI.
 */
export async function autofillTaskWithAi(params: {
  title: string;
  currentDescription?: string;
  spaceName?: string;
}): Promise<AiTaskAutofillResult> {
  const res = await callAiApi("/api/ai/task-autofill", params);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI Autofill error: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to generate task autofill attributes');
  }
  return json.data;
}

export interface AiFinanceCategorizeResult {
  type: 'income' | 'expense';
  category: string;
  suggestedTags: string[];
  confidence: number;
}

/**
 * Smart finance transaction categorization using Gemini AI.
 */
export async function categorizeExpenseWithAi(description: string, amount?: number): Promise<AiFinanceCategorizeResult> {
  const res = await callAiApi("/api/ai/finance-categorize", { description, amount });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `AI error: ${res.statusText}`);
  }
  const json = await res.json();
  if (!json.success || !json.result) {
    throw new Error(json.error || 'Failed to categorize transaction');
  }
  return json.result;
}

