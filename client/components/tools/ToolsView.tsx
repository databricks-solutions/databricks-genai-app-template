"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Tool } from "@/lib/types";
import { SpatialNetworkBackground } from "@/components/background/SpatialNetworkBackground";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useAgents } from "@/hooks/useAgents";

export function ToolsView() {
  const { colors, animatedBackground } = useThemeContext();
  const { agents } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Set default agent when agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".agent-selector-container")) {
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

  return (
    <div className="relative w-full h-full bg-[var(--color-background-1)] dark:bg-[var(--color-background-1)]">
      {/* Three.js Spatial Network Background */}
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

      {/* Content */}
      <div className="relative h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Header with Agent Selector */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-[var(--color-text-heading)] mb-6">
              Tools & Resources
            </h1>

            {/* Agent Selector */}
            <div className="relative agent-selector-container inline-block">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-6 py-3 bg-[var(--color-white)] dark:bg-[var(--color-primary-navy)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/40 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Agent:
                </span>
                <span className="text-base font-semibold text-[var(--color-text-primary)]">
                  {selectedAgent?.display_name || "Select Agent"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[var(--color-text-primary)] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && agents.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--color-white)] dark:bg-[var(--color-primary-navy)] rounded-xl shadow-xl border border-[var(--color-border)] py-2 z-50">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgentId(agent.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-[var(--color-accent-primary)]/5 transition-colors ${
                        selectedAgentId === agent.id
                          ? "bg-[var(--color-accent-primary)]/10"
                          : ""
                      }`}
                    >
                      <div className="font-semibold text-sm text-[var(--color-text-heading)]">
                        {agent.display_name}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        {agent.display_description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tools Grid */}
          {tools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool, index) => (
                <ToolCard key={index} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-[var(--color-text-muted)]">
                No tools available for this agent
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToolCardProps {
  tool: Tool;
}

function ToolCard({ tool }: ToolCardProps) {
  // Use long_description if available, otherwise fall back to display_description
  const description = tool.long_description || tool.display_description;

  // Truncate description if too long (approximately 180 characters for ~4 lines)
  const maxLength = 180;
  const truncatedDescription =
    description.length > maxLength
      ? description.slice(0, maxLength).trim() + "..."
      : description;

  return (
    <div className="bg-[var(--color-white)] dark:bg-[var(--color-primary-navy)] rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group min-h-[320px] flex flex-col">
      {/* Colored Top Border */}
      <div className="h-1 bg-gradient-to-r from-[var(--color-accent-primary)] via-[var(--color-accent-primary)]/80 to-[var(--color-accent-primary)]" />

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-1">
        {/* Logo and Title */}
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[var(--color-accent-primary)]/5 flex items-center justify-center">
            <Image
              src="/logos/databricks-symbol-color.svg"
              alt="Databricks"
              width={32}
              height={32}
              className="w-8 h-8"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Databricks Tool
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-heading)] leading-tight">
              {tool.display_name}
            </h3>
          </div>
        </div>

        {/* Type Tag - aligned with icon */}
        {tool.type && (
          <div className="mb-4">
            <span className="inline-block px-2.5 py-1 text-xs font-medium bg-[var(--color-accent-primary)]/10 text-[var(--color-text-primary)] rounded-md">
              {tool.type}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-6 flex-1">
          {truncatedDescription}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-auto">
          <a
            href={tool.learn_more || tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-transparent border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-primary)]/5 hover:border-[var(--color-accent-primary)]/40 transition-all duration-200 text-center"
          >
            Learn More
          </a>
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 text-sm font-medium text-[var(--color-white)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-primary)]/80 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            Go To Tool
            <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
