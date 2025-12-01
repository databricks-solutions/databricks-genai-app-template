"use client"

import React from 'react'
import { Message } from './Message'
import { Message as MessageType } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import { useAgents } from '@/hooks/useAgents'

interface MessageListProps {
  messages: MessageType[]
  isLoading: boolean
  onFeedback: (messageId: string, type: 'positive' | 'negative') => void
  onViewTrace: (messageId: string) => void
  selectedAgentId?: string
}

export function MessageList({ messages, isLoading, onFeedback, onViewTrace, selectedAgentId }: MessageListProps) {
  const { getAgentById } = useAgents()
  const agent = selectedAgentId ? getAgentById(selectedAgentId) : null

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-medium mb-2 text-[var(--color-foreground)]">
            {agent?.chat_title || 'AI Assistant'}
          </h2>
          <p className="text-[var(--color-muted-foreground)]">
            {agent?.chat_subtitle || 'Start a conversation with your AI assistant.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          onFeedback={onFeedback}
          onViewTrace={onViewTrace}
        />
      ))}
      
      {isLoading && (
        <div className="flex items-center gap-3 text-[var(--color-muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}
    </div>
  )
}