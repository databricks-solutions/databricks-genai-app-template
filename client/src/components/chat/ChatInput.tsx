
import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import { ArrowUp, ChevronDown, Check, Loader2, AlertCircle, Square } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStop?: () => void; // Callback to stop streaming
  disabled?: boolean;
  isLoading?: boolean; // Whether a message is currently streaming
  selectedAgentId?: string;
  onAgentChange?: (agentId: string) => void;
  hasMessages?: boolean; // Whether the current chat has messages (locks agent)
  compact?: boolean; // Compact mode for widget
  showAgentSelector?: boolean; // Show agent dropdown
  questionExamples?: string[]; // Example questions to display as chips
}

export function ChatInput({
  onSendMessage,
  onStop,
  disabled = false,
  isLoading = false,
  selectedAgentId: propSelectedAgentId,
  onAgentChange,
  hasMessages = false,
  compact = false,
  showAgentSelector = true,
  questionExamples = [],
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { agents, loading: agentsLoading } = useAgents();
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);

  const selectedAgent = propSelectedAgentId || "";

  // Set default agent when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !propSelectedAgentId && onAgentChange) {
      onAgentChange(agents[0].id);
    }
  }, [agents, propSelectedAgentId, onAgentChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".agent-dropdown-container")) {
        setIsAgentDropdownOpen(false);
      }
    };

    if (isAgentDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isAgentDropdownOpen]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(
        textarea.scrollHeight,
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--chat-input-max-height",
          ),
        ),
      );
      textarea.style.height = `${newHeight}px`;
    }
  };

  const currentAgent = agents.find((a) => a.id === selectedAgent);
  const currentAgentHasError = currentAgent?.status === "ERROR" || !!currentAgent?.error;

  const handleExampleClick = (example: string) => {
    if (!disabled) {
      onSendMessage(example);
    }
  };

  return (
    <div className={compact ? "px-3 py-2 bg-transparent" : "px-6 py-4 bg-transparent"}>
      <div className={compact ? "" : "max-w-4xl mx-auto"}>
        <div className={`relative bg-[var(--color-background)]/70 backdrop-blur-xl backdrop-saturate-150 shadow-lg border border-[var(--color-border)]/40 focus-within:border-[var(--color-accent-primary)]/50 focus-within:shadow-xl transition-all duration-300 ${compact ? "rounded-2xl" : "rounded-3xl"}`}>
          {/* Main Input Area */}
          <div className={`flex items-end gap-2 ${compact ? "p-2.5" : "p-4"}`}>
            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message to agent..."
              disabled={disabled}
              className={`flex-1 bg-transparent resize-none outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] min-h-[24px] max-h-[var(--chat-input-max-height)] ${compact ? "py-1 text-sm" : "py-2"}`}
              rows={1}
              style={{ outline: "none", boxShadow: "none" }}
            />

            {/* Right side controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Agent Selector Dropdown */}
              {showAgentSelector && (
                <div className="relative agent-dropdown-container">
                  <button
                    onClick={() =>
                      !hasMessages && !agentsLoading && setIsAgentDropdownOpen(!isAgentDropdownOpen)
                    }
                    disabled={hasMessages || agentsLoading}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors duration-200 border max-w-[180px] ${
                      hasMessages || agentsLoading
                        ? "bg-[var(--color-muted)] opacity-60 cursor-not-allowed border-transparent"
                        : currentAgentHasError
                          ? "bg-red-100 hover:bg-red-200 border-red-300 hover:border-red-400"
                          : "bg-[var(--color-muted)] hover:bg-[var(--color-secondary)] border-transparent hover:border-[var(--color-border)]"
                    }`}
                    title={
                      agentsLoading ? "Loading agent..." : hasMessages ? "Agent locked for this chat" : currentAgentHasError ? currentAgent?.error : "Select agent"
                    }
                  >
                    {agentsLoading ? (
                      <Loader2 className="h-3 w-3 text-[var(--color-muted-foreground)] animate-spin" />
                    ) : currentAgentHasError ? (
                      <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    ) : null}
                    <span className={`text-xs font-medium truncate ${currentAgentHasError ? "text-red-700" : "text-[var(--color-foreground)]"}`}>
                      {agentsLoading ? "Loading..." : (currentAgent?.display_name || "Agent")}
                    </span>
                    {!hasMessages && !agentsLoading && (
                      <ChevronDown
                        className={`h-3 w-3 flex-shrink-0 transition-transform ${currentAgentHasError ? "text-red-500" : "text-[var(--color-muted-foreground)]"} ${isAgentDropdownOpen ? "rotate-180" : ""}`}
                      />
                    )}
                  </button>

                  {/* Agent Dropdown Menu */}
                  {isAgentDropdownOpen && agents.length > 0 && (
                    <div className={`absolute bottom-full right-0 mb-2 bg-[var(--color-background)] rounded-xl shadow-xl border border-[var(--color-border)] py-2 z-50 max-h-[300px] overflow-y-auto ${compact ? "w-[260px]" : "w-[300px]"}`}>
                      {agents.map((agent) => {
                        const hasError = agent.status === "ERROR" || !!agent.error;
                        return (
                          <button
                            key={agent.id}
                            onClick={() => {
                              onAgentChange?.(agent.id);
                              setIsAgentDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-3 ${
                              hasError
                                ? "bg-red-50 hover:bg-red-100"
                                : selectedAgent === agent.id
                                  ? "bg-[var(--color-accent-primary)]/10"
                                  : "hover:bg-[var(--color-accent-primary)]/10"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-sm leading-tight truncate ${hasError ? "text-red-700" : "text-[var(--color-foreground)]"}`}>
                                {agent.display_name}
                              </div>
                              {hasError ? (
                                <div className="text-xs text-red-600 mt-1 leading-snug line-clamp-2">
                                  {agent.error}
                                </div>
                              ) : agent.display_description ? (
                                <div className="text-xs text-[var(--color-muted-foreground)] mt-1 leading-snug line-clamp-2">
                                  {agent.display_description}
                                </div>
                              ) : null}
                            </div>
                            {hasError ? (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            ) : selectedAgent === agent.id ? (
                              <Check className="h-4 w-4 text-[var(--color-accent-primary)] flex-shrink-0 mt-0.5" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Send/Stop Button */}
              {isLoading ? (
                /* Stop Button - shown while streaming */
                <button
                  onClick={onStop}
                  className={`flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${compact ? "h-7 w-7" : "h-8 w-8"} bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/80 text-white hover:scale-105 shadow-md hover:shadow-lg`}
                  title="Stop generating"
                >
                  <Square className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} fill="currentColor" />
                </button>
              ) : (
                /* Send Button - shown when not streaming */
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || disabled}
                  className={`flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${compact ? "h-7 w-7" : "h-8 w-8"} ${
                    message.trim() && !disabled
                      ? "bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/80 text-white hover:scale-105 shadow-md hover:shadow-lg"
                      : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed opacity-50"
                  }`}
                >
                  <ArrowUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Examples */}
      {questionExamples.length > 0 && !compact && (
        <div className="mt-3 flex items-center gap-x-1.5 justify-center">
          <span className="text-sm text-[var(--color-muted-foreground)] flex-shrink-0">Try:</span>
          {questionExamples.slice(0, 5).map((example, index) => (
            <span key={index} className="flex items-center flex-shrink-0">
              <span className="group relative">
                <button
                  onClick={() => handleExampleClick(example)}
                  disabled={disabled}
                  className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-accent-primary)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:underline"
                >
                  {example.length > 35 ? `${example.slice(0, 35)}...` : example}
                </button>
                {/* Tooltip */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-[var(--color-foreground)] bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-normal w-72 text-center z-50">
                  {example}
                </span>
              </span>
              {index < Math.min(questionExamples.length, 5) - 1 && <span className="text-[var(--color-border)] mx-1.5">•</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
