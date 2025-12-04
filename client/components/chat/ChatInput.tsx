"use client";

import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import { ArrowUp, ChevronDown, Check } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string) => void;
  hasMessages?: boolean; // Whether the current chat has messages (locks agent)
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  selectedAgentId: propSelectedAgentId,
  onAgentChange,
  hasMessages = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { agents } = useAgents();
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

  return (
    <div className="px-6 py-4 bg-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm rounded-3xl shadow-lg border border-[var(--color-border)] focus-within:border-[var(--color-accent-primary)]/60 focus-within:shadow-xl transition-all duration-300">
          {/* Main Input Area */}
          <div className="flex items-end gap-3 p-4">
            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message to agent..."
              disabled={disabled}
              className="flex-1 bg-transparent resize-none outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] min-h-[24px] max-h-[var(--chat-input-max-height)] py-2"
              rows={1}
              style={{ outline: "none", boxShadow: "none" }}
            />

            {/* Right side controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Agent Selector Dropdown */}
              <div className="relative agent-dropdown-container">
                <button
                  onClick={() =>
                    !hasMessages && setIsAgentDropdownOpen(!isAgentDropdownOpen)
                  }
                  disabled={hasMessages}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors duration-200 border ${
                    hasMessages
                      ? "bg-[var(--color-muted)] opacity-60 cursor-not-allowed border-transparent"
                      : "bg-[var(--color-muted)] hover:bg-[var(--color-secondary)] border-transparent hover:border-[var(--color-border)]"
                  }`}
                  title={
                    hasMessages ? "Agent locked for this chat" : "Select agent"
                  }
                >
                  <span className="text-xs font-medium text-[var(--color-foreground)]">
                    {currentAgent?.display_name || "Agent"}
                  </span>
                  {!hasMessages && (
                    <ChevronDown
                      className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${isAgentDropdownOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {/* Agent Dropdown Menu */}
                {isAgentDropdownOpen && agents.length > 0 && (
                  <div className="absolute bottom-full right-0 mb-2 w-[280px] bg-[var(--color-background)] rounded-xl shadow-xl border border-[var(--color-border)] py-2 z-50">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          onAgentChange?.(agent.id);
                          setIsAgentDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-[var(--color-muted)] transition-colors flex items-start justify-between gap-3 ${
                          selectedAgent === agent.id
                            ? "bg-[var(--color-muted)]"
                            : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[var(--color-foreground)] leading-tight">
                            {agent.display_name}
                          </div>
                          <div className="text-xs text-[var(--color-muted-foreground)] mt-1 leading-snug">
                            {agent.display_description}
                          </div>
                        </div>
                        {selectedAgent === agent.id && (
                          <Check className="h-4 w-4 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  message.trim() && !disabled
                    ? "bg-[var(--color-primary-navy)] hover:bg-[var(--color-primary-navy)]/80 text-[var(--color-white)] hover:scale-110 shadow-md hover:shadow-lg"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed opacity-50"
                }`}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
