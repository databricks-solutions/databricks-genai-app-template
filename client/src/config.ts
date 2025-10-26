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

// Default configuration (fallback if app_config.json not found)
// Try both port 8000 and 8001 for backend
const tryPort = async (port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${port}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const detectBackendPort = async (): Promise<number> => {
  // Try port 8000 first
  if (await tryPort(8000)) {
    return 8000;
  }
  // Fall back to 8001
  if (await tryPort(8001)) {
    console.log("ℹ️ Backend detected on port 8001");
    return 8001;
  }
  // Default to 8000 if detection fails
  return 8000;
};

const DEFAULT_CONFIG: AppConfig = {
  endpoints: [
    {
      displayName: "Sonnet 4",
      endpointName: "databricks-claude-sonnet-4",
      type: "openai-chat",
    },
    {
      displayName: "mas_mehdi_genai_demo",
      endpointName: "mas-367ff95f-endpoint",
      type: "databricks-agent",
    },
  ],
  apiBaseUrl: `http://localhost:8000/api`, // Will be updated by detectBackendPort
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
      // Detect backend port before returning default config
      const port = await detectBackendPort();
      DEFAULT_CONFIG.apiBaseUrl = `http://localhost:${port}/api`;
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.log(
      "ℹ️ Could not load app_config.json, using default configuration:",
      error
    );
    // Detect backend port before returning default config
    const port = await detectBackendPort();
    DEFAULT_CONFIG.apiBaseUrl = `http://localhost:${port}/api`;
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
