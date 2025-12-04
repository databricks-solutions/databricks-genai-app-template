/**
 * Chat API Route - Proxy to Python FastAPI backend
 *
 * For now, returns simple JSON response (not streaming).
 * Streaming will be added in a later step.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agentId } = body;

    console.log(
      `📤 Proxying chat request to Python backend (agent: ${agentId})`,
    );

    // Call Python backend
    const backendResponse = await fetch(
      "http://localhost:8000/api/invoke_endpoint",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          messages: messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      },
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("❌ Backend error:", errorText);
      return NextResponse.json(
        { error: "Backend error", details: errorText },
        { status: backendResponse.status },
      );
    }

    const data = await backendResponse.json();
    console.log("✅ Got response from backend");

    // Convert backend response to frontend format
    // Backend returns: { choices: [{ message: { role, content } }] }
    const assistantMessage =
      data.choices?.[0]?.message?.content || "No response";

    // Return in a format the frontend can handle
    return new Response(
      JSON.stringify({
        role: "assistant",
        content: assistantMessage,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("❌ Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat", message: error.message },
      { status: 500 },
    );
  }
}
