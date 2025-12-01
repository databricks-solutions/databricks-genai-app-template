import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export async function POST() {
  try {
    const chatHistoryDir = path.join(process.cwd(), 'public', 'chat-history')
    const indexFile = path.join(chatHistoryDir, 'index.json')
    
    // Write empty array to clear all chats
    await fs.writeFile(indexFile, '[]', 'utf-8')
    
    devLog('✅ Cleared all chat history')
    
    return NextResponse.json({ 
      success: true,
      message: 'All chat history cleared' 
    })
  } catch (error) {
    console.error('Error clearing chat history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear chat history' },
      { status: 500 }
    )
  }
}

