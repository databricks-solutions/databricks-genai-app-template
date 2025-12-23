import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Edit, FlaskConical, ExternalLink } from "lucide-react";
import { getAppConfig, type AppBranding } from "@/lib/config";
import { useUserInfo } from "@/hooks/useUserInfo";
import { useAgents } from "@/hooks/useAgents";

interface TopBarProps {
  activeTab: "home" | "chat" | "dashboard" | "tools" | "about";
  onTabChange?: (tab: "home" | "chat" | "dashboard" | "tools" | "about") => void; // Optional, Links handle navigation
  onEditModeToggle: () => void;
}

export function TopBar({
  activeTab,
  onEditModeToggle,
}: TopBarProps) {
  const [branding, setBranding] = useState<AppBranding>({
    name: "AI Assistant",
    logo: "/logos/databricks-symbol-color.svg",
  });
  const [isMlflowOpen, setIsMlflowOpen] = useState(false);
  const mlflowRef = useRef<HTMLDivElement>(null);
  const { userInfo } = useUserInfo();
  const { agents } = useAgents();

  useEffect(() => {
    getAppConfig().then((config) => setBranding(config.branding));
  }, []);

  // Close MLflow dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mlflowRef.current && !mlflowRef.current.contains(event.target as Node)) {
        setIsMlflowOpen(false);
      }
    };
    if (isMlflowOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMlflowOpen]);

  // Filter agents that have mlflow_experiment_id
  const agentsWithMlflow = agents.filter((agent) => agent.mlflow_experiment_id);

  // Build MLflow experiment URL
  const getMlflowUrl = (experimentId: string) => {
    const baseUrl = userInfo?.workspace_url || "";
    return `${baseUrl}/ml/experiments/${experimentId}`;
  };

  const tabs = [
    { id: "home" as const, label: "Home", href: "/" },
    { id: "dashboard" as const, label: "Dashboard", href: "/dashboard" },
    { id: "chat" as const, label: "Chat", href: "/chat" },
    { id: "tools" as const, label: "Agentic tools", href: "/tools" },
    { id: "about" as const, label: "About", href: "/about" },
  ];

  // Extract username part from email for display
  const displayName = userInfo?.user?.split("@")[0] || "";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-[var(--header-height)] bg-[var(--color-background)]/70 backdrop-blur-xl backdrop-saturate-150 border-b border-[var(--color-border)]/40 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left Section - Logo & Name */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="relative w-24 h-8 block">
            <img
              src={branding.logo}
              alt={branding.name}
              className="w-full h-full object-contain"
            />
          </Link>

          {/* Name */}
          {branding.name && (
            <h1 className="text-2xl font-medium tracking-tight text-[var(--color-text-heading)]">
              {branding.name}
            </h1>
          )}
        </div>

        {/* Right Section - Navigation Tabs and Icons */}
        <div className="flex items-center gap-6">
          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 relative">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.href}
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
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-3">
            {/* MLflow Experiments Dropdown */}
            {agentsWithMlflow.length > 0 && (
              <div className="relative" ref={mlflowRef}>
                <button
                  onClick={() => setIsMlflowOpen(!isMlflowOpen)}
                  className={`group h-9 w-9 rounded-full hover:bg-[var(--color-icon-hover)]/10 transition-all duration-200 flex items-center justify-center cursor-pointer ${isMlflowOpen ? "bg-[var(--color-icon-hover)]/10" : ""}`}
                  title="MLflow Experiments"
                >
                  <FlaskConical className="h-4 w-4 text-[var(--color-icon-inactive)] group-hover:text-[var(--color-icon-active)] transition-colors" />
                </button>
                {isMlflowOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[280px] bg-[var(--color-background)] rounded-xl shadow-xl border border-[var(--color-border)] py-2 z-50">
                    <div className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide border-b border-[var(--color-border)]/50 mb-1">
                      MLflow Experiments
                    </div>
                    {agentsWithMlflow.map((agent) => (
                      <a
                        key={agent.id}
                        href={getMlflowUrl(agent.mlflow_experiment_id!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
                        onClick={() => setIsMlflowOpen(false)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[var(--color-foreground)] truncate">
                            {agent.display_name}
                          </div>
                          <div className="text-xs text-[var(--color-muted-foreground)] truncate">
                            {agent.endpoint_name}
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-[var(--color-muted-foreground)] flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode Toggle */}
            <button
              onClick={onEditModeToggle}
              className="group h-9 w-9 rounded-full hover:bg-[var(--color-icon-hover)]/10 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="Customize theme"
            >
              <Edit className="h-4 w-4 text-[var(--color-icon-inactive)] group-hover:text-[var(--color-icon-active)] transition-colors" />
            </button>

            {/* User Email */}
            {displayName && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-secondary)] backdrop-blur-md border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow"
                title={userInfo?.user}
              >
                <div className="w-6 h-6 rounded-full bg-[var(--color-accent-primary)] flex items-center justify-center text-white text-xs font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-[var(--color-text-primary)] max-w-[120px] truncate">
                  {displayName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
