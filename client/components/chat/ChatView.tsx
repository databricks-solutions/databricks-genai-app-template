"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { TraceModal } from "@/components/modals/TraceModal";
import { FunctionCallNotification } from "@/components/notifications/FunctionCallNotification";
import { Message } from "@/lib/types";

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

interface ChatViewProps {
  chatId?: string;
  onChatIdChange?: (chatId: string) => void;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string) => void;
  initialMessage?: string;
  onStreamingChange?: (isStreaming: boolean) => void;
}

export function ChatView({
  chatId,
  onChatIdChange,
  selectedAgentId,
  onAgentChange,
  initialMessage,
  onStreamingChange,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    chatId,
  );
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    messageId: string;
    feedbackType: "positive" | "negative";
  }>({ isOpen: false, messageId: "", feedbackType: "positive" });
  const [traceModal, setTraceModal] = useState<{
    isOpen: boolean;
    traceId: string;
    functionCalls?: Array<{
      call_id: string;
      name: string;
      arguments: any;
      output?: any;
    }>;
    userMessage?: string;
    assistantResponse?: string;
    masFlow?: any;
  }>({ isOpen: false, traceId: "" });
  const [activeFunctionCalls, setActiveFunctionCalls] = useState<
    Array<{
      call_id: string;
      name: string;
      arguments?: any;
      output?: any;
      status: "calling" | "completed" | "error";
    }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeStreamChatIdRef = useRef<string | undefined>(undefined);

  // Load chat messages when chatId changes
  useEffect(() => {
    const isDifferentChat = chatId !== currentSessionId;

    if (isDifferentChat) {
      if (currentSessionId) {
        if (abortControllerRef.current) {
          devLog("🛑 Aborting stream for previous chat:", currentSessionId);
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        activeStreamChatIdRef.current = undefined;
      }

      devLog("🔄 Chat session changed:", { from: currentSessionId, to: chatId });
      setCurrentSessionId(chatId);

      if (chatId) {
        devLog("📂 Loading chat history for:", chatId);
        loadChatHistory(chatId);
      } else {
        devLog("🆕 New chat - resetting all state");
        setMessages([]);
        setIsLoading(false);
        setFeedbackModal({ isOpen: false, messageId: "", feedbackType: "positive" });
        setTraceModal({ isOpen: false, traceId: "" });
      }
    }
  }, [chatId, currentSessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send initial message if provided
  useEffect(() => {
    if (initialMessage && !chatId && messages.length === 0 && !isLoading) {
      devLog("📨 Auto-sending initial message:", initialMessage);
      sendMessage(initialMessage);
    }
  }, [initialMessage, chatId, messages.length, isLoading]);

  // Notify parent when streaming state changes
  useEffect(() => {
    if (onStreamingChange) {
      onStreamingChange(isLoading);
    }
  }, [isLoading, onStreamingChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/chats/${id}`);

      if (!response.ok) {
        console.error(`Failed to load chat: ${response.status} ${response.statusText}`);
        setMessages([]);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType);
        setMessages([]);
        return;
      }

      const chat = await response.json();

      if (chat.agent_id && onAgentChange) {
        devLog("🔄 Restoring agent for chat:", chat.agent_id);
        onAgentChange(chat.agent_id);
      }

      const loadedMessages = chat.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        traceId: msg.trace_id,
        traceSummary: msg.trace_summary,
      }));

      devLog("📂 Loaded", loadedMessages.length, "messages from chat history");
      setMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setMessages([]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    devLog("📤 Sending message:", content);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setActiveFunctionCalls([]);

    const assistantMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let assistantMessageCreated = false;
    let streamedContent = "";
    let activeChatId = chatId;

    try {
      // Call invoke_endpoint - backend handles chat creation if needed
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/invoke_endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          chat_id: chatId, // Will be null for new chats - backend creates one
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      let lastUpdateTime = 0;
      const UPDATE_INTERVAL = 50;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              devLog("📨 Received event:", event.type);

              // Handle chat.created - backend created a new chat for us
              if (event.type === "chat.created") {
                activeChatId = event.chat_id;
                devLog("✅ Backend created chat:", activeChatId);

                setCurrentSessionId(activeChatId);
                activeStreamChatIdRef.current = activeChatId;

                if (activeChatId && onChatIdChange) {
                  onChatIdChange(activeChatId);
                }
                continue;
              }

              // Handle text deltas - update UI in real-time
              if (event.type === "response.output_text.delta") {
                streamedContent += event.delta;

                if (!assistantMessageCreated) {
                  assistantMessageCreated = true;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      content: streamedContent,
                      timestamp: new Date(),
                    },
                  ]);
                  lastUpdateTime = Date.now();
                } else {
                  const now = Date.now();
                  if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: streamedContent }
                          : msg,
                      ),
                    );
                    lastUpdateTime = now;
                  }
                }
              }

              // Handle function calls - for real-time notification UI
              if (event.type === "response.output_item.done") {
                const item = event.item;

                if (item?.type === "function_call") {
                  devLog("🔧 Function call started:", item.name);
                  const args = parseJsonField(item.arguments);

                  setActiveFunctionCalls((prev) => [
                    ...prev,
                    {
                      call_id: item.call_id,
                      name: item.name,
                      arguments: args,
                      status: "calling",
                    },
                  ]);
                }

                if (item?.type === "function_call_output") {
                  devLog("✅ Function call completed:", item.call_id);
                  const output = parseJsonField(item.output);

                  setActiveFunctionCalls((prev) =>
                    prev.map((fc) =>
                      fc.call_id === item.call_id
                        ? { ...fc, output, status: "completed" as const }
                        : fc,
                    ),
                  );
                }

                // Handle final message content - only use if no deltas were received
                // (for MAS, deltas are the source of truth as done events may have duplicated content)
                if (item?.type === "message" && item.content && !streamedContent) {
                  const textContent = item.content.find(
                    (c: any) => c.type === "output_text",
                  );
                  if (textContent?.text) {
                    streamedContent = textContent.text;
                    if (!assistantMessageCreated) {
                      assistantMessageCreated = true;
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: assistantMessageId,
                          role: "assistant",
                          content: streamedContent,
                          timestamp: new Date(),
                        },
                      ]);
                    } else {
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: streamedContent }
                            : msg,
                        ),
                      );
                    }
                  }
                }
              }
            } catch (parseError) {
              // Skip non-JSON lines
            }
          }
        }

        // Final content update
        if (assistantMessageCreated && streamedContent) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: streamedContent }
                : msg,
            ),
          );
        }

        // Reload chat from backend to get stored messages with trace_id
        if (activeChatId) {
          devLog("📂 Reloading chat to get trace data:", activeChatId);
          await loadChatHistory(activeChatId);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        devLog("✅ Stream aborted cleanly - user switched chats");
        if (assistantMessageCreated) {
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        }
        return;
      }

      console.error("❌ Failed to send message:", error);

      if (assistantMessageCreated) {
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: `❌ Sorry, I encountered an error: ${errorMessage}\n\nPlease check:\n- Your DATABRICKS_TOKEN is set correctly\n- The agent endpoint is accessible\n- Your internet connection`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFeedback = (messageId: string, type: "positive" | "negative") => {
    setFeedbackModal({ isOpen: true, messageId, feedbackType: type });
  };

  const handleTrace = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) {
      console.error("❌ Message not found:", messageId);
      return;
    }

    const messageIndex = messages.findIndex((m) => m.id === messageId);
    let userMessage = "";
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMessage = messages[i].content;
        break;
      }
    }

    setTraceModal({
      isOpen: true,
      traceId: message.traceId || "",
      functionCalls: message.traceSummary?.function_calls,
      userMessage,
      assistantResponse: message.content,
      masFlow: message.traceSummary?.mas_flow,
    });
  };

  const submitFeedback = async (comment: string) => {
    const message = messages.find((m) => m.id === feedbackModal.messageId);

    if (!message?.traceId) {
      console.error("No trace ID for message:", feedbackModal.messageId);
      toast.error("Cannot submit feedback: No trace ID found");
      setFeedbackModal({ isOpen: false, messageId: "", feedbackType: "positive" });
      return;
    }

    if (!selectedAgentId) {
      console.error("No agent selected");
      toast.error("Cannot submit feedback: No agent selected");
      setFeedbackModal({ isOpen: false, messageId: "", feedbackType: "positive" });
      return;
    }

    setFeedbackModal({ isOpen: false, messageId: "", feedbackType: "positive" });

    try {
      const feedbackValue = feedbackModal.feedbackType === "positive";

      const response = await fetch("/api/log_assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trace_id: message.traceId,
          agent_id: selectedAgentId,
          assessment_name: "user_feedback",
          assessment_value: feedbackValue,
          rationale: comment || undefined,
          source_id: "anonymous",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      devLog("✅ Feedback logged successfully");
    } catch (error) {
      console.error("Failed to log feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6 bg-transparent">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onFeedback={handleFeedback}
          onViewTrace={handleTrace}
          selectedAgentId={selectedAgentId}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-[var(--color-border)]/20 bg-[var(--color-background-1)]/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          selectedAgentId={selectedAgentId}
          onAgentChange={onAgentChange}
          hasMessages={messages.length > 0}
        />
      </div>

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={submitFeedback}
        feedbackType={feedbackModal.feedbackType}
      />

      <TraceModal
        isOpen={traceModal.isOpen}
        onClose={() => setTraceModal((prev) => ({ ...prev, isOpen: false }))}
        traceId={traceModal.traceId}
        functionCalls={traceModal.functionCalls}
        userMessage={traceModal.userMessage}
        assistantResponse={traceModal.assistantResponse}
        masFlow={traceModal.masFlow}
      />

      <FunctionCallNotification
        functionCalls={activeFunctionCalls}
        onDismiss={() => setActiveFunctionCalls([])}
        autoHideDuration={5000}
        isProcessing={isLoading}
        agentName={selectedAgentId}
      />
    </div>
  );
}

// Helper function to parse JSON fields
function parseJsonField(value: any): any {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch {
        return { raw: value };
      }
    }
    return { raw: value };
  }
  return value || {};
}
