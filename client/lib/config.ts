// AI Assistant Application Configuration
// This file centralizes all configuration options for easy customization

export const appConfig = {
  // Application Branding
  branding: {
    tabTitle: "Phoenix",
    name: "Phoenix UI",
    description: "Customizable UI to serve your Databricks dashboards and agents",
    companyName: "",
    logoPath: "/logos/databricks-symbol-color.svg",
  },

  // Databricks Integration
  databricks: {
    token: process.env.DATABRICKS_TOKEN || '',
  },

  // Dashboard Configuration
  // To embed your Databricks dashboard:
  // 1. Set the iframeUrl to your Databricks dashboard embed URL
  // 2. Customize the title and subtitle to match your dashboard content
  // 3. Leave iframeUrl empty ("") to show a placeholder message instead
  dashboard: {
    title: "Analytics Dashboard",
    subtitle: "Leverage your Databricks gold data and data warehouses to serve your dashboards everywhere",
    iframeUrl: process.env.NEXT_PUBLIC_DASHBOARD_IFRAME_URL || "",
    // Set NEXT_PUBLIC_DASHBOARD_IFRAME_URL in your .env.local file
    // Example: NEXT_PUBLIC_DASHBOARD_IFRAME_URL=https://adb-984752964297111.11.azuredatabricks.net/embed/dashboardsv3/01f0c3fa4bde1b90a79aca97efe4c697?o=984752964297111

    // Display settings
    showPadding: true  // Set to false to remove padding around the iframe
  },
}

// Type definitions for better TypeScript support
export type AppConfig = typeof appConfig

// Environment detection helpers
export function isRunningInDatabricksApps(): boolean {
  // If there's no DATABRICKS_TOKEN in env, we're running on Databricks Apps
  return !appConfig.databricks.token
}

export function isRunningLocally(): boolean {
  // If there's a DATABRICKS_TOKEN in env, we're running locally
  return !!appConfig.databricks.token
}
