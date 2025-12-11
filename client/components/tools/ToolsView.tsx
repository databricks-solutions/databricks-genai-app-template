"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Bot,
  Cpu,
  Loader2,
  BookOpen,
  FolderOpen,
  Table2,
  ExternalLink,
  Settings,
  FileText,
} from "lucide-react";
import { Tool } from "@/lib/types";
import { useAgents } from "@/hooks/useAgents";
import { useUserContext } from "@/contexts/UserContext";

// Tool type configuration with user-friendly labels
const TOOL_CONFIG: Record<
  string,
  { icon: typeof Database; label: string; color: string; friendlyName: string }
> = {
  "genie-space": {
    icon: Database,
    label: "Data Assistant",
    color: "#3b82f6",
    friendlyName: "Ask questions about your data",
  },
  genie: {
    icon: Database,
    label: "Data Assistant",
    color: "#3b82f6",
    friendlyName: "Ask questions about your data",
  },
  "serving-endpoint": {
    icon: BookOpen,
    label: "Knowledge Assistant",
    color: "#8b5cf6",
    friendlyName: "Search through documents",
  },
  ka: {
    icon: BookOpen,
    label: "Knowledge Assistant",
    color: "#8b5cf6",
    friendlyName: "Search through documents",
  },
  app: {
    icon: Cpu,
    label: "Application",
    color: "#22c55e",
    friendlyName: "Custom application",
  },
  function: {
    icon: Bot,
    label: "Function",
    color: "#6b7280",
    friendlyName: "Custom function",
  },
};

function getToolConfig(type?: string) {
  return (
    TOOL_CONFIG[type?.toLowerCase() || ""] || {
      icon: Bot,
      label: type || "Tool",
      color: "#6b7280",
      friendlyName: "Custom tool",
    }
  );
}

// Status indicator
function StatusBadge({ status }: { status?: string }) {
  const isOnline = status?.toUpperCase() === "ONLINE";
  const isProvisioning = status?.toUpperCase() === "PROVISIONING";

  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Online
      </span>
    );
  }

  if (isProvisioning) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Loader2 className="w-3 h-3 animate-spin" />
        Provisioning
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {status || "Unknown"}
    </span>
  );
}

// Link button component
function ResourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-primary)] hover:underline"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export function ToolsView() {
  const { agents } = useAgents();
  const { workspaceUrl } = useUserContext();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".agent-selector")) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const tools = selectedAgent?.tools || [];

  // Build URLs for resources
  const getMasConfigUrl = (tileId?: string) =>
    workspaceUrl && tileId
      ? `${workspaceUrl}/ml/bricks/mas/configure/${tileId}`
      : null;

  const getKaConfigUrl = (endpointName?: string) => {
    if (!workspaceUrl || !endpointName) return null;
    const match = endpointName.match(/ka-([a-f0-9]+)-endpoint/);
    if (match) {
      return `${workspaceUrl}/ml/bricks/ka/configure/${match[1]}`;
    }
    return null;
  };

  const getGenieRoomUrl = (spaceId?: string) =>
    workspaceUrl && spaceId
      ? `${workspaceUrl}/genie/rooms/${spaceId}`
      : null;

  const getVolumeUrl = (volumePath?: string) => {
    if (!workspaceUrl || !volumePath) return null;
    const match = volumePath.match(/\/Volumes\/([^/]+)\/([^/]+)\/([^/]+)/);
    if (match) {
      return `${workspaceUrl}/explore/data/volumes/${match[1]}/${match[2]}/${match[3]}`;
    }
    return null;
  };

  const getCatalogSchemaUrl = (tableName?: string) => {
    if (!workspaceUrl || !tableName) return null;
    const parts = tableName.split(".");
    if (parts.length >= 2) {
      return `${workspaceUrl}/explore/data/${parts[0]}/${parts[1]}`;
    }
    return null;
  };

  return (
    <div className="w-full h-full bg-[var(--color-bg-primary)] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2">
            AI Assistant Architecture
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xl mx-auto">
            Your questions are routed by the orchestrator to specialized tools
          </p>
        </div>

        {/* Agent Selector */}
        {agents.length > 1 && (
          <div className="flex justify-center mb-6">
            <div className="relative agent-selector">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent-primary)] transition-colors max-w-[400px]"
              >
                <span className="text-sm text-[var(--color-text-muted)] flex-shrink-0">
                  Agent:
                </span>
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {selectedAgent?.display_name || "Select"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 min-w-[280px] max-w-[400px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg py-1 z-50">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--color-bg-secondary)] ${selectedAgentId === agent.id ? "bg-[var(--color-bg-secondary)]" : ""}`}
                    >
                      <span className="text-[var(--color-text-primary)] block truncate">
                        {agent.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DAG Visualization */}
        {selectedAgent && (
          <div className="relative">
            {/* Orchestrator Node - Top of DAG */}
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="rounded-2xl border-2 border-[var(--color-accent-primary)] bg-[var(--color-bg-secondary)] shadow-lg overflow-hidden w-[640px]">
                  <div
                    className="px-5 py-4"
                    style={{
                      background: `linear-gradient(135deg, var(--color-accent-primary)15, var(--color-accent-primary)05)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                        style={{ backgroundColor: "var(--color-accent-primary)" }}
                      >
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-[var(--color-accent-primary)] uppercase tracking-wide">
                            Orchestrator
                          </span>
                          <StatusBadge status={selectedAgent.status} />
                        </div>
                        <h2 className="text-base font-semibold text-[var(--color-text-heading)] truncate">
                          {selectedAgent.display_name}
                        </h2>
                      </div>
                    </div>
                    {/* Description */}
                    <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
                      {selectedAgent.display_description ||
                        "This AI assistant coordinates multiple specialized tools to provide comprehensive answers to your questions."}
                    </p>
                    {getMasConfigUrl(selectedAgent.tile_id) && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)]/50">
                        <ResourceLink
                          href={getMasConfigUrl(selectedAgent.tile_id)!}
                        >
                          <Settings className="w-3 h-3" />
                          Configure
                        </ResourceLink>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Lines - SVG */}
            {tools.length > 0 && (
              <div className="flex justify-center">
                <svg
                  className="w-full max-w-4xl"
                  height="60"
                  style={{ overflow: "visible" }}
                >
                  {/* Main vertical line from orchestrator */}
                  <line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="30"
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  {/* Horizontal distribution line */}
                  <line
                    x1={tools.length === 1 ? "50%" : "15%"}
                    y1="30"
                    x2={tools.length === 1 ? "50%" : "85%"}
                    y2="30"
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  {/* Vertical lines down to each tool */}
                  {tools.map((_, index) => {
                    const totalTools = tools.length;
                    const xPercent =
                      totalTools === 1
                        ? 50
                        : 15 + (index * 70) / (totalTools - 1);
                    return (
                      <g key={index}>
                        <line
                          x1={`${xPercent}%`}
                          y1="30"
                          x2={`${xPercent}%`}
                          y2="60"
                          stroke="var(--color-border)"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                        />
                        {/* Arrow head */}
                        <polygon
                          points={`${xPercent - 0.5}%,52 ${xPercent}%,60 ${xPercent + 0.5}%,52`}
                          fill="var(--color-border)"
                          transform={`translate(0, 0)`}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Tools Row */}
            {tools.length > 0 && (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(tools.length, 3)}, minmax(0, 1fr))`,
                }}
              >
                {tools.map((tool, index) => (
                  <ToolNode
                    key={index}
                    tool={tool}
                    expanded={expandedTools.has(index)}
                    onToggle={() => {
                      const newExpanded = new Set(expandedTools);
                      if (newExpanded.has(index)) newExpanded.delete(index);
                      else newExpanded.add(index);
                      setExpandedTools(newExpanded);
                    }}
                    getKaConfigUrl={getKaConfigUrl}
                    getGenieRoomUrl={getGenieRoomUrl}
                    getVolumeUrl={getVolumeUrl}
                    getCatalogSchemaUrl={getCatalogSchemaUrl}
                  />
                ))}
              </div>
            )}

            {tools.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <Bot className="h-10 w-10 mx-auto text-[var(--color-text-muted)] opacity-40 mb-3" />
                <p className="text-sm text-[var(--color-text-muted)]">
                  No tools configured for this agent
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ToolNodeProps {
  tool: Tool;
  expanded: boolean;
  onToggle: () => void;
  getKaConfigUrl: (endpointName?: string) => string | null;
  getGenieRoomUrl: (spaceId?: string) => string | null;
  getVolumeUrl: (volumePath?: string) => string | null;
  getCatalogSchemaUrl: (tableName?: string) => string | null;
}

function ToolNode({
  tool,
  expanded,
  onToggle,
  getKaConfigUrl,
  getGenieRoomUrl,
  getVolumeUrl,
  getCatalogSchemaUrl,
}: ToolNodeProps) {
  const config = getToolConfig(tool.type);
  const Icon = config.icon;
  const hasDetails =
    (tool.volumes && tool.volumes.length > 0) ||
    (tool.tables && tool.tables.length > 0);

  const getMainLink = () => {
    if (tool.genie_space_id) {
      return getGenieRoomUrl(tool.genie_space_id);
    }
    if (tool.serving_endpoint_name) {
      return getKaConfigUrl(tool.serving_endpoint_name);
    }
    return null;
  };

  const mainLink = getMainLink();
  const firstCatalogSchema =
    tool.tables && tool.tables.length > 0
      ? getCatalogSchemaUrl(tool.tables[0])
      : null;

  return (
    <div
      className="rounded-xl border-2 bg-[var(--color-bg-secondary)] overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ borderColor: `${config.color}40` }}
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: config.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${config.color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            <h3 className="text-sm font-semibold text-[var(--color-text-heading)] truncate">
              {tool.genie_display_name ||
                tool.ka_display_name ||
                tool.display_name}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
          {tool.description || config.friendlyName}
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 mt-3">
          {tool.volumes && tool.volumes.length > 0 && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: `${config.color}10`,
                color: config.color,
              }}
            >
              <FolderOpen className="w-3 h-3" />
              {tool.volumes.reduce(
                (sum, v) => sum + (v.indexed_rows || 0),
                0
              ).toLocaleString()}{" "}
              docs
            </div>
          )}
          {tool.tables && tool.tables.length > 0 && (
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: `${config.color}10`,
                color: config.color,
              }}
            >
              <Table2 className="w-3 h-3" />
              {tool.tables.length} tables
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
          {mainLink ? (
            <ResourceLink href={mainLink}>Open</ResourceLink>
          ) : (
            <span />
          )}
          {hasDetails && (
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Details
            </button>
          )}
        </div>

        {/* Expandable details */}
        {expanded && hasDetails && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
            {/* Volumes */}
            {tool.volumes?.map((vol, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg bg-[var(--color-bg-primary)]"
              >
                <FolderOpen
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: config.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {vol.name}
                    </div>
                    {getVolumeUrl(vol.path) && (
                      <ResourceLink href={getVolumeUrl(vol.path)!}>
                        Browse
                      </ResourceLink>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate">
                    {vol.path}
                  </div>
                  {vol.indexed_rows && (
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" />
                      {vol.indexed_rows.toLocaleString()} documents
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Tables */}
            {tool.tables && tool.tables.length > 0 && (
              <div className="rounded-lg bg-[var(--color-bg-primary)] overflow-hidden">
                <div className="px-2 py-1.5 bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    Tables
                  </span>
                  {firstCatalogSchema && (
                    <ResourceLink href={firstCatalogSchema}>
                      Catalog
                    </ResourceLink>
                  )}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {tool.tables.map((table, idx) => {
                    const parts = table.split(".");
                    const tableName = parts[parts.length - 1];
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2 py-1.5 border-b border-[var(--color-border)] last:border-0"
                      >
                        <Table2
                          className="h-3 w-3 flex-shrink-0"
                          style={{ color: config.color }}
                        />
                        <span className="text-xs text-[var(--color-text-primary)] truncate">
                          {tableName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
