"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { EditModePanel } from "@/components/modals/EditModePanel";
import { CustomThemeProvider } from "@/contexts/ThemeContext";

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

// Wrapper component for search params
function TabSync({
  onTabChange,
}: {
  onTabChange: (tab: "chat" | "dashboard" | "tools" | "about") => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["chat", "dashboard", "tools", "about"].includes(tab)) {
      onTabChange(tab as "chat" | "dashboard" | "tools" | "about");
    }
  }, [searchParams, onTabChange]);

  return null;
}

function HomeContent() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "chat" | "dashboard" | "tools" | "about"
  >("dashboard");
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    undefined,
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [initialChatMessage, setInitialChatMessage] = useState<
    string | undefined
  >(undefined);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedCollapsed !== null) {
      setIsSidebarCollapsed(savedCollapsed === "true");
    }
  }, []);

  const handleTabChange = (tab: "chat" | "dashboard" | "tools" | "about") => {
    setActiveTab(tab);
    // Update URL with the new tab
    router.push(`/?tab=${tab}`, { scroll: false });
  };

  const handleNewChat = () => {
    // Prevent creating new chat while streaming a response
    if (isStreaming) {
      alert(
        "⏳ Please wait for the current response to complete before starting a new chat.",
      );
      return;
    }

    // Clear the current chat ID to start fresh
    // The chat will be created automatically when the user sends their first message
    setCurrentChatId(undefined);
    handleTabChange("chat");
    devLog("🆕 Starting new chat session");
  };

  const handleChatSelect = (chatId: string) => {
    // Prevent switching chats while streaming a response
    if (isStreaming) {
      alert(
        "⏳ Please wait for the current response to complete before switching chats.",
      );
      return;
    }

    setCurrentChatId(chatId);
    handleTabChange("chat");
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-screen bg-[var(--color-background)] flex flex-col overflow-hidden">
      {/* Sync URL params with tab state */}
      <Suspense fallback={null}>
        <TabSync onTabChange={setActiveTab} />
      </Suspense>

      {/* Top Bar - Fixed */}
      <TopBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onEditModeToggle={() => setIsEditMode(!isEditMode)}
      />

      {/* Main Layout - Flexible height */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar - Only show on Chat tab */}
        {activeTab === "chat" && (
          <>
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block flex-shrink-0">
              <Sidebar
                currentChatId={currentChatId}
                onChatSelect={handleChatSelect}
                onNewChat={handleNewChat}
                isCollapsed={isSidebarCollapsed}
                onCollapse={(collapsed) => {
                  setIsSidebarCollapsed(collapsed);
                  localStorage.setItem(
                    "sidebarCollapsed",
                    collapsed.toString(),
                  );
                }}
                selectedAgentId={selectedAgentId}
                onAgentChange={setSelectedAgentId}
              />
            </div>

            {/* Sidebar - Mobile */}
            <Sidebar
              currentChatId={currentChatId}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              isMobile
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              selectedAgentId={selectedAgentId}
              onAgentChange={setSelectedAgentId}
            />
          </>
        )}

        {/* Main Content */}
        <MainContent
          activeTab={activeTab}
          currentChatId={currentChatId}
          onChatIdChange={setCurrentChatId}
          selectedAgentId={selectedAgentId}
          onAgentChange={setSelectedAgentId}
          initialChatMessage={initialChatMessage}
          onStreamingChange={setIsStreaming}
        />
      </div>

      {/* Edit Mode Panel */}
      <EditModePanel isOpen={isEditMode} onClose={() => setIsEditMode(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <CustomThemeProvider>
      <HomeContent />
    </CustomThemeProvider>
  );
}
