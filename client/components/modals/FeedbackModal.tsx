"use client"

import React, { useState, useEffect } from 'react'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (comment: string) => void
  feedbackType: 'positive' | 'negative'
}

export function FeedbackModal({ isOpen, onClose, onSubmit, feedbackType }: FeedbackModalProps) {
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Reset comment when modal opens
      setComment('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = () => {
    onSubmit(comment)
    setComment('')
  }

  const title = feedbackType === 'positive' 
    ? 'Why was this helpful?' 
    : 'Why was this not helpful?'

  const icon = feedbackType === 'positive'
    ? <ThumbsUp className="h-5 w-5 text-[var(--color-success)]" />
    : <ThumbsDown className="h-5 w-5 text-[var(--color-error)]" />

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-backdrop)] backdrop-blur-sm z-[var(--z-modal)] animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[calc(var(--z-modal)+1)] w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-[var(--color-background)] rounded-2xl shadow-xl border border-[var(--color-border)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              {icon}
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Provide Feedback
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <label className="block mb-2 text-sm font-medium text-[var(--color-foreground)]">
              {title}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional: Share more details about your experience..."
              className="w-full px-3 py-2 bg-[var(--color-input)] border border-[var(--color-border)] rounded-lg resize-none !outline-none focus:!outline-none focus:!ring-0 focus:!border-[var(--color-border)] focus:!shadow-none transition-all duration-200 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
              rows={4}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}