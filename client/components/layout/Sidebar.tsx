"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  ChevronDown,
  FlaskConical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  preview: string;
}

interface SidebarProps {
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  selectedAgentId?: string;
  onAgentChange?: (agentId: string) => void;
}

export function Sidebar({
  currentChatId,
  onChatSelect,
  onNewChat,
  isMobile = false,
  isOpen = true,
  onToggle,
  isCollapsed = false,
  onCollapse,
  selectedAgentId: propSelectedAgentId,
  onAgentChange,
}: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { agents } = useAgents();
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);
  const [toolsDropdownPosition, setToolsDropdownPosition] = useState<{
    bottom: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedAgentId = propSelectedAgentId || "";

  // Set default agent when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !propSelectedAgentId && onAgentChange) {
      onAgentChange(agents[0].id);
    }
  }, [agents, propSelectedAgentId, onAgentChange]);

  // Fetch chat history on mount and when currentChatId changes (new chat created)
  useEffect(() => {
    fetchChatHistory();
  }, [currentChatId]);

  // Set mounted state for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when tools dropdown opens
  useEffect(() => {
    if (isToolsOpen && toolsButtonRef.current) {
      const rect = toolsButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate bottom position (distance from bottom of viewport to top of button)
      const bottom = viewportHeight - rect.top;

      setToolsDropdownPosition({
        bottom: bottom,
        left: rect.right + 8, // 8px gap from icon's right edge
      });
    } else {
      setToolsDropdownPosition(null);
    }
  }, [isToolsOpen]);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    if (!isToolsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        toolsButtonRef.current &&
        !toolsButtonRef.current.contains(target) &&
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(target)
      ) {
        setIsToolsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isToolsOpen]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch("/api/chats");
      const data = await response.json();

      // Transform to sidebar format
      const chats = data.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        lastMessage:
          chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1].content
            : "",
        timestamp: new Date(chat.updated_at),
        preview:
          chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1].content.slice(0, 50) +
              "..."
            : "",
      }));

      setChats(chats);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      toast.error("Failed to load chat history");
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Mock API call - replace with actual implementation
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      setChats(chats.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const handleRenameChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setEditingChat(chatId);
      setEditTitle(chat.title);
    }
  };

  const saveRename = async (chatId: string) => {
    try {
      // Mock API call - replace with actual implementation
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });

      setChats(
        chats.map((chat) =>
          chat.id === chatId ? { ...chat, title: editTitle } : chat,
        ),
      );
      setEditingChat(null);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      toast.error("Failed to rename chat");
    }
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div
        className={`${isCollapsed ? "p-2" : "p-4"} border-b border-[var(--color-primary-navy)]/10 dark:border-[var(--color-white)]/5 backdrop-blur-sm transition-all duration-300`}
      >
        <button
          onClick={onNewChat}
          className={`flex items-center w-full hover:bg-[var(--color-primary-navy)]/[0.06] dark:hover:bg-[var(--color-primary-navy)]/40 rounded-xl transition-all duration-300 group ${isCollapsed ? "p-2 justify-center" : "p-3 gap-3"}`}
        >
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-navy)] via-[var(--color-primary-navy)]/80 to-[var(--color-primary-navy)] dark:from-[var(--color-primary-navy)]/80 dark:via-[var(--color-primary-navy)]/60 dark:to-[var(--color-primary-navy)]/80 text-[var(--color-white)] transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:scale-105 h-10 w-10 flex-shrink-0">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <span className="text-[var(--color-primary-navy)] dark:text-[var(--color-white)] font-semibold text-[15px] transition-opacity duration-300">
              New Chat
            </span>
          )}
        </button>
      </div>

      {/* Chat List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {chats.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-primary-navy)]/50 dark:text-[var(--color-white)]/40">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No chat history yet</p>
              <p className="text-xs mt-1 opacity-70">
                Start a new conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                  className={`
                    group relative p-3.5 rounded-xl cursor-pointer transition-all duration-200
                    ${
                      currentChatId === chat.id
                        ? "bg-gradient-to-br from-[var(--color-primary-navy)] via-[var(--color-primary-navy)]/90 to-[var(--color-primary-navy)] dark:from-[var(--color-primary-navy)]/80 dark:via-[var(--color-primary-navy)]/60 dark:to-[var(--color-primary-navy)]/80 text-[var(--color-white)] shadow-md border border-[var(--color-primary-navy)]/10"
                        : "bg-[var(--color-white)]/40 dark:bg-[var(--color-primary-navy)]/10 hover:bg-[var(--color-white)]/70 dark:hover:bg-[var(--color-primary-navy)]/25 text-[var(--color-foreground)] border border-transparent hover:border-[var(--color-primary-navy)]/15 dark:hover:border-[var(--color-white)]/10 hover:shadow-sm"
                    }
                  `}
                >
                  {editingChat === chat.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(chat.id);
                        if (e.key === "Escape") setEditingChat(null);
                      }}
                      className="w-full bg-transparent border-b border-current outline-none text-sm"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <h3
                        className={`font-semibold text-sm truncate pr-12 leading-tight ${
                          currentChatId === chat.id
                            ? "text-[var(--color-white)]"
                            : "text-[var(--color-primary-navy)] dark:text-[var(--color-white)]"
                        }`}
                      >
                        {chat.title}
                      </h3>
                      <p
                        className={`text-xs mt-2 truncate leading-relaxed ${
                          currentChatId === chat.id
                            ? "text-[var(--color-white)]/85"
                            : "text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60"
                        }`}
                      >
                        {chat.preview}
                      </p>
                      <p
                        className={`text-[11px] mt-1.5 ${
                          currentChatId === chat.id
                            ? "text-[var(--color-white)]/70"
                            : "text-[var(--color-primary-navy)]/50 dark:text-[var(--color-white)]/50"
                        }`}
                      >
                        {formatDistanceToNow(chat.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    </>
                  )}

                  {/* Action buttons */}
                  {(hoveredChat === chat.id || currentChatId === chat.id) &&
                    !editingChat && (
                      <div className="absolute right-2.5 top-3 flex gap-2">
                        <button
                          onClick={(e) => handleRenameChat(chat.id, e)}
                          className="transition-all duration-200 group/btn"
                          title="Rename"
                        >
                          <Edit2
                            className={`h-3.5 w-3.5 transition-colors ${
                              currentChatId === chat.id
                                ? "text-[var(--color-white)]/70 hover:text-[var(--color-white)]"
                                : "text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 hover:text-[var(--color-primary-navy)] dark:hover:text-[var(--color-white)]"
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="transition-all duration-200 group/btn"
                          title="Delete"
                        >
                          <Trash2
                            className={`h-3.5 w-3.5 transition-colors ${
                              currentChatId === chat.id
                                ? "text-[var(--color-white)]/70 hover:text-[var(--color-white)]"
                                : "text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 hover:text-[var(--color-error)]"
                            }`}
                          />
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tools Section at Bottom */}
      <div
        className={`mt-auto border-t border-[var(--color-primary-navy)]/10 dark:border-[var(--color-white)]/5 backdrop-blur-sm overflow-visible ${isCollapsed ? "p-2" : "p-3"}`}
      >
        {!isCollapsed ? (
          <div className="space-y-2">
            {/* Tools Dropdown */}
            <div className="relative tools-dropdown-container">
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-[var(--color-primary-navy)]/[0.06] dark:hover:bg-[var(--color-primary-navy)]/40 transition-all duration-200 group border border-transparent hover:border-[var(--color-primary-navy)]/10 dark:hover:border-[var(--color-white)]/10"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 group-hover:text-[var(--color-primary-navy)] dark:group-hover:text-[var(--color-white)] transition-colors" />
                  <span className="text-sm font-semibold text-[var(--color-primary-navy)] dark:text-[var(--color-white)]">
                    Tools
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 transition-all group-hover:text-[var(--color-primary-navy)] dark:group-hover:text-[var(--color-white)] ${isToolsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Tools Dropdown */}
              {isToolsOpen && selectedAgentId && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--color-background)] rounded-lg shadow-lg border border-[var(--color-border)] max-h-80 overflow-y-auto z-20">
                  <div className="py-2">
                    {agents
                      .find((a) => a.id === selectedAgentId)
                      ?.tools.map((tool, index) => (
                        <a
                          key={index}
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-muted)] transition-colors no-underline"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <Image
                              src="/logos/databricks-symbol-color.svg"
                              alt="Databricks"
                              width={20}
                              height={20}
                              className="w-5 h-5"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm block">
                              {tool.display_name}
                            </span>
                            <span className="text-xs text-[var(--color-muted-foreground)] mt-1 block">
                              {tool.type || "Tool"}
                            </span>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* MLFlow Monitoring Button */}
            <button
              onClick={() => {
                const agent = agents.find((a) => a.id === selectedAgentId);
                if (agent?.mlflow_traces_url) {
                  window.open(agent.mlflow_traces_url, "_blank");
                }
              }}
              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl hover:bg-[var(--color-primary-navy)]/[0.06] dark:hover:bg-[var(--color-primary-navy)]/40 transition-all duration-200 group border border-transparent hover:border-[var(--color-primary-navy)]/10 dark:hover:border-[var(--color-white)]/10"
            >
              <FlaskConical className="h-4 w-4 text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 group-hover:text-[var(--color-primary-navy)] dark:group-hover:text-[var(--color-white)] transition-colors" />
              <span className="text-sm font-semibold text-[var(--color-primary-navy)] dark:text-[var(--color-white)]">
                MLFlow Monitoring
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Tools Icon (Collapsed) */}
            <button
              ref={toolsButtonRef}
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="w-full p-2 flex justify-center rounded-lg hover:bg-[var(--color-muted)] transition-all duration-200"
              title="Tools"
            >
              <Settings className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </button>

            {/* MLFlow Monitoring Icon (Collapsed) */}
            <button
              onClick={() => {
                const agent = agents.find((a) => a.id === selectedAgentId);
                if (agent?.mlflow_traces_url) {
                  window.open(agent.mlflow_traces_url, "_blank");
                }
              }}
              className="w-full p-2 flex justify-center rounded-lg hover:bg-[var(--color-muted)] transition-colors duration-200"
              title="MLFlow Monitoring"
            >
              <FlaskConical className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </button>
          </div>
        )}
      </div>

      {/* Collapse/Expand Button */}
      {!isMobile && (
        <div className="absolute -right-3 top-20 z-10">
          <button
            onClick={() => onCollapse?.(!isCollapsed)}
            className="p-1.5 rounded-full bg-[var(--color-background)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-200 group"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]" />
            )}
          </button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] shadow-md lg:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile sidebar overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-[var(--color-backdrop)] z-40 lg:hidden"
            onClick={onToggle}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={`
            fixed left-0 top-0 h-full w-[var(--sidebar-width)]
            bg-[var(--color-background-2)] dark:bg-gradient-to-br dark:from-[var(--color-background-1)] dark:via-[var(--color-primary-navy)]/20 dark:to-[var(--color-background-1)] border-r border-[var(--color-primary-navy)]/15 dark:border-[var(--color-white)]/10
            transform transition-transform duration-300 z-40
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            lg:hidden
          `}
        >
          <div className="flex flex-col h-full pt-16">{sidebarContent}</div>
        </aside>
      </>
    );
  }

  return (
    <>
      <aside
        style={{ overflowY: "auto", overflowX: "clip" }}
        className={`
          hidden lg:flex flex-col bg-[var(--color-background-2)] dark:bg-gradient-to-br dark:from-[var(--color-background-1)] dark:via-[var(--color-primary-navy)]/20 dark:to-[var(--color-background-1)] border-r border-[var(--color-primary-navy)]/15 dark:border-[var(--color-white)]/10 h-full relative transition-all duration-300 flex-shrink-0
          ${isCollapsed ? "w-20" : "w-[var(--sidebar-width)]"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Portal-rendered Tools Dropdown for Collapsed State */}
      {mounted &&
        isToolsOpen &&
        selectedAgentId &&
        toolsDropdownPosition &&
        createPortal(
          <div
            ref={toolsDropdownRef}
            className="fixed w-72 bg-[var(--color-white)] dark:bg-[var(--color-primary-navy)] rounded-lg shadow-2xl border border-[var(--color-primary-navy)]/20 dark:border-[var(--color-white)]/20 max-h-80 overflow-y-auto z-[9999]"
            style={{
              bottom: `${toolsDropdownPosition.bottom}px`,
              left: `${toolsDropdownPosition.left}px`,
            }}
          >
            <div className="px-4 py-2 border-b border-[var(--color-primary-navy)]/20 dark:border-[var(--color-white)]/20">
              <h3 className="font-medium text-sm text-[var(--color-primary-navy)] dark:text-[var(--color-white)]">
                Tools & Resources
              </h3>
            </div>
            <div className="py-2">
              {agents
                .find((a) => a.id === selectedAgentId)
                ?.tools.map((tool, index) => (
                  <a
                    key={index}
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-primary-navy)]/5 dark:hover:bg-[var(--color-white)]/5 transition-colors no-underline"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Image
                        src="/logos/databricks-symbol-color.svg"
                        alt="Databricks"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm block text-[var(--color-primary-navy)] dark:text-[var(--color-white)]">
                        {tool.display_name}
                      </span>
                      <span className="text-xs text-[var(--color-primary-navy)]/60 dark:text-[var(--color-white)]/60 mt-1 block">
                        {tool.type || "Tool"}
                      </span>
                    </div>
                  </a>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
