/**
 * Server-side configuration loader
 * Used for SSR (Server-Side Rendering) like layout.tsx metadata
 * Reads directly from /config/*.json files
 */

import { readFileSync } from 'fs'
import { join } from 'path'

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

/**
 * Read app config directly from file system (server-side only)
 */
export function getAppConfigServer(): AppConfig {
  try {
    // Read from /config/app.json at project root
    // Next.js runs from /client/, so we need to go up one level to reach /config/
    const configPath = join(process.cwd(), '..', 'config', 'app.json')

    // Debug logging
    console.log('[config-server] Current working directory:', process.cwd())
    console.log('[config-server] Reading config from:', configPath)

    const configFile = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configFile)

    console.log('[config-server] ✅ Config loaded successfully')
    return config
  } catch (error) {
    console.error('[config-server] ❌ Error loading app config from file:', error)
    console.error('[config-server] Attempted path:', join(process.cwd(), '..', 'config', 'app.json'))

    // Return fallback config
    const fallbackConfig = {
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

    console.log('[config-server] Using fallback config')
    return fallbackConfig
  }
}
