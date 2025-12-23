import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getAppConfig, type DashboardConfig } from "@/lib/config";
import { useUserInfo } from "@/hooks/useUserInfo";

export function DashboardView() {
  const navigate = useNavigate();
  const { userInfo } = useUserInfo();
  const [dashboard, setDashboard] = useState<DashboardConfig>({
    title: "Dashboard",
    subtitle: "Loading...",
    dashboardId: "",
    showPadding: true,
  });

  useEffect(() => {
    getAppConfig().then((config) => setDashboard(config.dashboard));
  }, []);

  const { title, subtitle, dashboardId, showPadding } = dashboard;

  // Build the embed URL from dashboardId and workspace URL
  const iframeUrl = dashboardId && userInfo?.workspace_url
    ? `${userInfo.workspace_url}/embed/dashboardsv3/${dashboardId}`
    : "";

  // Case 1: Dashboard iframe is provided
  if (iframeUrl) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header with title, subtitle, and Ask Agent button */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[var(--color-text-heading)] mb-2">
                {title}
              </h1>
              <p className="text-base text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            </div>

            {/* Ask Agent Button */}
            <button
              onClick={() => navigate("/chat")}
              className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)]/10 to-purple-500/10 hover:from-[var(--color-accent-primary)]/20 hover:to-purple-500/20 border border-[var(--color-accent-primary)]/20 hover:border-[var(--color-accent-primary)]/40 transition-all duration-300 group hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/20 hover:scale-105"
              aria-label="Ask the AI agent"
            >
              <Sparkles className="h-5 w-5 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-primary)] transition-all group-hover:rotate-12" />
            </button>
          </div>
        </div>

        {/* Dashboard iframe */}
        <div
          className={`flex-1 overflow-hidden ${showPadding ? "px-6 pb-6" : ""}`}
        >
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    );
  }

  // Case 2: No dashboard configured - show placeholder
  return (
    <div className="h-full flex items-center px-12">
      <div className="max-w-4xl space-y-8">
        {/* Large placeholder title */}
        <h1 className="text-7xl font-bold text-[var(--color-text-heading)] leading-tight">
          This is where your<br></br> cool AI/BI dashboard will be embedded
        </h1>

        {/* Instructions */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-secondary)] backdrop-blur-xl border border-[var(--color-border)] shadow-lg space-y-4">
          <p className="text-lg font-medium text-[var(--color-text-primary)]">To configure your dashboard:</p>
          <ol className="list-decimal list-inside space-y-3 text-base text-[var(--color-text-muted)]">
            <li>
              Open{" "}
              <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                config/app.json
              </code>
            </li>
            <li>
              Set the{" "}
              <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                dashboard.dashboardId
              </code>{" "}
              to your Databricks dashboard ID (e.g., 01f0e00bd7a714ccab3704ea38d93c32)
            </li>
            <li>
              Customize the{" "}
              <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                dashboard.title
              </code>{" "}
              and{" "}
              <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                dashboard.subtitle
              </code>{" "}
              as needed
            </li>
            <li>Restart the development server to see your changes</li>
          </ol>
        </div>

        {/* Ask Agent Button */}
        <div className="flex items-center gap-4 pt-4">
          <span className="text-[var(--color-text-muted)]">
            In the meantime, try asking your AI agent:
          </span>
          <button
            onClick={() => navigate("/chat")}
            className="p-3 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)]/10 to-purple-500/10 hover:from-[var(--color-accent-primary)]/20 hover:to-purple-500/20 border border-[var(--color-accent-primary)]/20 hover:border-[var(--color-accent-primary)]/40 transition-all duration-300 group hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/20 hover:scale-105"
            aria-label="Ask the AI agent"
          >
            <Sparkles className="h-5 w-5 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-primary)] transition-all group-hover:rotate-12" />
          </button>
        </div>
      </div>
    </div>
  );
}
