import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Proxy to Python backend
    const response = await fetch("http://localhost:8000/api/config/about");

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load about configuration" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error loading about config:", error);
    return NextResponse.json(
      { error: "Failed to load about configuration" },
      { status: 500 },
    );
  }
}
