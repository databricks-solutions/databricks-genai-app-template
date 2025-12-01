// In-memory chat storage with filesystem persistence
// Stores chat history in public/chat-history/{userId}/ for user isolation

import { Chat, Message } from './types'
import { promises as fs } from 'fs'
import path from 'path'

const CHAT_HISTORY_BASE_DIR = path.join(process.cwd(), 'public', 'chat-history')

// User-scoped in-memory cache: userId -> Chat[]
const chatsCache: Map<string, Chat[]> = new Map()

/**
 * Get user-specific chat directory
 */
function getUserChatDir(userId: string): string {
  // Sanitize userId to prevent directory traversal attacks
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9@._-]/g, '_')
  return path.join(CHAT_HISTORY_BASE_DIR, sanitizedUserId)
}

/**
 * Get user-specific chats index file path
 */
function getUserChatsFile(userId: string): string {
  return path.join(getUserChatDir(userId), 'chats.json')
}

/**
 * Ensure user's chat history directory exists
 */
async function ensureDirectoryExists(userId: string): Promise<void> {
  try {
    await fs.mkdir(getUserChatDir(userId), { recursive: true })
  } catch (error) {
    console.error(`Error creating chat history directory for user ${userId}:`, error)
  }
}

/**
 * Load chats from filesystem for a specific user
 */
async function loadChatsFromDisk(userId: string): Promise<Chat[]> {
  try {
    await ensureDirectoryExists(userId)
    const userChatsFile = getUserChatsFile(userId)
    const indexData = await fs.readFile(userChatsFile, 'utf-8')
    const chats = JSON.parse(indexData)

    // Parse dates
    return chats.map((chat: any) => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
      messages: chat.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }))
  } catch (error) {
    // If file doesn't exist, return empty array
    return []
  }
}

/**
 * Save chats to filesystem for a specific user
 */
async function saveChatsToStorage(chats: Chat[], userId: string): Promise<void> {
  try {
    await ensureDirectoryExists(userId)
    const userChatsFile = getUserChatsFile(userId)
    await fs.writeFile(
      userChatsFile,
      JSON.stringify(chats, null, 2),
      'utf-8'
    )
  } catch (error) {
    console.error(`Error saving chats to storage for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get all chats for a specific user
 */
export async function getAllChats(userId: string): Promise<Chat[]> {
  if (!chatsCache.has(userId)) {
    const userChats = await loadChatsFromDisk(userId)
    chatsCache.set(userId, userChats)
  }
  return chatsCache.get(userId) || []
}

/**
 * Get a specific chat by ID for a specific user
 * Returns null if chat doesn't exist OR doesn't belong to this user
 */
export async function getChatById(chatId: string, userId: string): Promise<Chat | null> {
  const chats = await getAllChats(userId)
  return chats.find(chat => chat.id === chatId) || null
}

/**
 * Create a new chat for a specific user
 */
export async function createChat(title: string = 'New Chat', agentId: string | undefined, userId: string): Promise<Chat> {
  const chats = await getAllChats(userId)

  const newChat: Chat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    agentId,  // Store the agent ID with the chat
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  chats.unshift(newChat) // Add to beginning
  chatsCache.set(userId, chats)
  await saveChatsToStorage(chats, userId)

  return newChat
}

/**
 * Add a message to a chat for a specific user
 * Throws error if chat doesn't exist or doesn't belong to user
 */
export async function addMessageToChat(
  chatId: string,
  message: Omit<Message, 'id' | 'timestamp'>,
  userId: string
): Promise<Message> {
  const chats = await getAllChats(userId)
  const chat = chats.find(c => c.id === chatId)

  if (!chat) {
    throw new Error(`Chat ${chatId} not found for user ${userId}`)
  }

  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  }

  chat.messages.push(newMessage)
  chat.updatedAt = new Date()

  // Update title if this is the first user message
  if (chat.messages.length === 1 && message.role === 'user') {
    chat.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
  }

  chatsCache.set(userId, chats)
  await saveChatsToStorage(chats, userId)

  return newMessage
}

/**
 * Update chat title for a specific user
 * Throws error if chat doesn't exist or doesn't belong to user
 */
export async function updateChatTitle(chatId: string, newTitle: string, userId: string): Promise<void> {
  const chats = await getAllChats(userId)
  const chat = chats.find(c => c.id === chatId)

  if (!chat) {
    throw new Error(`Chat ${chatId} not found for user ${userId}`)
  }

  chat.title = newTitle
  chat.updatedAt = new Date()

  chatsCache.set(userId, chats)
  await saveChatsToStorage(chats, userId)
}

/**
 * Delete a chat for a specific user
 * Throws error if chat doesn't exist or doesn't belong to user
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  const chats = await getAllChats(userId)
  const filteredChats = chats.filter(c => c.id !== chatId)

  if (filteredChats.length === chats.length) {
    throw new Error(`Chat ${chatId} not found for user ${userId}`)
  }

  chatsCache.set(userId, filteredChats)
  await saveChatsToStorage(filteredChats, userId)
}


