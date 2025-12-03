/**
 * Application Configuration API Client
 *
 * Fetches configuration from backend API endpoints instead of hardcoded values.
 * Configuration is loaded from /config/*.json files on the server.
 */

// Type definitions
export interface AppBranding {
  tabTitle: string
  appName: string
  companyName: string
  description: string
  logoPath: string
}

export interface DashboardConfig {
  title: string
  subtitle: string
  iframeUrl: string
  showPadding: boolean
}

export interface AppConfig {
  branding: AppBranding
  dashboard: DashboardConfig
}

// In-memory cache to avoid repeated API calls
let cachedAppConfig: AppConfig | null = null
let configLoadingPromise: Promise<AppConfig> | null = null

/**
 * Fetch application configuration from backend API.
 * Results are cached to avoid repeated API calls.
 */
export async function getAppConfig(): Promise<AppConfig> {
  // Return cached config if available
  if (cachedAppConfig) {
    return cachedAppConfig
  }

  // If already loading, return the existing promise
  if (configLoadingPromise) {
    return configLoadingPromise
  }

  // Start loading config
  configLoadingPromise = (async () => {
    try {
      const response = await fetch('/api/config/app')

      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }

      const config = await response.json()

      // Validate required fields
      if (!config.branding || !config.dashboard) {
        throw new Error('Invalid config structure')
      }

      cachedAppConfig = config
      return config

    } catch (error) {
      console.error('Error loading app config:', error)

      // Return fallback config if API fails
      const fallbackConfig: AppConfig = {
        branding: {
          tabTitle: 'AI Assistant',
          appName: 'AI Assistant',
          companyName: '',
          description: 'AI-powered assistant',
          logoPath: '/logos/databricks-symbol-color.svg'
        },
        dashboard: {
          title: 'Dashboard',
          subtitle: 'Analytics and insights',
          iframeUrl: '',
          showPadding: true
        }
      }

      cachedAppConfig = fallbackConfig
      return fallbackConfig

    } finally {
      configLoadingPromise = null
    }
  })()

  return configLoadingPromise
}

/**
 * Get synchronous app config (uses cached value).
 * Returns null if config hasn't been loaded yet.
 * Use getAppConfig() for async loading.
 */
export function getAppConfigSync(): AppConfig | null {
  return cachedAppConfig
}

/**
 * Reload configuration from server (clears cache).
 */
export async function reloadAppConfig(): Promise<AppConfig> {
  cachedAppConfig = null
  configLoadingPromise = null
  return getAppConfig()
}

/**
 * Environment detection helpers
 */
export function isRunningLocally(): boolean {
  if (typeof window === 'undefined') {
    return false // Server-side rendering
  }
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1'
}

export function isRunningInDatabricksApps(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return !isRunningLocally()
}

// Legacy export for backward compatibility
// NOTE: This is now async and must be awaited!
export const appConfig = {
  async branding() {
    const config = await getAppConfig()
    return config.branding
  },
  async dashboard() {
    const config = await getAppConfig()
    return config.dashboard
  }
}
