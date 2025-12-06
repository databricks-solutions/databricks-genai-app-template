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
    description: "Clean light theme with navy and warm neutrals",
    isDefault: false,
    colors: {
      // TEXT COLORS
      textHeading: "#1B3139",
      textPrimary: "#2D4A54",
      textMuted: "#6B7C84",

      // BRAND/ACCENT (single color, others auto-derived)
      accentPrimary: "#1B3139",

      // ANIMATED BACKGROUND
      animatedBgColor: "#1B3139",

      // BACKGROUNDS (two-tier, others auto-derived)
      bgPrimary: "#F9F7F4",
      bgSecondary: "#EEEDE9",

      // UI ELEMENTS
      border: "#B5B3AD",

      // STATUS COLORS (semantic, not editable in UI)
      success: "#10B981",
      successHover: "#D1FAE5",
      error: "#EF4444",
      errorHover: "#FEE2E2",
      info: "#3B82F6",
      infoHover: "#DBEAFE",
      warning: "#F59E0B",
      warningHover: "#FEF3C7",
    },
    typography: {
      primaryFont:
        '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      secondaryFont:
        '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    animatedBackground: {
      particleCount: 60,
      connectionDistance: 65,
      particleOpacity: 0.6,
      lineOpacity: 0.8,
      particleSize: 5,
      lineWidth: 3.8,
      animationSpeed: 1.8,
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
      particleCount: 50, // Minimal - clean space
      connectionDistance: 60, // Wide open spacing
      particleOpacity: 0.6, // Barely visible - subtle energy
      lineOpacity: 0.6, // Almost invisible - whisper
      particleSize: 4, // Bold when visible
      lineWidth: 1.5, // Strong lines when they appear
      animationSpeed: 1, // Slow, powerful motion
    },
  },
  {
    id: "default-dark",
    name: "Default Dark",
    description: "Default dark theme with ocean blue branding",
    isDefault: true,
    colors: {
      // TEXT COLORS
      textHeading: "#FFFFFF",
      textPrimary: "#E5E5E5",
      textMuted: "#B3B3B3",

      // BRAND/ACCENT
      accentPrimary: "#4c809a",

      // ANIMATED BACKGROUND
      animatedBgColor: "#92c6f7",

      // BACKGROUNDS
      bgPrimary: "#141414",
      bgSecondary: "#111922",

      // UI ELEMENTS
      border: "#333333",

      // STATUS COLORS
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
      particleCount: 60,
      connectionDistance: 65,
      particleOpacity: 0.6,
      lineOpacity: 0.8,
      particleSize: 5,
      lineWidth: 3.8,
      animationSpeed: 2.0,
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
