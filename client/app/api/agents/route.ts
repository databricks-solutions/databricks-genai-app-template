import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Proxy to Python backend
    const response = await fetch("http://localhost:8000/api/agents");

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load agents" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading agents:", error);
    return NextResponse.json(
      { error: "Failed to load agents" },
      { status: 500 },
    );
  }
}
