import { NextRequest, NextResponse } from 'next/server'
import { deleteChat, updateChatTitle, getChatById } from '@/lib/chat-storage'
import { getUserId } from '@/lib/auth-helpers'

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID for authorization
    const userId = getUserId(request)
    devLog(`👤 GET /api/chats/[id] - User ID: ${userId}`)

    const { id } = await params
    const chat = await getChatById(id, userId)

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    // Convert to JSON-serializable format
    const serializedChat = {
      ...chat,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      messages: chat.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }))
    }

    return NextResponse.json(serializedChat)
  } catch (error) {
    console.error('Error fetching chat:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID for authorization
    const userId = getUserId(request)
    devLog(`👤 DELETE /api/chats/[id] - User ID: ${userId}`)

    const { id } = await params
    await deleteChat(id, userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chat:', error)
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract user ID for authorization
    const userId = getUserId(request)
    devLog(`👤 PATCH /api/chats/[id] - User ID: ${userId}`)

    const { id } = await params
    const body = await request.json()
    const { title } = body

    await updateChatTitle(id, title, userId)

    return NextResponse.json({ success: true, title })
  } catch (error) {
    console.error('Error updating chat:', error)
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    )
  }
}
