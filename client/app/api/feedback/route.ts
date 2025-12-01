import { NextRequest, NextResponse } from 'next/server'

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, feedbackType, comment } = body

    // Mock implementation - in production, save to database
    devLog('Feedback received:', {
      messageId,
      feedbackType,
      comment,
      timestamp: new Date().toISOString()
    })

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your feedback!' 
    })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

