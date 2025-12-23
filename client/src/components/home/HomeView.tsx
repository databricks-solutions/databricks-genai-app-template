import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAgentsContext } from "@/contexts/AgentsContext";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function HomeView() {
  const { config, isLoading } = useAppConfig();
  const { agents, agentErrors, loading: agentsLoading, error: globalError } = useAgentsContext();

  const noAgentsConfigured = !agentsLoading && agents.length === 0 && !globalError;

  if (isLoading || !config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  const { home } = config;
  const appName = (config as any).app_name;
  const isDefaultAppName = appName === "databricks-app-template";
  const isDefaultConfig = home.title === "Databricks App Template";

  return (
    <>
      <div className="h-full flex items-center px-12">
        <div className="max-w-4xl space-y-6">
          {/* Large title - reduced from 7xl to 5xl for better fit */}
          <h1 className="text-5xl font-bold text-[var(--color-text-heading)] leading-tight">
            {home.title}
          </h1>

          {/* Description - reduced from xl to lg for better balance */}
          <p className="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
            {home.description}
          </p>

          {/* Agent status: loading */}
          {agentsLoading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <Loader2 className="h-5 w-5 text-[var(--color-accent-primary)] animate-spin" />
              <span className="text-[var(--color-text-muted)]">Checking endpoint configuration...</span>
            </div>
          )}

          {/* Agent status: global error */}
          {!agentsLoading && globalError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-lg font-medium text-red-900">Configuration Error</p>
              </div>
              <p className="text-sm text-red-800">{globalError.message}</p>
            </div>
          )}

          {/* Agent status: no agents configured */}
          {!agentsLoading && noAgentsConfigured && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-lg font-medium text-red-900">No Agents Configured</p>
              </div>
              <p className="text-sm text-red-800">
                No agents are configured. Update{" "}
                <code className="px-2 py-0.5 bg-red-100 rounded text-xs font-mono text-red-900">
                  config/app.json
                </code>{" "}
                to add at least one agent with{" "}
                <code className="px-2 py-0.5 bg-red-100 rounded text-xs font-mono text-red-900">
                  endpoint_name
                </code>{" "}
                or{" "}
                <code className="px-2 py-0.5 bg-red-100 rounded text-xs font-mono text-red-900">
                  mas_id
                </code>.
              </p>
              <p className="text-xs text-red-700">
                You can use foundation models directly:{" "}
                <code className="px-1.5 py-0.5 bg-red-100 rounded font-mono">
                  "agents": [{"{"}"endpoint_name": "databricks-gpt-5-2"{"}"}]
                </code>
              </p>
            </div>
          )}

          {/* Agent status: agent-specific errors */}
          {!agentsLoading && agentErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-lg font-medium text-red-900">Agent Configuration Errors</p>
              </div>
              <ul className="space-y-3">
                {agentErrors.map((agent, idx) => (
                  <li key={idx} className="p-3 bg-red-100 rounded-lg">
                    <p className="text-sm font-medium text-red-900">
                      {agent.display_name || agent.endpoint_name || "Unknown agent"}
                    </p>
                    <p className="text-xs text-red-700 mt-1 font-mono">
                      {agent.error}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600">
                Check your{" "}
                <code className="px-1.5 py-0.5 bg-red-100 rounded font-mono">config/app.json</code>{" "}
                and verify the endpoint names or MAS IDs are correct.
              </p>
            </div>
          )}

          {/* Config instructions - only show when using default config */}
          {isDefaultConfig && (
            <div className="p-5 rounded-2xl bg-[var(--color-bg-secondary)] backdrop-blur-xl border border-[var(--color-border)] shadow-lg space-y-3">
              <p className="text-base font-medium text-[var(--color-text-primary)]">To configure your project:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-text-muted)]">
                <li>
                  Open{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    config/app.json
                  </code>
                </li>
                <li>
                  Configure your agent using{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    endpoint_name
                  </code>{" "}
                  (any serving endpoint) or{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    mas_id
                  </code>{" "}
                  (Multi-Agent Supervisor ID)
                </li>
                <li>
                  Customize{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    home
                  </code>
                  {" "}(this page) and{" "}
                  <code className="px-2.5 py-1 bg-[var(--color-accent-primary)]/10 backdrop-blur-sm rounded-lg text-sm font-mono text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/20">
                    branding
                  </code>
                  {" "}(top menu)
                </li>
              </ol>
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                See{" "}
                <code className="px-2 py-0.5 bg-[var(--color-accent-primary)]/10 rounded text-xs font-mono text-[var(--color-accent-primary)]">
                  config/app.example.json
                </code>{" "}
                for all available options.
              </p>
            </div>
          )}

          {/* Tracker configuration - only show when using default app_name */}
          {isDefaultAppName && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-lg space-y-3">
              <p className="text-lg font-medium text-amber-900">Tracker Configuration</p>
              <p className="text-sm text-amber-800">
                To track your app usage, update{" "}
                <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono text-amber-900">
                  app_name
                </code>{" "}
                in{" "}
                <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono text-amber-900">
                  config/app.json
                </code>{" "}
                to match your repository name for easy reconciliation.
              </p>
              <ul className="text-sm text-amber-700 space-y-2 list-disc list-inside">
                <li>
                  Set{" "}
                  <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono">enable_tracker</code>
                  {" "}to{" "}
                  <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono">true</code>
                  {" "}or{" "}
                  <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono">false</code>
                </li>
                <li>
                  Optionally set{" "}
                  <code className="px-2 py-0.5 bg-amber-100 rounded text-xs font-mono">demo_catalog_id</code>
                  {" "}if your demo is in the Demo Catalog
                </li>
              </ul>
              <p className="text-xs text-amber-600">
                Usage is tracked and anonymized at team level. See{" "}
                <a
                  href="https://pypi.org/project/dbdemos-tracker/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-800"
                >
                  dbdemos-tracker
                </a>{" "}
                for details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </>
  );
}
