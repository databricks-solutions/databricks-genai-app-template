"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Edit, User } from "lucide-react";
import { getAppConfig, type AppBranding } from "@/lib/config";

interface TopBarProps {
  activeTab: "chat" | "dashboard" | "tools" | "about";
  onTabChange: (tab: "chat" | "dashboard" | "tools" | "about") => void;
  onEditModeToggle: () => void;
}

export function TopBar({
  activeTab,
  onTabChange,
  onEditModeToggle,
}: TopBarProps) {
  const [branding, setBranding] = useState<AppBranding>({
    tabTitle: "AI Assistant",
    appName: "AI Assistant",
    companyName: "",
    description: "",
    logoPath: "/logos/databricks-symbol-color.svg",
  });

  useEffect(() => {
    getAppConfig().then((config) => setBranding(config.branding));
  }, []);

  const tabs = [
    { id: "dashboard" as const, label: "Overview" },
    { id: "chat" as const, label: "Chat" },
    { id: "tools" as const, label: "Tools" },
    { id: "about" as const, label: "About" },
  ];

  return (
    <header className="sticky top-0 z-30 w-full h-[var(--header-height)] bg-[var(--color-background-2)] backdrop-blur-lg border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section - Logo & Company Name */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative w-24 h-8">
            <Image
              src={branding.logoPath}
              alt={branding.appName}
              fill
              className="object-contain"
            />
          </div>

          {/* Company Name */}
          {branding.companyName && (
            <h1 className="text-2xl font-medium tracking-tight text-[var(--color-text-heading)]">
              {branding.companyName}
            </h1>
          )}
        </div>

        {/* Right Section - Navigation Tabs and Icons */}
        <div className="flex items-center gap-6">
          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 relative">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative px-4 py-2 text-sm font-medium transition-colors duration-300
                  ${
                    activeTab === tab.id
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  }
                `}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <span
                    className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-[var(--color-accent-primary)] rounded-full"
                    style={{
                      animation: "slideIn 0.3s ease-out",
                    }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-2">
            {/* Edit Mode Toggle */}
            <button
              onClick={onEditModeToggle}
              className="group h-9 w-9 rounded-full hover:bg-[var(--color-icon-hover)]/10 transition-all duration-200 flex items-center justify-center"
              title="Customize theme"
            >
              <Edit className="h-4 w-4 text-[var(--color-icon-inactive)] group-hover:text-[var(--color-icon-active)] transition-colors" />
            </button>

            {/* User Avatar */}
            <button
              className="group h-9 w-9 rounded-full hover:bg-[var(--color-icon-hover)]/10 transition-all duration-200 flex items-center justify-center"
              title="User profile"
            >
              <User className="h-4 w-4 text-[var(--color-icon-inactive)] group-hover:text-[var(--color-icon-active)] transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
