"use client";

import { useEffect } from "react";
import { X, Loader2, CheckCircle2, Wrench, Brain, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  isProcessing?: boolean;
  agentName?: string;
}

export function FunctionCallNotification({
  functionCalls,
  onDismiss,
  autoHideDuration = 5000,
  isProcessing = false,
  agentName,
}: FunctionCallNotificationProps) {
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Don't auto-hide while still processing
    if (isProcessing) return;
    if (functionCalls.length === 0) return;

    // Check if all calls are completed
    const allCompleted = functionCalls.every((fc) => fc.status === "completed");

    if (allCompleted && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [functionCalls, onDismiss, autoHideDuration, isProcessing]);

  // Show if processing OR if there are function calls
  if (!isProcessing && functionCalls.length === 0) return null;

  const activeCalls = functionCalls.filter((fc) => fc.status === "calling");
  const completedCalls = functionCalls.filter(
    (fc) => fc.status === "completed",
  );
  const hasActive = activeCalls.length > 0;
  const isThinking = isProcessing && functionCalls.length === 0;

  const toggleExpanded = (callId: string) => {
    setExpandedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

  return (
    <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg border border-[var(--color-border)] backdrop-blur-sm min-w-[380px] max-w-[480px]">
        {/* Header - Agent Name */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)]/10">
              {isThinking ? (
                <Brain className="h-4 w-4 text-[var(--color-primary)]" />
              ) : (
                <Wrench className="h-4 w-4 text-[var(--color-primary)]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm text-[var(--color-text-primary)]">
                {agentName || "Agent"}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {isThinking
                  ? "Processing..."
                  : hasActive
                    ? `Executing ${activeCalls.length} tool${activeCalls.length > 1 ? "s" : ""}...`
                    : `${completedCalls.length} tool${completedCalls.length > 1 ? "s" : ""} executed`}
              </span>
            </div>
          </div>
          {onDismiss && !isProcessing && (
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

        {/* Content Area */}
        <div className="px-4 py-3 max-h-[350px] overflow-y-auto">
          {/* Thinking State */}
          {isThinking && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50">
                <Loader2 className="h-3.5 w-3.5 text-[var(--color-primary)] animate-spin" />
              </div>
              <span className="text-sm text-[var(--color-text-secondary)]">
                AI is thinking...
              </span>
              <div className="flex gap-1 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Function Calls List */}
          {functionCalls.map((fc, idx) => {
            const isExpanded = expandedCalls.has(fc.call_id || String(idx));
            const hasOutput = fc.output && Object.keys(fc.output).length > 0;

            return (
              <div
                key={fc.call_id || idx}
                className="py-2 animate-in fade-in slide-in-from-right duration-200 border-b border-[var(--color-border)]/50 last:border-b-0"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Tool Header Row */}
                <div
                  className={`flex items-start gap-3 ${hasOutput ? "cursor-pointer hover:bg-[var(--color-muted)]/50 rounded-lg px-1 -mx-1" : ""}`}
                  onClick={() => hasOutput && toggleExpanded(fc.call_id || String(idx))}
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {formatFunctionName(fc.name)}
                      </span>
                      {hasOutput && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                    {fc.arguments && Object.keys(fc.arguments).length > 0 && (
                      <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                        <span className="font-medium">Input: </span>
                        {formatArguments(fc.arguments)}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
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

                {/* Expanded Output Section */}
                {isExpanded && hasOutput && (
                  <div className="mt-2 ml-8 p-2 bg-[var(--color-muted)]/50 rounded-lg">
                    <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Output:</div>
                    <pre className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap break-words max-h-[150px] overflow-y-auto">
                      {formatOutput(fc.output)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {(hasActive || isProcessing) && functionCalls.length > 0 && (
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
    return args.length > 80 ? args.substring(0, 80) + "..." : args;
  }

  if (typeof args === "object") {
    // Try to extract the most relevant field
    const relevantFields = ["query", "question", "input", "text", "message"];
    for (const field of relevantFields) {
      if (args[field]) {
        const value = String(args[field]);
        return value.length > 80 ? value.substring(0, 80) + "..." : value;
      }
    }

    // Fallback to first field
    const firstKey = Object.keys(args)[0];
    if (firstKey) {
      const value = String(args[firstKey]);
      return `${firstKey}: ${value.length > 60 ? value.substring(0, 60) + "..." : value}`;
    }
  }

  return "";
}

function formatOutput(output: any): string {
  if (typeof output === "string") {
    return output;
  }

  // Check for common message patterns
  if (output?.message) {
    return String(output.message);
  }

  // Pretty print JSON
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}
