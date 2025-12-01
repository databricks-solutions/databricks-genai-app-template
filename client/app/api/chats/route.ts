import { NextRequest, NextResponse } from 'next/server'
import { getAllChats, createChat } from '@/lib/chat-storage'
import { getUserId } from '@/lib/auth-helpers'

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract user ID for multi-user isolation
    const userId = getUserId(request)
    devLog(`👤 GET /api/chats - User ID: ${userId}`)

    // Get all chats for this user from storage
    const chats = await getAllChats(userId)

    // Convert to JSON-serializable format
    const serializedChats = chats.map(chat => ({
      ...chat,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      messages: chat.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }))
    }))

    return NextResponse.json(serializedChats)
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
    // Extract user ID for multi-user isolation
    const userId = getUserId(request)
    devLog(`👤 POST /api/chats - User ID: ${userId}`)

    const body = await request.json()
    const { title, agentId } = body

    const newChat = await createChat(title || 'New Chat', agentId, userId)

    // Convert to JSON-serializable format
    const serializedChat = {
      ...newChat,
      createdAt: newChat.createdAt.toISOString(),
      updatedAt: newChat.updatedAt.toISOString(),
      messages: []
    }

    return NextResponse.json(serializedChat)
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}
