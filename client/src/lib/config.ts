/**
 * Application Configuration API Client
 *
 * Fetches configuration from backend API endpoints instead of hardcoded values.
 * Configuration is loaded from /config/*.json files on the server.
 */

// Type definitions
export interface AgentTool {
  name: string;
  display_name?: string;
  description?: string;
  type?: string;
}

export interface AgentConfig {
  endpoint_name: string;
  display_name?: string;
  display_description?: string;
  tools?: AgentTool[];
  error?: string;
  status?: string;
}

export interface AgentsResponse {
  agents: AgentConfig[];
  error?: string;
}

/**
 * Fetch agents configuration from backend API.
 * This endpoint resolves mas_id to endpoint_name and checks agent status.
 */
export async function getAgentsConfig(): Promise<AgentsResponse> {
  try {
    const response = await fetch("/api/config/agents");
    if (!response.ok) {
      throw new Error(`Failed to load agents: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading agents config:", error);
    return { agents: [], error: String(error) };
  }
}

export interface AppBranding {
  name: string; // Displayed in TopBar next to logo
  logo: string; // Path to logo image in TopBar
}

export interface HomeConfig {
  title: string;
  description: string;
}

export interface DashboardConfig {
  title: string;
  subtitle: string;
  dashboardId: string;
  showPadding: boolean;
}

export interface AppConfig {
  agents: AgentConfig[];
  branding: AppBranding;
  home: HomeConfig;
  dashboard: DashboardConfig;
}

// Singleton cache - persists for entire app lifetime to avoid repeated API calls
let cachedAppConfig: AppConfig | null = null;
let configLoadingPromise: Promise<AppConfig> | null = null;

/**
 * Fetch application configuration from backend API.
 * Results are cached to avoid repeated API calls.
 */
export async function getAppConfig(): Promise<AppConfig> {
  // Return cached config if available
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  // If already loading, return the existing promise
  if (configLoadingPromise) {
    return configLoadingPromise;
  }

  // Start loading config from backend API
  configLoadingPromise = (async () => {
    try {
      const response = await fetch("/api/config/app");

      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      const config = await response.json();

      // Validate required fields
      if (!config.branding || !config.dashboard) {
        throw new Error("Invalid config structure");
      }

      cachedAppConfig = config;
      return config;
    } catch (error) {
      console.error("Error loading app config:", error);

      // Return fallback config if API fails
      const fallbackConfig: AppConfig = {
        agents: [],
        branding: {
          name: "AI Assistant",
          logo: "/logos/databricks-symbol-color.svg",
        },
        home: {
          title: "Databricks App Template",
          description: "Build production-ready AI applications with Databricks.",
        },
        dashboard: {
          title: "Dashboard",
          subtitle: "Analytics and insights",
          dashboardId: "",
          showPadding: true,
        },
      };

      cachedAppConfig = fallbackConfig;
      return fallbackConfig;
    } finally {
      configLoadingPromise = null;
    }
  })();

  return configLoadingPromise;
}

/**
 * Get synchronous app config (uses cached value).
 * Returns null if config hasn't been loaded yet.
 * Use getAppConfig() for async loading.
 */
export function getAppConfigSync(): AppConfig | null {
  return cachedAppConfig;
}

/**
 * Reload configuration from server (clears cache).
 */
export async function reloadAppConfig(): Promise<AppConfig> {
  cachedAppConfig = null;
  configLoadingPromise = null;
  return getAppConfig();
}

/**
 * Environment detection helpers
 */
export function isRunningLocally(): boolean {
  if (typeof window === "undefined") {
    return false; // Server-side rendering
  }
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export function isRunningInDatabricksApps(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return !isRunningLocally();
}
