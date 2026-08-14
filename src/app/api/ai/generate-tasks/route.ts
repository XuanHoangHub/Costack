import { NextResponse } from "next/server";
import { getAuthorizedGeminiClient } from '@/lib/aiServer';
import { Type } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { prompt, model, temperature } = await request.json();
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: "Prompt không được để trống" }, { status: 400 });
    }
    const client = await getAuthorizedGeminiClient(request);

    const aiPrompt = `Based on the user request: "${prompt}". Analyze and propose a structured list of actionable tasks to accomplish it.`;

    const response = await client.models.generateContent({
      model: model || "gemini-3.5-flash",
      contents: aiPrompt,
      config: {
        systemInstruction: "You are a professional Product Owner / Project Manager. Break down the user request into actionable tasks. Provide title, description, priority, estimated hours, relevant tags, and subtasks in the same language as the input prompt (English by default). Return a clean JSON matching the schema.",
        responseMimeType: "application/json",
        temperature: temperature !== undefined ? temperature : undefined,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Clear task title in user's language (e.g. English)" },
                  description: { type: Type.STRING, description: "Detailed task description in user's language" },
                  priority: { 
                    type: Type.STRING, 
                    enum: ["low", "medium", "high", "urgent"],
                    description: "Task priority level"
                  },
                  hoursEstimate: { type: Type.INTEGER, description: "Estimated hours to complete (e.g. 2, 4, 8, 12)" },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Relevant task tags (e.g. Design, Frontend, Backend, API, Marketing, Research, DevOps)"
                  },
                  subtasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2 to 4 concrete subtasks"
                  }
                },
                required: ["title", "description", "priority", "hoursEstimate", "tags", "subtasks"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const text = response.text || "{\"tasks\":[]}";
    const result = JSON.parse(text.trim());
    return NextResponse.json({ success: true, tasks: result.tasks || [] });
  } catch (error: any) {
    console.error("Generate tasks error:", error);
    // Return friendly local fallback if API fails
    return NextResponse.json({
      success: false,
      tasks: [
        {
          title: "UI/UX Design & Mockup",
          description: "Draft wireframes and detailed UI layout for the requested feature.",
          priority: "high",
          hoursEstimate: 8,
          tags: ["Design"],
          subtasks: ["Draft layout", "Design Figma mockup", "Gather team feedback"]
        },
        {
          title: "Feature Core Implementation",
          description: "Develop frontend components and integrate associated API endpoints.",
          priority: "medium",
          hoursEstimate: 12,
          tags: ["Frontend", "API"],
          subtasks: ["Build UI components", "Connect data API", "Handle edge cases"]
        },
        {
          title: "Testing & Deployment",
          description: "Run unit tests, fix identified bugs, and finalize deployment.",
          priority: "low",
          hoursEstimate: 4,
          tags: ["Testing"],
          subtasks: ["Write unit tests", "Fix CSS/JS issues", "Deploy updates"]
        }
      ],
      error: error.message || "Failed to contact Gemini, returned default fallback."
    });
  }
}
