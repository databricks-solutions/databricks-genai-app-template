
import React, { useState, useEffect } from "react";
import { X, ThumbsUp, ThumbsDown, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void> | void;
  feedbackType: "positive" | "negative";
  mlflowTraceUrl?: string; // URL to view the trace in MLflow
}

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  feedbackType,
  mlflowTraceUrl,
}: FeedbackModalProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setComment("");
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(comment);
      setComment("");
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    feedbackType === "positive"
      ? "Why was this helpful?"
      : "Why was this not helpful?";

  const icon =
    feedbackType === "positive" ? (
      <ThumbsUp className="h-5 w-5 text-[var(--color-success)]" />
    ) : (
      <ThumbsDown className="h-5 w-5 text-[var(--color-error)]" />
    );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-glass-backdrop)] backdrop-blur-sm z-[var(--z-modal)] animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal - Liquid Glass Style */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[calc(var(--z-modal)+1)] w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-2xl rounded-2xl shadow-2xl shadow-black/10 border border-[var(--color-glass-border)]">
          {isSubmitting ? (
            /* Loading State */
            <>
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-[var(--color-accent-primary)]/10 flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-[var(--color-accent-primary)] animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                    Sending feedback...
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Please wait while we submit your feedback.
                  </p>
                </div>
              </div>
            </>
          ) : isSubmitted ? (
            /* Success State */
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                  <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                    Thank You!
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

              {/* Success Content */}
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                    Your feedback has been sent!
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    User feedback are logged to your Databricks MLflow experiment, and can be used to improve the model.
                  </p>
                </div>
                {mlflowTraceUrl && (
                  <a
                    href={mlflowTraceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-primary)] text-white rounded-lg hover:bg-[var(--color-accent-primary)]/90 transition-colors cursor-pointer"
                  >
                    <span>View in MLflow</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center px-6 py-4 border-t border-[var(--color-border)]">
                <Button onClick={onClose}>Close</Button>
              </div>
            </>
          ) : (
            /* Form State */
            <>
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
                  className="w-full px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]/50 rounded-xl resize-none outline-none focus:border-[var(--color-accent-primary)]/50 transition-all duration-200 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
                  rows={4}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)]">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
