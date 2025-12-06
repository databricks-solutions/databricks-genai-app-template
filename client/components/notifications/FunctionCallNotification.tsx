"use client";

import { useEffect } from "react";
import { X, Loader2, CheckCircle2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FunctionCall {
  call_id: string;
  name: string;
  arguments?: any;
  output?: any;
  status?: "calling" | "completed" | "error";
}

interface FunctionCallNotificationProps {
  functionCalls: FunctionCall[];
  onDismiss?: () => void;
  autoHideDuration?: number;
}

export function FunctionCallNotification({
  functionCalls,
  onDismiss,
  autoHideDuration = 5000,
}: FunctionCallNotificationProps) {
  useEffect(() => {
    if (functionCalls.length === 0) return;

    // Check if all calls are completed
    const allCompleted = functionCalls.every((fc) => fc.status === "completed");

    if (allCompleted && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [functionCalls, onDismiss, autoHideDuration]);

  if (functionCalls.length === 0) return null;

  const activeCalls = functionCalls.filter((fc) => fc.status === "calling");
  const completedCalls = functionCalls.filter(
    (fc) => fc.status === "completed",
  );
  const hasActive = activeCalls.length > 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg border border-[var(--color-border)] backdrop-blur-sm min-w-[340px] max-w-[420px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)]/10">
              <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-[var(--color-text-primary)]">
                {hasActive ? "Executing Tools" : "Tools Executed"}
              </span>
              <span className="text-xs text-[var(--color-text-primary)]">
                {completedCalls.length} of {functionCalls.length} completed
              </span>
            </div>
          </div>
          {onDismiss && !hasActive && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-7 w-7 rounded-lg hover:bg-[var(--color-muted)]"
            >
              <X className="h-4 w-4 text-[var(--color-text-primary)]" />
            </Button>
          )}
        </div>

        {/* Function Calls List */}
        <div className="px-4 py-3 max-h-[280px] overflow-y-auto">
          {functionCalls.map((fc, idx) => (
            <div
              key={fc.call_id || idx}
              className="flex items-start gap-3 py-2.5 animate-in fade-in slide-in-from-right duration-200"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {fc.status === "calling" && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50">
                    <Loader2 className="h-3.5 w-3.5 text-[var(--color-primary)] animate-spin" />
                  </div>
                )}
                {fc.status === "completed" && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-50">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </div>
                )}
                {fc.status === "error" && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-50">
                    <X className="h-3.5 w-3.5 text-red-600" />
                  </div>
                )}
              </div>

              {/* Function Details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-0.5">
                  {formatFunctionName(fc.name)}
                </div>
                {fc.arguments && Object.keys(fc.arguments).length > 0 && (
                  <div className="text-xs text-[var(--color-text-primary)] line-clamp-2">
                    {formatArguments(fc.arguments)}
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              {fc.status === "calling" && (
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                    <span className="text-xs font-medium text-[var(--color-primary)]">
                      Running
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        {hasActive && (
          <div className="px-4 pb-3">
            <div className="w-full bg-[var(--color-muted)] rounded-full h-1 overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-1 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(completedCalls.length / functionCalls.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatFunctionName(name: string): string {
  // Remove UUID-like suffixes
  const cleanName = name.replace(/_[a-f0-9]{32}$/i, "");
  // Convert snake_case to Title Case
  return cleanName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatArguments(args: any): string {
  if (typeof args === "string") {
    return args.length > 60 ? args.substring(0, 60) + "..." : args;
  }

  if (typeof args === "object") {
    // Try to extract the most relevant field
    const relevantFields = ["query", "question", "input", "text", "message"];
    for (const field of relevantFields) {
      if (args[field]) {
        const value = String(args[field]);
        return value.length > 60 ? value.substring(0, 60) + "..." : value;
      }
    }

    // Fallback to first field
    const firstKey = Object.keys(args)[0];
    if (firstKey) {
      const value = String(args[firstKey]);
      return `${firstKey}: ${value.length > 50 ? value.substring(0, 50) + "..." : value}`;
    }
  }

  return "";
}
