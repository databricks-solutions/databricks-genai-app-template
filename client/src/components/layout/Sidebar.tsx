
import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { useUserContext } from "@/contexts/UserContext";

export interface Chat {
  id: string;
  title: string;
  timestamp: Date;
  agentId?: string; // Agent used for this chat
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
  chats: Chat[]; // Chat list managed by parent
  chatsLoading?: boolean; // Loading state for chats
  onChatsChange: (chats: Chat[]) => void; // Callback to update chats
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
  chats,
  chatsLoading = false,
  onChatsChange,
}: SidebarProps) {
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const { agents } = useAgents();
  const { workspaceUrl, lakebaseConfigured, lakebaseProjectId, lakebaseError } = useUserContext();

  // Filter chats by selected agent
  const filteredChats = useMemo(() => {
    if (!propSelectedAgentId) return chats;
    return chats.filter((chat) => chat.agentId === propSelectedAgentId);
  }, [chats, propSelectedAgentId]);

  // Set default agent when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !propSelectedAgentId && onAgentChange) {
      onAgentChange(agents[0].id);
    }
  }, [agents, propSelectedAgentId, onAgentChange]);

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      onChatsChange(chats.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const sidebarContent = (
    <>
      {/* Header */}
      <div
        className={`${isCollapsed ? "p-2" : "p-4"} border-b border-[var(--color-border)]/20 transition-all duration-300`}
      >
        <button
          onClick={onNewChat}
          className={`flex items-center w-full hover:bg-[var(--color-accent-primary)]/[0.08] rounded-xl transition-all duration-300 group ${isCollapsed ? "p-2 justify-center" : "p-3 gap-3"}`}
        >
          <div className="flex items-center justify-center rounded-xl bg-[var(--color-accent-primary)] text-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-105 h-10 w-10 flex-shrink-0">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <span className="text-[var(--color-text-heading)] font-semibold text-[15px] transition-opacity duration-300">
              New Chat
            </span>
          )}
        </button>
      </div>

      {/* Chat List */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
          {chatsLoading ? (
            <div className="text-center py-12 text-[var(--color-primary-navy)]/50">
              <Loader2 className="h-8 w-8 mx-auto mb-3 opacity-60 animate-spin" />
              <p className="text-sm font-medium">Loading chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-primary-navy)]/50">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No chat history yet</p>
              <p className="text-xs mt-1 opacity-70">
                Start a new conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                  className={`
                    group relative px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-200
                    ${
                      currentChatId === chat.id
                        ? "bg-[var(--color-accent-primary)] text-white shadow-sm"
                        : "bg-[var(--color-background)] hover:bg-[var(--color-background)]/80 text-[var(--color-foreground)] border border-[var(--color-border)]/50 hover:border-[var(--color-border)] hover:shadow-sm"
                    }
                  `}
                >
                  <h3
                    className={`font-medium text-xs truncate ${
                      currentChatId === chat.id
                        ? "text-white"
                        : "text-[var(--color-text-heading)]"
                    }`}
                  >
                    {chat.title}
                  </h3>

                  {/* Delete button - show on hover */}
                  {hoveredChat === chat.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        className="p-1 rounded hover:bg-black/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2
                          className={`h-3 w-3 ${
                            currentChatId === chat.id
                              ? "text-white/70 hover:text-white"
                              : "text-[var(--color-primary-navy)]/50 hover:text-[var(--color-error)]"
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

      {/* Lakebase Status Box */}
      {!isCollapsed && (
        <div className="p-3">
          {lakebaseConfigured ? (
            lakebaseError ? (
              // Error state
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-700">Lakebase Connection Error</p>
                    <p className="text-[10px] text-red-600 mt-1 break-words">{lakebaseError}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Success state
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-emerald-700">
                      Conversations saved in Databricks Lakebase PostgreSQL
                    </p>
                    {lakebaseProjectId && workspaceUrl && (
                      <a
                        href={`${workspaceUrl}/lakebase/projects/${lakebaseProjectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 mt-1.5 font-medium"
                      >
                        View Lakebase project
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            // Not configured state
            <div className="p-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]/50">
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Chat conversations are saved in memory. Configure Lakebase in .env to enable PostgreSQL persistence.
                </p>
              </div>
            </div>
          )}
        </div>
      )}


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
            bg-[var(--color-background)]/80 backdrop-blur-xl backdrop-saturate-150 border-r border-[var(--color-border)]/30 shadow-lg
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
          hidden lg:flex flex-col bg-[var(--color-bg-secondary)] backdrop-blur-xl backdrop-saturate-150 border-r border-[var(--color-border)] shadow-sm h-full relative transition-all duration-300 flex-shrink-0
          ${isCollapsed ? "w-20" : "w-[var(--sidebar-width)]"}
        `}
      >
        {sidebarContent}
      </aside>

    </>
  );
}
