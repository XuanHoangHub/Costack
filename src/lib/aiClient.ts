/**
 * Helper to call Avaxa AI APIs with dynamic client-side settings (model, temperature, search grounding).
 */
export async function callAiApi(endpoint: string, body: Record<string, unknown> = {}) {
  let savedApiKey = "";
  let savedModel = "";
  let savedTemp = "";
  let searchGrounding = false;

  if (typeof window !== "undefined") {
    savedApiKey = localStorage.getItem("avaxa_gemini_api_key") || "";
    savedModel = localStorage.getItem("avaxa_ai_model") || "";
    savedTemp = localStorage.getItem("avaxa_ai_temperature") || "";
    searchGrounding = localStorage.getItem("avaxa_ai_search_grounding") === "true";
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
