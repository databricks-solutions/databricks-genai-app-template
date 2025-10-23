/**
 * Runtime configuration loader for host app integration.
 *
 * This module loads configuration from `app_config.json` at runtime,
 * allowing the compiled app to be deployed in different environments
 * without rebuilding.
 *
 * For local development, it falls back to hardcoded defaults.
 */

export interface AppConfig {
  endpoints: Array<{
    displayName: string;
    endpointName: string;
    type: "openai-chat" | "databricks-agent";
  }>;
  apiBaseUrl?: string;
}

// Default configuration for local development
const DEFAULT_CONFIG: AppConfig = {
  endpoints: [
    {
      displayName: "Sonnet 4",
      endpointName: "databricks-claude-sonnet-4",
      type: "openai-chat",
    },
    {
      displayName: "Llama 4 Maverick",
      endpointName: "databricks-llama-4-maverick",
      type: "openai-chat",
    },
    {
      displayName: "mas_mehdi_genai_demo",
      endpointName: "ka-6a76cd22-endpoint",
      type: "databricks-agent",
    },
  ],
  apiBaseUrl: undefined, // Uses relative URLs in development
};

let cachedConfig: AppConfig | null = null;

/**
 * Load configuration from app_config.json or use defaults.
 *
 * @returns Promise<AppConfig> Configuration object
 */
export async function loadConfig(): Promise<AppConfig> {
  // Return cached config if already loaded
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Try to fetch app_config.json from the public directory
    const response = await fetch("/app_config.json");

    if (response.ok) {
      const config = await response.json();
      console.log("✅ Loaded configuration from app_config.json:", config);
      cachedConfig = config;
      return config;
    } else {
      console.log("ℹ️ No app_config.json found, using default configuration");
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.log(
      "ℹ️ Could not load app_config.json, using default configuration:",
      error
    );
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * Get the currently loaded config (must call loadConfig first).
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    throw new Error("Config not loaded yet. Call loadConfig() first.");
  }
  return cachedConfig;
}

/**
 * Reset the cached config (useful for testing).
 */
export function resetConfig(): void {
  cachedConfig = null;
}
