/**
 * Centralized Theme Definitions
 *
 * All predefined/system themes are defined here.
 * User-created custom themes are stored in localStorage separately.
 */

// Type definitions
export interface ThemeColors {
  // TEXT COLORS - Readability first (WCAG compliant)
  textHeading: string; // Headers, titles (highest contrast)
  textPrimary: string; // Main body text
  textMuted: string; // Secondary text, captions, timestamps

  // BRAND/ACCENT COLOR - Visual identity
  accentPrimary: string; // Main brand color → auto-derives: secondary (lighter/darker), icons, charts, scrollbar

  // ANIMATED BACKGROUND COLOR - Independent from brand
  animatedBgColor: string; // Color for animated network particles (can be different from brand)

  // BACKGROUND COLORS - Surface hierarchy
  bgPrimary: string; // Main background → auto-derives: elevated surfaces
  bgSecondary: string; // Sidebar, panels → auto-derives: inputs, cards, chat assistant bg

  // UI ELEMENTS
  border: string; // Borders, dividers, separators

  // INTERACTION/STATUS COLORS - Semantic meaning
  success: string;
  successHover: string;
  error: string;
  errorHover: string;
  info: string;
  infoHover: string;
  warning: string;
  warningHover: string;
}

export interface Typography {
  primaryFont: string; // Main font for headers, titles
  secondaryFont: string; // Font for body text, paragraphs
}

export interface AnimatedBackgroundSettings {
  particleCount: number; // 20-100 - number of particles
  connectionDistance: number; // 30-100 - max distance for drawing connection lines
  particleOpacity: number; // 0-1 (0.1 increments)
  lineOpacity: number; // 0-1 (0.1 increments)
  particleSize: number; // 0.5-8 (0.5 increments) - wider range for more control
  lineWidth: number; // 0.1-5 (0.1 increments) - finer control
  animationSpeed: number; // 0.1-3 (0.1 increments) - from very slow to fast
}

export interface PredefinedTheme {
  id: string;
  name: string;
  description: string;
  isDefault: boolean; // Marks which theme is the system default
  colors: ThemeColors;
  typography: Typography;
  animatedBackground: AnimatedBackgroundSettings;
}

// All predefined/system themes
export const PREDEFINED_THEMES: PredefinedTheme[] = [
  {
    id: "default",
    name: "Default Light",
    description: "Sophisticated light theme inspired by Linear and Vercel",
    isDefault: true,
    colors: {
      // TEXT COLORS - Neutral zinc scale for warmth and sophistication
      textHeading: "#09090B", // Near-black zinc for maximum impact
      textPrimary: "#18181B", // Zinc-900 for body text
      textMuted: "#71717A", // Zinc-500 for secondary content

      // BRAND/ACCENT - Vibrant coral
      accentPrimary: "#FF5F46", // Coral/orange red - energetic and modern

      // ANIMATED BACKGROUND - Deep red particles
      animatedBgColor: "#bd210f", // Darker red for bold presence

      // BACKGROUNDS - Pure white with warm neutral secondary
      bgPrimary: "#FFFFFF", // Pure white for maximum clarity
      bgSecondary: "#FAFAFA", // Neutral-50 for subtle elevation

      // UI ELEMENTS - Delicate neutral borders
      border: "#E4E4E7", // Zinc-200 for refined separation

      // STATUS COLORS - Vibrant and clear
      success: "#22C55E", // Green-500
      successHover: "#DCFCE7", // Green-100
      error: "#EF4444", // Red-500
      errorHover: "#FEE2E2", // Red-100
      info: "#2c76af", // Blue (matches accent)
      infoHover: "#DBEAFE", // Blue-100
      warning: "#F59E0B", // Amber-500
      warningHover: "#FEF3C7", // Amber-100
    },
    typography: {
      primaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 25,
      connectionDistance: 80,
      particleOpacity: 0.1,
      lineOpacity: 0.5,
      particleSize: 1.5,
      lineWidth: 1.2,
      animationSpeed: 1.1,
    },
  },
  {
    id: "default-dark",
    name: "Default Dark",
    description: "Elegant dark theme inspired by Linear and GitHub",
    isDefault: false,
    colors: {
      // TEXT COLORS - High contrast on true dark
      textHeading: "#FAFAFA", // Neutral-50 for crisp headings
      textPrimary: "#E4E4E7", // Zinc-200 for readable body text
      textMuted: "#A1A1AA", // Zinc-400 for subtle secondary content

      // BRAND/ACCENT - Lighter blue for dark backgrounds
      accentPrimary: "#66abd6", // Light blue - readable on dark

      // ANIMATED BACKGROUND - Subtle blue glow
      animatedBgColor: "#2c76af", // Ocean blue

      // BACKGROUNDS - True dark with subtle elevation
      bgPrimary: "#09090B", // Zinc-950 - true dark
      bgSecondary: "#18181B", // Zinc-900 - elevated surfaces

      // UI ELEMENTS - Subtle but visible borders
      border: "#27272A", // Zinc-800 for refined separation

      // STATUS COLORS - Vibrant but not harsh
      success: "#22C55E", // Green-500
      successHover: "rgba(34, 197, 94, 0.15)", // Green with opacity
      error: "#EF4444", // Red-500
      errorHover: "rgba(239, 68, 68, 0.15)", // Red with opacity
      info: "#66abd6", // Light blue (matches accent)
      infoHover: "rgba(102, 171, 214, 0.15)", // Blue with opacity
      warning: "#F59E0B", // Amber-500
      warningHover: "rgba(245, 158, 11, 0.15)", // Amber with opacity
    },
    typography: {
      primaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 30,
      connectionDistance: 80,
      particleOpacity: 0.12,
      lineOpacity: 0.08,
      particleSize: 2,
      lineWidth: 1,
      animationSpeed: 0.4,
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Just Do It - Pure black & white",
    isDefault: false,
    colors: {
      // TEXT COLORS - Pure black, bold statements
      textHeading: "#000000", // Pure black - maximum impact
      textPrimary: "#000000", // Pure black - bold and clear
      textMuted: "#000000", // Pure black - no compromise

      // BRAND/ACCENT - Pure black, Nike boldness
      accentPrimary: "#000000", // Pure black - iconic

      // ANIMATED BACKGROUND - Pure black particles
      animatedBgColor: "#000000", // Pure black - bold presence

      // BACKGROUNDS - Pure white, clean power
      bgPrimary: "#FFFFFF", // Pure white - maximum clarity
      bgSecondary: "#FFFFFF", // Pure white - seamless

      // UI ELEMENTS - Minimal gray only where absolutely needed
      border: "#000000ff", // Light gray - subtle definition

      // STATUS COLORS - Pure, bold signals
      success: "#000000", // Black - consistent boldness
      successHover: "#F0F0F0", // Light gray hover
      error: "#000000", // Black - strong signal
      errorHover: "#F0F0F0",
      info: "#000000", // Black - unified
      infoHover: "#F0F0F0",
      warning: "#000000", // Black - clear
      warningHover: "#F0F0F0",
    },
    typography: {
      primaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 55, // Minimal - clean space
      connectionDistance: 65, // Wide open spacing
      particleOpacity: 0.6, // Barely visible - subtle energy
      lineOpacity: 0.6, // Almost invisible - whisper
      particleSize: 4, // Bold when visible
      lineWidth: 2.5, // Strong lines when they appear
      animationSpeed: 1, // Slow, powerful motion
    },
  },

  {
    id: "deep-ocean",
    name: "Deep Ocean Dark",
    description: "Dark depths with bioluminescent cyan accents",
    isDefault: false,
    colors: {
      // TEXT COLORS
      textHeading: "#FFFFFF",
      textPrimary: "#E0F2FE",
      textMuted: "#7DD3FC",

      // BRAND/ACCENT (single color, others auto-derived)
      accentPrimary: "#22D3EE",

      // ANIMATED BACKGROUND
      animatedBgColor: "#22D3EE",

      // BACKGROUNDS (two-tier, others auto-derived)
      bgPrimary: "#0A1929",
      bgSecondary: "#0F2942",

      // UI ELEMENTS
      border: "#0E7490",

      // STATUS COLORS (semantic, not editable in UI)
      success: "#10B981",
      successHover: "rgba(16, 185, 129, 0.2)",
      error: "#F87171",
      errorHover: "rgba(248, 113, 113, 0.2)",
      info: "#60A5FA",
      infoHover: "rgba(96, 165, 250, 0.2)",
      warning: "#FBBF24",
      warningHover: "rgba(251, 191, 36, 0.2)",
    },
    typography: {
      primaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 55, // Fewer particles for deep ocean feel
      connectionDistance: 70, // More distant connections
      particleOpacity: 0.8, // High visibility in deep dark
      lineOpacity: 0.8, // Visible currents
      particleSize: 4, // Larger bioluminescent glow
      lineWidth: 2.5, // Strong visible lines
      animationSpeed: 1.6, // Slow, deep water drift
    },
  },

  {
    id: "crimson",
    name: "Crimson",
    description: "Cinematic dark theme with iconic red accents",
    isDefault: false,
    colors: {
      // TEXT COLORS
      textHeading: "#FFFFFF",
      textPrimary: "#E5E5E5",
      textMuted: "#B3B3B3",

      // BRAND/ACCENT (single color, others auto-derived)
      accentPrimary: "#E50914",

      // ANIMATED BACKGROUND
      animatedBgColor: "#E50914",

      // BACKGROUNDS (two-tier, others auto-derived)
      bgPrimary: "#141414",
      bgSecondary: "#0C0C0C",

      // UI ELEMENTS
      border: "#333333",

      // STATUS COLORS (semantic, not editable in UI)
      success: "#46D369",
      successHover: "rgba(70, 211, 105, 0.2)",
      error: "#E50914",
      errorHover: "rgba(229, 9, 20, 0.2)",
      info: "#64B5F6",
      infoHover: "rgba(100, 181, 246, 0.2)",
      warning: "#F5A623",
      warningHover: "rgba(245, 166, 35, 0.2)",
    },
    typography: {
      primaryFont:
        '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 55, // Moderate density for cinematic feel
      connectionDistance: 65, // Subtle but connected
      particleOpacity: 0.5, // Moderate, cinematic presence
      lineOpacity: 0.8, // Subtle connections
      particleSize: 3, // Medium size
      lineWidth: 2.0, // Elegant lines
      animationSpeed: 0.7, // Smooth, film-like motion
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Dark theme with vibrant green energy",
    isDefault: false,
    colors: {
      // TEXT COLORS
      textHeading: "#FFFFFF",
      textPrimary: "#E5E5E5",
      textMuted: "#B3B3B3",

      // BRAND/ACCENT (single color, others auto-derived)
      accentPrimary: "#1DB954",

      // ANIMATED BACKGROUND
      animatedBgColor: "#1DB954",

      // BACKGROUNDS (two-tier, others auto-derived)
      bgPrimary: "#121212",
      bgSecondary: "#181818",

      // UI ELEMENTS
      border: "#404040",

      // STATUS COLORS (semantic, not editable in UI)
      success: "#1DB954",
      successHover: "rgba(29, 185, 84, 0.2)",
      error: "#E22134",
      errorHover: "rgba(226, 33, 52, 0.2)",
      info: "#509BF5",
      infoHover: "rgba(80, 155, 245, 0.2)",
      warning: "#FFA500",
      warningHover: "rgba(255, 165, 0, 0.2)",
    },
    typography: {
      primaryFont:
        '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 70, // Higher density for energetic feel
      connectionDistance: 60, // Closer connections for energy
      particleOpacity: 0.6, // Good visibility
      lineOpacity: 0.9, // Balanced connections
      particleSize: 3.5, // Medium-large presence
      lineWidth: 2.7, // Visible lines
      animationSpeed: 1.0, // Energetic, music rhythm
    },
  },
];

// Helper functions
export function getDefaultTheme(): PredefinedTheme {
  const defaultTheme = PREDEFINED_THEMES.find((theme) => theme.isDefault);
  if (!defaultTheme) {
    throw new Error("No default theme found in PREDEFINED_THEMES");
  }
  return defaultTheme;
}

export function getThemeById(themeId: string): PredefinedTheme | undefined {
  return PREDEFINED_THEMES.find((theme) => theme.id === themeId);
}

export function getAllPredefinedThemes(): PredefinedTheme[] {
  return PREDEFINED_THEMES;
}
