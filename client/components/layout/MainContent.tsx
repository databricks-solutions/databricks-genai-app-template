"use client"

import React from 'react'
import { ChatView } from '@/components/chat/ChatView'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { ToolsView } from '@/components/tools/ToolsView'
import { AboutView } from '@/components/about/AboutView'
import { SpatialNetworkBackground } from '@/components/background/SpatialNetworkBackground'
import { useThemeContext } from '@/contexts/ThemeContext'

interface MainContentProps {
  activeTab: 'chat' | 'dashboard' | 'tools' | 'about'
  currentChatId?: string
  onChatIdChange?: (chatId: string) => void
  selectedAgentId?: string
  onAgentChange?: (agentId: string) => void
  initialChatMessage?: string
}

export function MainContent({ activeTab, currentChatId, onChatIdChange, selectedAgentId, onAgentChange, initialChatMessage }: MainContentProps) {
  const { colors, animatedBackground } = useThemeContext()

  return (
    <main className="flex-1 flex flex-col h-full relative bg-[var(--color-background-1)] overflow-hidden">
      {/* Three.js Spatial Network Background
          Theme customizable - uses separate animated background color
      */}
      <SpatialNetworkBackground
        particleCount={animatedBackground.particleCount}
        connectionDistance={animatedBackground.connectionDistance}
        primaryColor={colors.animatedBgColor}
        secondaryColor={colors.animatedBgColor}
        particleOpacity={animatedBackground.particleOpacity}
        lineOpacity={animatedBackground.lineOpacity}
        particleSize={animatedBackground.particleSize}
        lineWidth={animatedBackground.lineWidth}
        animationSpeed={animatedBackground.animationSpeed}
      />

      {/* Main Content - positioned above background */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Keep ChatView mounted but hide when not active to preserve state */}
        <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chat' ? '' : 'hidden'}`}>
          <ChatView
            chatId={currentChatId}
            onChatIdChange={onChatIdChange}
            selectedAgentId={selectedAgentId}
            onAgentChange={onAgentChange}
            initialMessage={initialChatMessage}
          />
        </div>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'tools' && <ToolsView />}
        {activeTab === 'about' && <AboutView />}
      </div>
    </main>
  )
}