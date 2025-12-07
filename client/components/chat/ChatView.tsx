"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { TraceModal } from "@/components/modals/TraceModal";
import { FunctionCallNotification } from "@/components/notifications/FunctionCallNotification";
import { Message, TraceSummary } from "@/lib/types";

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
      output: any;
    }>;
    userMessage?: string;
    assistantResponse?: string;
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

  // Stream management refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeStreamChatIdRef = useRef<string | undefined>(undefined);

  // Load chat messages when chatId changes
  useEffect(() => {
    // Check if we're switching to a different chat or starting new
    const isDifferentChat = chatId !== currentSessionId;

    if (isDifferentChat) {
      // Only abort if we're LEAVING a chat (not creating a new one)
      // If currentSessionId is set, we're switching away from it
      if (currentSessionId) {
        // Abort any active stream from the previous chat
        if (abortControllerRef.current) {
          devLog("🛑 Aborting stream for previous chat:", currentSessionId);
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        activeStreamChatIdRef.current = undefined;
      }

      devLog("🔄 Chat session changed:", {
        from: currentSessionId,
        to: chatId,
      });
      setCurrentSessionId(chatId);

      if (chatId) {
        devLog("📂 Loading chat history for:", chatId);
        loadChatHistory(chatId);
      } else {
        // New chat - completely reset state
        devLog("🆕 New chat - resetting all state");
        setMessages([]);
        setIsLoading(false);
        setFeedbackModal({
          isOpen: false,
          messageId: "",
          feedbackType: "positive",
        });
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

      // Check if response is OK
      if (!response.ok) {
        console.error(
          `Failed to load chat: ${response.status} ${response.statusText}`,
        );
        setMessages([]);
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType);
        setMessages([]);
        return;
      }

      const chat = await response.json();

      // Restore the agent for this chat
      if (chat.agent_id && onAgentChange) {
        devLog("🔄 Restoring agent for chat:", chat.agent_id);
        onAgentChange(chat.agent_id);
      }

      const loadedMessages = chat.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        // Map backend snake_case to frontend camelCase
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
    devLog("🎯 Current state:", {
      chatId,
      selectedAgentId,
      hasOnChatIdChange: !!onChatIdChange,
    });

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: Message = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create assistant message ID (but don't add to messages yet - wait for first stream event)
    const assistantMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let assistantMessageCreated = false;
    devLog("💬 Prepared message ID:", assistantMessageId);

    // Declare variables outside try block so they're accessible in finally
    let activeChatId: string | undefined = chatId;
    let streamedContent = "";
    let traceId = "";
    let traceSummary: TraceSummary | null = null;
    // Track function calls locally during streaming (not state - state updates are async!)
    const collectedFunctionCalls: Array<{
      call_id: string;
      name: string;
      arguments?: any;
      output?: any;
    }> = [];

    try {
      // If no chatId, we need to create a new chat first
      if (!activeChatId) {
        devLog("📝 Creating new chat with agent:", selectedAgentId);
        const createResponse = await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: content.slice(0, 50),
            agent_id: selectedAgentId, // Save the agent with the chat
          }),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create chat: ${createResponse.status}`);
        }

        const newChat = await createResponse.json();
        activeChatId = newChat.id;
        devLog(
          "✅ Created new chat:",
          activeChatId,
          "with agent:",
          selectedAgentId,
        );

        // Update internal session ID immediately to prevent reset
        setCurrentSessionId(activeChatId);

        // Update parent component with new chatId
        if (activeChatId && onChatIdChange) {
          onChatIdChange(activeChatId);
        }
      }

      if (!activeChatId) {
        throw new Error("No chat ID available");
      }

      // Capture the chatId for this stream (frozen for validation)
      const streamChatId = activeChatId;
      activeStreamChatIdRef.current = streamChatId;
      devLog("🎯 Stream chatId locked:", streamChatId);

      // Clear any previous function call notifications
      setActiveFunctionCalls([]);

      devLog(
        "🔌 Calling /api/invoke_endpoint with chatId:",
        activeChatId,
        "agentId:",
        selectedAgentId,
      );

      // Development: Call backend directly to avoid Next.js dev server buffering the stream
      // Production: Use relative URL (same origin - FastAPI serves both frontend and API)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/invoke_endpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true, // Enable streaming
        }),
        signal: abortController.signal,
      });

      devLog(
        "📡 Response status:",
        response.status,
        "Content-Type:",
        response.headers.get("Content-Type"),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      // Streaming response handling
      console.log(`[Stream] Starting response from agent: ${selectedAgentId}`);

      devLog("🌊 STREAMING: About to start reading stream");
      devLog("🌊 STREAMING: response.body exists?", !!response.body);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        console.error("❌ STREAMING: No reader from response body!");
        throw new Error("No response body");
      }

      devLog("🌊 STREAMING: Reader created successfully");
      devLog("📖 Starting to read stream...");

      let buffer = "";
      // streamedContent, traceId, traceSummary now declared outside try block
      let lastUpdateTime = 0;
      const UPDATE_INTERVAL = 50; // Update UI every 50ms for smooth streaming

      try {
        devLog("🌊 STREAMING: Entering read loop");
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            devLog("🌊 STREAMING: Stream done");
            break;
          }

          chunkCount++;
          devLog(
            `🌊 STREAMING: Chunk ${chunkCount}, bytes:`,
            value?.length,
          );

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          devLog(`🌊 STREAMING: Split into ${lines.length} lines`);

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            // Skip empty lines
            if (!line.trim()) continue;

            // Skip lines that don't start with data:
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();

            // Skip empty data after extraction
            if (!data) continue;

            // Detect HTML responses (error indicators)
            if (data.startsWith("<") || data.startsWith("<!DOCTYPE")) {
              console.error(
                "❌ CLIENT: Received HTML instead of JSON:",
                data.substring(0, 200),
              );
              continue;
            }

            // Log raw data for trace.summary events
            if (data.includes("trace.summary")) {
              devLog("🔍 RAW TRACE.SUMMARY LINE:", data.substring(0, 200));
            }

            if (data === "[DONE]") {
              devLog("Stream completed");
              continue;
            }

            try {
              const event = JSON.parse(data);
              devLog("📨 Received event:", event.type);

              // Log trace.summary events in detail
              if (event.type === "trace.summary") {
                devLog("🎯 TRACE SUMMARY EVENT RECEIVED:", event);
              }

              // Handle text deltas
              if (event.type === "response.output_text.delta") {
                streamedContent += event.delta;

                // Validate stream is still for current chat
                if (activeStreamChatIdRef.current !== streamChatId) {
                  devLog(
                    "⚠️ Ignoring text delta from old stream (chat switched)",
                  );
                  continue;
                }

                // Create assistant message on first delta
                if (!assistantMessageCreated) {
                  assistantMessageCreated = true;
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: "assistant",
                    content: streamedContent,
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  devLog("✨ Created assistant message on first stream");
                  lastUpdateTime = Date.now();
                } else {
                  // Throttle updates: only update UI every UPDATE_INTERVAL ms
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

              // Handle client_request_id from backend (for MLflow trace linking)
              if (event.type === "trace.client_request_id") {
                traceId = event.client_request_id;
                devLog(
                  "📋 Received client_request_id for trace:",
                  traceId,
                );
              }

              // Handle trace ID (legacy - keeping for backward compatibility)
              if (event.id && !traceId) {
                traceId = event.id;
              }

              // Handle completed items (for final text and function calls)
              if (event.type === "response.output_item.done") {
                const item = event.item;

                // Handle function call start
                if (item?.type === "function_call") {
                  devLog("🔧 Function call started:", item.name);
                  try {
                    const args = item.arguments
                      ? typeof item.arguments === "string"
                        ? JSON.parse(item.arguments)
                        : item.arguments
                      : {};

                    // Add to local collected list (for saving to backend)
                    collectedFunctionCalls.push({
                      call_id: item.call_id,
                      name: item.name,
                      arguments: args,
                    });

                    // Also update state (for real-time notifications UI)
                    setActiveFunctionCalls((prev) => [
                      ...prev,
                      {
                        call_id: item.call_id,
                        name: item.name,
                        arguments: args,
                        status: "calling",
                      },
                    ]);
                  } catch (argParseError) {
                    console.error(
                      "❌ CLIENT: Failed to parse function call arguments:",
                      argParseError,
                    );

                    // Add to local collected list even if parsing failed
                    collectedFunctionCalls.push({
                      call_id: item.call_id,
                      name: item.name,
                      arguments: item.arguments || {},
                    });

                    setActiveFunctionCalls((prev) => [
                      ...prev,
                      {
                        call_id: item.call_id,
                        name: item.name,
                        arguments: item.arguments || {},
                        status: "calling",
                      },
                    ]);
                  }
                }

                // Handle function call output
                if (item?.type === "function_call_output") {
                  devLog("✅ Function call completed:", item.call_id);
                  try {
                    const output = item.output
                      ? typeof item.output === "string"
                        ? JSON.parse(item.output)
                        : item.output
                      : {};

                    // Update local collected list with output
                    const fcIndex = collectedFunctionCalls.findIndex(
                      (fc) => fc.call_id === item.call_id,
                    );
                    if (fcIndex !== -1) {
                      collectedFunctionCalls[fcIndex].output = output;
                    }

                    // Also update state (for real-time notifications UI)
                    setActiveFunctionCalls((prev) =>
                      prev.map((fc) =>
                        fc.call_id === item.call_id
                          ? {
                              ...fc,
                              output: output,
                              status: "completed" as const,
                            }
                          : fc,
                      ),
                    );
                  } catch (outputParseError) {
                    console.error(
                      "❌ CLIENT: Failed to parse function call output:",
                      outputParseError,
                    );

                    // Update local collected list even if parsing failed
                    const fcIndex = collectedFunctionCalls.findIndex(
                      (fc) => fc.call_id === item.call_id,
                    );
                    if (fcIndex !== -1) {
                      collectedFunctionCalls[fcIndex].output =
                        item.output || {};
                    }

                    setActiveFunctionCalls((prev) =>
                      prev.map((fc) =>
                        fc.call_id === item.call_id
                          ? {
                              ...fc,
                              output: item.output || {},
                              status: "completed" as const,
                            }
                          : fc,
                      ),
                    );
                  }
                }

                // Update final text if available
                if (item?.type === "message" && item.content) {
                  const textContent = item.content.find(
                    (c: any) => c.type === "output_text",
                  );
                  if (textContent?.text) {
                    streamedContent = textContent.text;

                    // Validate stream is still for current chat
                    if (activeStreamChatIdRef.current !== streamChatId) {
                      devLog(
                        "⚠️ Ignoring final text from old stream (chat switched)",
                      );
                      continue;
                    }

                    // Ensure assistant message exists
                    if (!assistantMessageCreated) {
                      assistantMessageCreated = true;
                      const assistantMessage: Message = {
                        id: assistantMessageId,
                        role: "assistant",
                        content: streamedContent,
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, assistantMessage]);
                      devLog("✨ Created assistant message from complete text");
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

              // Handle trace summary
              if (event.type === "trace.summary") {
                traceSummary = event.traceSummary;

                devLog(
                  "📊 Received trace summary for message:",
                  assistantMessageId,
                );
                devLog("   Trace ID:", traceSummary?.trace_id);
                devLog(
                  "   Function calls in summary:",
                  traceSummary?.function_calls?.length || 0,
                );
                devLog(
                  "   Collected function calls:",
                  collectedFunctionCalls.length,
                );

                // IMPORTANT: Merge our collected function calls into trace summary
                // Databricks may not send detailed function_calls in trace.summary,
                // but we collected them during streaming for notifications
                if (traceSummary && collectedFunctionCalls.length > 0) {
                  // Map our collected function calls to the expected format
                  traceSummary.function_calls = collectedFunctionCalls.map(
                    (fc) => ({
                      call_id: fc.call_id,
                      name: fc.name,
                      arguments: fc.arguments || {},
                      output: fc.output || {},
                    }),
                  );
                  devLog(
                    "✅ Merged collected function calls into trace summary:",
                    traceSummary.function_calls.length,
                  );
                }

                // Validate stream is still for current chat
                if (activeStreamChatIdRef.current !== streamChatId) {
                  devLog(
                    "⚠️ Ignoring trace summary from old stream (chat switched)",
                  );
                  continue;
                }

                // Ensure assistant message exists before updating trace
                if (!assistantMessageCreated) {
                  assistantMessageCreated = true;
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: "assistant",
                    content: streamedContent,
                    timestamp: new Date(),
                    traceId: traceSummary?.trace_id || traceId,
                    traceSummary: traceSummary || undefined,
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  devLog("✨ Created assistant message with trace");
                } else {
                  // Update ONLY this specific message with trace data
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            traceId: traceSummary?.trace_id || traceId,
                            traceSummary: traceSummary || undefined, // Use the cloned object
                          }
                        : msg,
                    ),
                  );
                }
              }
            } catch (parseError: any) {
              // Enhanced error logging for debugging
              const dataPreview =
                data.length > 200 ? data.substring(0, 200) + "..." : data;

              if (data.includes("{") || data.includes("[")) {
                // Looks like JSON but failed to parse
                console.error(
                  "❌ CLIENT: JSON parse error:",
                  parseError.message,
                );
                console.error("   Data preview:", dataPreview);
                console.error("   Full data length:", data.length);
              } else {
                // Doesn't look like JSON
                devLog("⚠️  CLIENT: Skipping non-JSON line:", dataPreview);
              }
            }
          }
        }

        // Final update with all collected data (only if needed)
        devLog("✅ Stream finished for message:", assistantMessageId);
        devLog("   Final content length:", streamedContent.length);
        devLog("   Trace summary:", traceSummary ? "attached" : "none");
        devLog("   Collected function calls:", collectedFunctionCalls.length);

        // If we have function calls but no trace summary, create a minimal one
        if (!traceSummary && collectedFunctionCalls.length > 0) {
          traceSummary = {
            trace_id: traceId || "",
            duration_ms: 0,
            status: "completed",
            tools_called: [],
            retrieval_calls: [],
            llm_calls: [],
            total_tokens: 0,
            spans_count: 0,
            function_calls: collectedFunctionCalls.map((fc) => ({
              call_id: fc.call_id,
              name: fc.name,
              arguments: fc.arguments || {},
              output: fc.output || {},
            })),
          };
          devLog("✅ Created trace summary from collected function calls");
        }

        // Validate stream is still for current chat before final update
        if (activeStreamChatIdRef.current !== streamChatId) {
          devLog(
            "⚠️ Stream completed but chat already switched - skipping final update",
          );
        } else {
          // Ensure assistant message was created (in case no events triggered creation)
          if (!assistantMessageCreated && streamedContent) {
            assistantMessageCreated = true;
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: "assistant",
              content: streamedContent,
              timestamp: new Date(),
              traceId: traceId,
              traceSummary: traceSummary,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            devLog("✨ Created assistant message at stream end");
          } else if (assistantMessageCreated) {
            // Update existing message with final data
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMessageId) {
                  return msg; // Don't modify other messages
                }

                return {
                  ...msg,
                  content: streamedContent || msg.content,
                  traceId: traceId || msg.traceId,
                  traceSummary: traceSummary || msg.traceSummary,
                };
              }),
            );
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      // Handle AbortError gracefully (user switched chats)
      if (error instanceof Error && error.name === "AbortError") {
        devLog("✅ Stream aborted cleanly - user switched chats");
        // Remove any temporary assistant message created before abort
        if (assistantMessageCreated) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== assistantMessageId),
          );
        }
        return; // Don't show error to user
      }

      // Handle real errors
      console.error("❌ Failed to send message:", error);

      // Remove the temporary assistant message on error (if it was created)
      if (assistantMessageCreated) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId),
        );
      }

      // Show detailed error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
      // Clear abort controller ref
      abortControllerRef.current = null;

      // Save messages to backend after streaming completes
      // This ensures chat history persists when switching between conversations
      if (activeChatId && assistantMessageCreated && streamedContent) {
        try {
          devLog("💾 Saving messages to backend for chat:", activeChatId);
          await fetch(`/api/chats/${activeChatId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: userMessage.content,
                },
                {
                  role: "assistant",
                  content: streamedContent,
                  trace_id: traceId,
                  trace_summary: traceSummary,
                },
              ],
            }),
          });
          devLog("✅ Messages saved to backend");
        } catch (saveError) {
          console.error("Failed to save messages to backend:", saveError);
          // Don't throw - this is a background save operation
        }
      }
    }
  };

  const handleFeedback = (messageId: string, type: "positive" | "negative") => {
    setFeedbackModal({ isOpen: true, messageId, feedbackType: type });
  };

  const handleTrace = (messageId: string) => {
    // Find the specific message by its unique ID
    const message = messages.find((m) => m.id === messageId);

    if (!message) {
      console.error("❌ Message not found:", messageId);
      return;
    }

    // Find the user message that came before this assistant message
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    let userMessage = "";
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMessage = messages[i].content;
        break;
      }
    }

    const traceId = message.traceId || "";
    const functionCalls = message.traceSummary?.function_calls;
    const assistantResponse = message.content;

    setTraceModal({
      isOpen: true,
      traceId,
      functionCalls: functionCalls,
      userMessage,
      assistantResponse,
    });
  };

  const submitFeedback = async (comment: string) => {
    const message = messages.find((m) => m.id === feedbackModal.messageId);

    if (!message?.traceId) {
      console.error("No trace ID for message:", feedbackModal.messageId);
      toast.error("Cannot submit feedback: No trace ID found");
      setFeedbackModal({
        isOpen: false,
        messageId: "",
        feedbackType: "positive",
      });
      return;
    }

    if (!selectedAgentId) {
      console.error("No agent selected");
      toast.error("Cannot submit feedback: No agent selected");
      setFeedbackModal({
        isOpen: false,
        messageId: "",
        feedbackType: "positive",
      });
      return;
    }

    // ⚡ OPTIMISTIC UI: Close modal immediately for instant feedback
    setFeedbackModal({
      isOpen: false,
      messageId: "",
      feedbackType: "positive",
    });

    // Submit feedback in background
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
      // Silent success - no toast needed, modal already closed

    } catch (error) {
      console.error("Failed to log feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Container - Scrollable */}
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

      {/* Chat Input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)]/20 bg-[var(--color-background-1)]/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isLoading}
          selectedAgentId={selectedAgentId}
          onAgentChange={onAgentChange}
          hasMessages={messages.length > 0}
        />
      </div>

      {/* Modals */}
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
      />

      {/* Function Call Notification */}
      <FunctionCallNotification
        functionCalls={activeFunctionCalls}
        onDismiss={() => setActiveFunctionCalls([])}
        autoHideDuration={5000}
      />
    </div>
  );
}
