import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Proxy to Python backend
    const response = await fetch('http://localhost:8000/api/chats')

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: response.status }
      )
    }

    const chats = await response.json()
    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Proxy to Python backend
    const response = await fetch('http://localhost:8000/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: response.status }
      )
    }

    const chat = await response.json()
    return NextResponse.json(chat)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}
