/**
 * Brand configuration utilities
 * Handles loading and applying brand styles from brand_config.json
 */

export interface BrandConfig {
  brand: {
    name: string;
    logoUrl: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      foreground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      input: string;
      ring: string;
      destructive: string;
      destructiveForeground: string;
    };
  };
}

/**
 * Apply brand configuration to the application
 * Updates CSS variables and logo if provided
 */
export function applyBrandStyles(config: BrandConfig): void {
  const colors = config.brand.colors;
  const root = document.documentElement;

  // Convert hex colors to HSL for Tailwind CSS variables
  // Tailwind uses HSL format for theme colors
  root.style.setProperty("--primary", hexToHSL(colors.primary));
  root.style.setProperty("--secondary", hexToHSL(colors.secondary));
  root.style.setProperty("--accent", hexToHSL(colors.accent));
  root.style.setProperty("--background", hexToHSL(colors.background));
  root.style.setProperty("--foreground", hexToHSL(colors.foreground));
  root.style.setProperty("--muted", hexToHSL(colors.muted));
  root.style.setProperty(
    "--muted-foreground",
    hexToHSL(colors.mutedForeground)
  );
  root.style.setProperty("--border", hexToHSL(colors.border));
  root.style.setProperty("--input", hexToHSL(colors.input));
  root.style.setProperty("--ring", hexToHSL(colors.ring));
  root.style.setProperty("--destructive", hexToHSL(colors.destructive));
  root.style.setProperty(
    "--destructive-foreground",
    hexToHSL(colors.destructiveForeground)
  );

  // Store logo URL for use in components
  if (config.brand.logoUrl) {
    sessionStorage.setItem("brandLogoUrl", config.brand.logoUrl);
  }

  // Store brand name
  if (config.brand.name) {
    sessionStorage.setItem("brandName", config.brand.name);
  }
}

/**
 * Convert hex color to HSL format for CSS variables
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  // Return in Tailwind format (space-separated, no commas)
  return `${h} ${s}% ${lPercent}%`;
}

/**
 * Get the current brand logo URL from session storage
 */
export function getBrandLogoUrl(): string | null {
  return sessionStorage.getItem("brandLogoUrl");
}

/**
 * Get the current brand name from session storage
 */
export function getBrandName(): string | null {
  return sessionStorage.getItem("brandName");
}
