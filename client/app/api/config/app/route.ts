import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Proxy to Python backend
    const response = await fetch("http://localhost:8000/api/config/app");

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load app configuration" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading app config:", error);
    return NextResponse.json(
      { error: "Failed to load app configuration" },
      { status: 500 },
    );
  }
}
