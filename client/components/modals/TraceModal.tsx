"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  ChevronRight,
  ChevronDown,
  Code,
  Database,
  Brain,
  Users,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TraceSpan, MASFlow } from "@/lib/types";

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

interface FunctionCall {
  call_id: string;
  name: string;
  arguments: any;
  output?: any;
}

interface TraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceId: string;
  functionCalls?: FunctionCall[];
  userMessage?: string;
  assistantResponse?: string;
  masFlow?: MASFlow; // MAS-specific supervisor/specialist flow
}

export function TraceModal({
  isOpen,
  onClose,
  traceId,
  functionCalls,
  userMessage,
  assistantResponse,
  masFlow,
}: TraceModalProps) {
  const [traceData, setTraceData] = useState<TraceSpan[] | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Build trace from cached data (no network calls)
      buildTraceFromFunctionCalls();
    }
  }, [isOpen, functionCalls, userMessage, assistantResponse]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const buildTraceFromFunctionCalls = () => {
    // Convert function calls from stream to trace spans (may be empty array)
    const spans: TraceSpan[] = (functionCalls || []).map((fc) => {
      return {
        name: fc.name,
        duration: 0, // Duration not available from stream
        type: "tool" as const,
        input: fc.arguments || {},
        output: fc.output || {},
      };
    });

    // Build proper Agent Execution span with actual message data
    const rootSpan: TraceSpan = {
      name: "Agent Execution",
      duration: 0,
      type: "other",
      input: {
        messages: userMessage
          ? [
              {
                role: "user",
                content: userMessage,
              },
            ]
          : [],
      },
      output: {
        response: assistantResponse || "",
      },
      children: spans,
    };

    setTraceData([rootSpan]);
    // Expand root by default to show function calls
    setExpandedNodes(new Set(["root-0"]));
  };

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "llm":
        return <Brain className="h-4 w-4 text-purple-500" />;
      case "tool":
        return <Code className="h-4 w-4 text-blue-500" />;
      case "retrieval":
        return <Database className="h-4 w-4 text-green-500" />;
      default:
        return <Brain className="h-4 w-4 text-[var(--color-accent)]" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "llm":
        return "AI";
      case "tool":
        return "Tool";
      case "retrieval":
        return "Search";
      default:
        return "Step";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "llm":
        return "bg-purple-100 text-purple-700";
      case "tool":
        return "bg-blue-100 text-blue-700";
      case "retrieval":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);

    try {
      // Try to parse if it's a JSON string
      if (typeof value === "string") {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const renderKeyValue = (key: string, value: any) => {
    const formattedValue = formatValue(value);
    const isLongValue = formattedValue.length > 100;

    return (
      <div key={key} className="mb-2 last:mb-0">
        <div className="text-xs font-semibold text-[var(--color-accent)] mb-1 font-mono">
          {key}
        </div>
        <div
          className={`bg-[var(--color-background)] rounded-md p-2.5 border border-[var(--color-border)] ${isLongValue ? "max-h-32 overflow-y-auto" : ""}`}
        >
          <pre className="text-xs text-[var(--color-foreground)] font-mono whitespace-pre-wrap break-words">
            {formattedValue}
          </pre>
        </div>
      </div>
    );
  };

  // Helper to check if value is a primitive (string, number, boolean) vs object
  const isPrimitive = (value: any): boolean => {
    return (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    );
  };

  // Render input/output section handling both primitives and objects
  const renderDataSection = (data: any, label: string, dotColor: string) => {
    if (!data) return null;

    // If it's a primitive, render it directly without Object.entries
    if (isPrimitive(data)) {
      const formattedValue = formatValue(data);
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></div>
            <h4 className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {label}
            </h4>
          </div>
          <div className="bg-[var(--color-background)] rounded-md p-2.5 border border-[var(--color-border)]">
            <pre className="text-xs text-[var(--color-foreground)] font-mono whitespace-pre-wrap break-words">
              {formattedValue}
            </pre>
          </div>
        </div>
      );
    }

    // If it's an object, check it has keys
    if (typeof data === "object" && Object.keys(data).length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></div>
          <h4 className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </h4>
        </div>
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) =>
            renderKeyValue(key, value),
          )}
        </div>
      </div>
    );
  };

  const renderSpan = (
    span: TraceSpan,
    path: string = "",
    depth: number = 0,
  ) => {
    const hasChildren = span.children && span.children.length > 0;
    const isExpanded = expandedNodes.has(path);
    const spanPath = path || span.name;

    // For parent nodes, always show collapsed by default
    const shouldShowDetails = !hasChildren || isExpanded;

    return (
      <div key={spanPath} className={`${depth > 0 ? "ml-8 mt-3" : "mb-4"}`}>
        <div
          className={`
            relative rounded-xl border overflow-hidden transition-all duration-200
            ${
              hasChildren
                ? isExpanded
                  ? "border-[var(--color-accent)]/50 bg-[var(--color-background)] shadow-md"
                  : "border-[var(--color-border)] bg-[var(--color-background-secondary)] hover:border-[var(--color-accent)]/50 hover:shadow-sm cursor-pointer"
                : "border-[var(--color-border)] bg-[var(--color-background)]"
            }
          `}
          onClick={() => hasChildren && toggleNode(spanPath)}
        >
          {/* Header Bar */}
          <div
            className={`
            px-5 py-3.5 flex items-center gap-3
            ${
              hasChildren
                ? "bg-gradient-to-r from-[var(--color-background-secondary)] to-[var(--color-background)]"
                : "bg-[var(--color-background-secondary)]"
            }
          `}
          >
            {/* Expand Icon */}
            {hasChildren && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-[var(--color-accent)] transition-transform" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)] transition-transform" />
                )}
              </div>
            )}

            {/* Icon */}
            <div className="flex-shrink-0">{getIcon(span.type)}</div>

            {/* Name and Type */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--color-foreground)] truncate">
                {span.name}
              </div>
            </div>

            {/* Type Badge */}
            <span
              className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${getTypeBadgeColor(span.type)}`}
            >
              {getTypeLabel(span.type)}
            </span>

            {/* Duration */}
            {span.duration > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-muted)] text-[var(--color-foreground)]">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{span.duration}ms</span>
              </div>
            )}
          </div>

          {/* Content - Only show for leaf nodes or when expanded */}
          {shouldShowDetails && (span.input || span.output) && (
            <div className="p-5 space-y-4 bg-[var(--color-background)]">
              {/* Input Section */}
              {renderDataSection(span.input, "Input", "bg-blue-400")}

              {/* Output Section */}
              {renderDataSection(span.output, "Output", "bg-green-400")}
            </div>
          )}
        </div>

        {/* Children - Rendered below parent */}
        {isExpanded && hasChildren && (
          <div className="mt-3 pl-4 border-l-2 border-[var(--color-accent)]/30">
            {span.children!.map((child, index) =>
              renderSpan(child, `${spanPath}-${index}`, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-backdrop)] backdrop-blur-sm z-[var(--z-modal)] animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[calc(var(--z-modal)+1)] w-[85vw] h-[85vh] max-w-6xl animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-[var(--color-background)] rounded-2xl shadow-xl border border-[var(--color-border)] h-full flex flex-col">
          {/* Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)]/10 via-[var(--color-accent)]/5 to-transparent"></div>
            <div className="relative flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                  <Code className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                    What happened
                  </h2>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                    See the steps the assistant took to answer
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-xl hover:bg-[var(--color-muted)] transition-all hover:rotate-90 duration-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[var(--color-background)] to-[var(--color-background-secondary)]">
            {masFlow ? (
              /* MAS Flow Visualization */
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Supervisor Header */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-purple-500" />
                    <h3 className="text-xl font-bold text-[var(--color-foreground)]">
                      Supervisor Agent
                    </h3>
                  </div>
                  <div className="font-mono text-sm text-[var(--color-muted-foreground)] bg-[var(--color-background)] px-3 py-2 rounded">
                    {masFlow.supervisor}
                  </div>
                  <div className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                    Total handoffs: {masFlow.total_handoffs}
                  </div>
                </div>

                {/* Handoffs */}
                {masFlow.handoffs.map((handoff, idx) => (
                  <div key={idx} className="space-y-4">
                    {/* Handoff Arrow */}
                    <div className="flex items-center gap-3 ml-8">
                      <ArrowRight className="h-5 w-5 text-[var(--color-accent)]" />
                      <div className="text-sm font-medium text-[var(--color-muted-foreground)]">
                        Handoff #{idx + 1}
                      </div>
                    </div>

                    {/* Specialist Card */}
                    <div className="ml-12 bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-xl border border-blue-500/20 p-5 space-y-4">
                      {/* Specialist Header */}
                      <div className="flex items-center gap-3">
                        <Brain className="h-6 w-6 text-blue-500" />
                        <h4 className="text-lg font-bold text-[var(--color-foreground)]">
                          Specialist Agent
                        </h4>
                      </div>
                      <div className="font-mono text-sm text-[var(--color-muted-foreground)] bg-[var(--color-background)] px-3 py-2 rounded">
                        {handoff.specialist}
                      </div>

                      {/* Request */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                          <h5 className="text-sm font-medium text-[var(--color-muted-foreground)]">
                            Request
                          </h5>
                        </div>
                        <pre className="text-xs font-mono bg-[var(--color-background)] p-3 rounded border border-[var(--color-border)] overflow-x-auto">
                          {formatValue(handoff.request)}
                        </pre>
                      </div>

                      {/* Specialist Messages */}
                      {handoff.message_count > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                            <h5 className="text-sm font-medium text-[var(--color-muted-foreground)]">
                              Response ({handoff.message_count}{" "}
                              messages)
                            </h5>
                          </div>
                          <div className="space-y-2">
                            {handoff.messages.slice(0, 3).map((msg, msgIdx) => (
                              <div
                                key={msgIdx}
                                className="text-sm bg-[var(--color-background)] p-3 rounded border border-[var(--color-border)]"
                              >
                                {msg.length > 200
                                  ? msg.substring(0, 200) + "..."
                                  : msg}
                              </div>
                            ))}
                            {handoff.message_count > 3 && (
                              <div className="text-xs text-[var(--color-muted-foreground)] italic">
                                + {handoff.message_count - 3} more messages
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Return Arrow */}
                    <div className="flex items-center gap-3 ml-8">
                      <ArrowRight className="h-5 w-5 text-[var(--color-accent)] rotate-180" />
                      <div className="text-sm font-medium text-[var(--color-muted-foreground)]">
                        Return to Supervisor
                      </div>
                    </div>
                  </div>
                ))}

                {/* Final Synthesis */}
                <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 rounded-xl border border-green-500/20 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-green-500" />
                    <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                      Supervisor Synthesis
                    </h3>
                  </div>
                  <div className="text-sm text-[var(--color-muted-foreground)]">
                    Final response synthesized from {masFlow.total_handoffs}{" "}
                    specialist{masFlow.total_handoffs !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ) : traceData && traceData.length > 0 ? (
              <div className="max-w-5xl mx-auto">
                {traceData.map((span, index) =>
                  renderSpan(span, `root-${index}`),
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="h-12 w-12 rounded-full bg-[var(--color-muted)]/50 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-[var(--color-muted-foreground)]" />
                </div>
                <div className="text-[var(--color-muted-foreground)] font-medium">
                  No tools were used
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-2 max-w-md text-center">
                  The assistant answered directly without using any tools
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
