
import React, { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Search,
  Clock,
  Zap,
  Wrench,
  Database,
  Copy,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Message as MessageType } from "@/lib/types";
import { ChartRenderer } from "./ChartRenderer";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";

// Type workaround for react-syntax-highlighter with React 18
const SyntaxHighlighterComponent = SyntaxHighlighter as unknown as React.ComponentType<SyntaxHighlighterProps>;

interface MessageProps {
  message: MessageType;
  onFeedback: (messageId: string, type: "positive" | "negative") => void;
  onViewTrace: (messageId: string) => void;
  compact?: boolean;
}

// Internal CodeBlock helper - renders syntax-highlighted code with copy button (not exported)
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--color-background)]/90 backdrop-blur-sm border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-muted)] hover:scale-105 active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighterComponent
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: "0.75rem",
          fontSize: "0.875rem",
          lineHeight: "1.6",
          padding: "1rem",
          background: "rgba(15, 23, 42, 0.8)",
        }}
        showLineNumbers={value.split("\n").length > 3}
        wrapLines={true}
        wrapLongLines={false}
      >
        {value}
      </SyntaxHighlighterComponent>
      {language && (
        <div className="absolute left-3 top-2 text-xs font-medium text-[var(--color-text-muted)] opacity-60">
          {language}
        </div>
      )}
    </div>
  );
}

export function Message({ message, onFeedback, onViewTrace, compact = false }: MessageProps) {
  const isUser = message.role === "user";
  const isError = message.isError === true;
  const [visualizationsVisible, setVisualizationsVisible] = useState(true);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
    >
      {/* Message Content */}
      <div
        className={`min-w-0 ${isUser ? "items-end" : "items-start"}`}
        style={{ maxWidth: compact ? "85%" : "70%" }}
      >
        <div
          className={`
            rounded-2xl px-4 py-3 transition-all duration-300 backdrop-blur-sm
            ${
              isUser
                ? "bg-[var(--color-accent-primary)] text-white shadow-lg hover:shadow-xl"
                : isError
                  ? "bg-[var(--color-error)]/5 border border-[var(--color-error)]/30 shadow-sm"
                  : "bg-[var(--color-background)]/80 border border-[var(--color-border)]/30 shadow-sm hover:shadow-md"
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-sm text-white">
              {message.content}
            </p>
          ) : isError ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
              <p className="whitespace-pre-wrap break-words text-sm text-[var(--color-error)]">
                {message.content}
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none break-words text-sm text-[var(--color-text-primary)]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-[var(--color-text-heading)] mt-4 mb-2 pb-1 border-b border-[var(--color-border)]">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-[var(--color-text-heading)] mt-3 mb-2 pb-1 border-b border-[var(--color-border)]">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-[var(--color-text-heading)] mt-3 mb-1.5">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mt-2 mb-1">
                      {children}
                    </h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-sm font-medium text-[var(--color-text-heading)] mt-2 mb-1">
                      {children}
                    </h5>
                  ),
                  h6: ({ children }) => (
                    <h6 className="text-xs font-medium text-[var(--color-text-muted)] mt-1.5 mb-1">
                      {children}
                    </h6>
                  ),

                  // Paragraphs
                  p: ({ children }) => (
                    <p className="mb-2 leading-normal text-[var(--color-text-primary)]">
                      {children}
                    </p>
                  ),

                  // Lists
                  ul: ({ children }) => (
                    <ul className="my-2 ml-5 space-y-1 list-disc marker:text-[var(--color-accent-primary)]">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-5 space-y-1 list-decimal marker:text-[var(--color-accent-primary)] marker:font-semibold">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-normal text-[var(--color-text-primary)] pl-0.5">
                      {children}
                    </li>
                  ),

                  // Links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]/80 underline decoration-[var(--color-accent-primary)]/30 hover:decoration-[var(--color-accent-primary)] underline-offset-2 transition-colors font-medium"
                    >
                      {children}
                    </a>
                  ),

                  // Inline code
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";
                    const value = String(children).replace(/\n$/, "");

                    // Block code (has language or multiline)
                    if (match || value.includes("\n")) {
                      return <CodeBlock language={language} value={value} />;
                    }

                    // Inline code
                    return (
                      <code
                        className="bg-[var(--color-muted)]/50 text-[var(--color-accent-primary)] px-1.5 py-0.5 rounded font-mono text-sm border border-[var(--color-border)]"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },

                  // Code blocks (pre wrapping)
                  pre: ({ children }) => {
                    return <>{children}</>;
                  },

                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 pl-4 pr-3 py-2 border-l-4 border-[var(--color-accent-primary)] bg-[var(--color-muted)]/30 rounded-r-lg">
                      <div className="text-[var(--color-text-primary)] italic">
                        {children}
                      </div>
                    </blockquote>
                  ),

                  // Tables
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto rounded-xl border border-[var(--color-border)] shadow-md bg-[var(--color-background)]/50 backdrop-blur-sm">
                      <table className="w-full border-collapse text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-[var(--color-accent-primary)]/8 sticky top-0 z-10">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-[var(--color-border)]/50">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-[var(--color-muted)]/40 transition-all duration-200 border-b border-[var(--color-border)]/30">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-xs font-bold text-[var(--color-text-heading)] uppercase tracking-wide border-b-2 border-[var(--color-accent-primary)]/40">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {children}
                    </td>
                  ),

                  // Horizontal rule
                  hr: () => (
                    <hr className="my-6 border-t-2 border-[var(--color-border)] opacity-50" />
                  ),

                  // Strong/Bold
                  strong: ({ children }) => (
                    <strong className="font-bold text-[var(--color-text-heading)]">
                      {children}
                    </strong>
                  ),

                  // Emphasis/Italic
                  em: ({ children }) => (
                    <em className="italic text-[var(--color-text-primary)]">
                      {children}
                    </em>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Visualizations */}
          {message.visualizations && message.visualizations.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* Toggle Button */}
              <button
                onClick={() => setVisualizationsVisible(!visualizationsVisible)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-muted)]/50 hover:bg-[var(--color-muted)] border border-[var(--color-border)]/40 hover:border-[var(--color-border)] transition-all duration-200 text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] group"
                title={visualizationsVisible ? "Hide visualizations" : "Show visualizations"}
              >
                {visualizationsVisible ? (
                  <EyeOff className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                ) : (
                  <Eye className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                )}
                <span className="font-medium">
                  {visualizationsVisible ? "Hide" : "Show"} {message.visualizations.length > 1 ? "Charts" : "Chart"}
                </span>
              </button>

              {/* Charts */}
              {visualizationsVisible && (
                <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  {message.visualizations.map((viz, index) => (
                    <ChartRenderer key={index} visualization={viz} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`mt-1 text-xs text-[var(--color-text-muted)] ${isUser ? "text-right" : "text-left"}`}
        >
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </div>

        {/* Trace Summary (for assistant messages with trace data, not for errors) */}
        {!isUser && !isError && message.traceSummary && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {message.traceSummary.duration_ms > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Total execution time"
              >
                <Clock className="h-3 w-3" />
                <span>
                  {(message.traceSummary.duration_ms / 1000).toFixed(2)}s
                </span>
              </div>
            )}
            {message.traceSummary.total_tokens > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Total tokens used"
              >
                <Zap className="h-3 w-3" />
                <span>
                  {message.traceSummary.total_tokens.toLocaleString()} tokens
                </span>
              </div>
            )}
            {message.traceSummary.tools_called?.length > 0 && (
              <button
                onClick={() => onViewTrace(message.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-primary)]/10 hover:text-[var(--color-accent-primary)] transition-colors cursor-pointer"
                title={`Click to view details: ${message.traceSummary.tools_called.map((t) => t.name).join(", ")}`}
              >
                <Wrench className="h-3 w-3" />
                <span>
                  {message.traceSummary.tools_called.length} tool
                  {message.traceSummary.tools_called.length !== 1 ? "s" : ""}
                </span>
              </button>
            )}
            {message.traceSummary.retrieval_calls?.length > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--color-muted)] text-[var(--color-text-muted)]"
                title="Document retrievals"
              >
                <Database className="h-3 w-3" />
                <span>
                  {message.traceSummary.retrieval_calls.reduce(
                    (sum, r) => sum + (r.num_documents || 0),
                    0,
                  )}{" "}
                  docs
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons (for assistant messages, not for errors, and not while streaming) */}
        {!isUser && !isError && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-2">
            {/* Feedback buttons - only show if we have a trace_id (required for MLflow feedback) */}
            {message.traceId && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(message.id, "positive")}
                  className="h-7 w-7 rounded-full hover:bg-[var(--color-success)]/10 hover:text-[var(--color-success)] hover:scale-110 transition-all duration-200"
                  title="Helpful response"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback(message.id, "negative")}
                  className="h-7 w-7 rounded-full hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] hover:scale-110 transition-all duration-200"
                  title="Not helpful"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {/* Trace view button - show if we have trace_id or tools were called */}
            {(message.traceId || (message.traceSummary?.tools_called?.length ?? 0) > 0) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewTrace(message.id)}
                className="h-7 w-7 rounded-full hover:bg-[var(--color-info)]/10 hover:text-[var(--color-info)] hover:scale-110 transition-all duration-200"
                title="View detailed trace"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
