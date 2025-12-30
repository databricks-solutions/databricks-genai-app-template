import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  ThemeColors,
  Typography,
  AnimatedBackgroundSettings,
  getDefaultTheme,
} from "@/lib/themes";

interface SavedTheme {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  colors: ThemeColors;
  typography: Typography;
  animatedBackground: AnimatedBackgroundSettings;
  createdAt: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  typography: Typography;
  animatedBackground: AnimatedBackgroundSettings;
  updateColors: (colors: Partial<ThemeColors>) => void;
  updateTypography: (typography: Partial<Typography>) => void;
  updateAnimatedBackground: (settings: Partial<AnimatedBackgroundSettings>) => void;
  resetToDefaults: () => void;
  saveCustomTheme: (name: string, description: string) => string;
  loadTheme: (themeId: string) => void;
  deleteCustomTheme: (themeId: string) => void;
  getCustomThemes: () => SavedTheme[];
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
}

// ============================================================
// COLOR UTILITIES
// ============================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (color: number) => {
    if (percent > 0) {
      return color + (255 - color) * (percent / 100);
    } else {
      return color + color * (percent / 100);
    }
  };
  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

// ============================================================
// DEFAULT THEME
// ============================================================

const DEFAULT_THEME = getDefaultTheme();
const defaultColors: ThemeColors = DEFAULT_THEME.colors;
const defaultTypography: Typography = DEFAULT_THEME.typography;
const defaultAnimatedBackground: AnimatedBackgroundSettings = DEFAULT_THEME.animatedBackground;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function CustomThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [typography, setTypography] = useState<Typography>(defaultTypography);
  const [animatedBackground, setAnimatedBackground] = useState<AnimatedBackgroundSettings>(defaultAnimatedBackground);
  const [isEditMode, setEditMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyColorsToCSS(defaultColors);
    applyTypographyToCSS(defaultTypography);

    // Load saved preferences
    const savedColors = localStorage.getItem("themeColors");
    const savedTypography = localStorage.getItem("themeTypography");
    const savedAnimatedBg = localStorage.getItem("themeAnimatedBackground");

    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        const merged = { ...defaultColors, ...parsed };
        setColors(merged);
        applyColorsToCSS(merged);
      } catch (e) {
        console.error("Failed to parse saved colors:", e);
      }
    } else {
      localStorage.setItem("themeColors", JSON.stringify(defaultColors));
    }

    if (savedTypography) {
      try {
        const parsed = JSON.parse(savedTypography);
        setTypography(parsed);
        applyTypographyToCSS(parsed);
      } catch (e) {
        console.error("Failed to parse saved typography:", e);
      }
    } else {
      localStorage.setItem("themeTypography", JSON.stringify(defaultTypography));
    }

    if (savedAnimatedBg) {
      try {
        setAnimatedBackground(JSON.parse(savedAnimatedBg));
      } catch (e) {
        console.error("Failed to parse saved animated background:", e);
      }
    } else {
      localStorage.setItem("themeAnimatedBackground", JSON.stringify(defaultAnimatedBackground));
    }
  }, []);

  // ============================================================
  // APPLY COLORS TO CSS
  // Simplified: 18 core variables + Tailwind compatibility
  // ============================================================
  const applyColorsToCSS = (c: ThemeColors) => {
    const root = document.documentElement;
    const isLight = isLightColor(c.bgPrimary);

    // ----------------------------------------------------------
    // CORE VARIABLES (18 total)
    // These are the canonical variables to use in components
    // ----------------------------------------------------------

    // Text (3)
    root.style.setProperty("--color-text-heading", c.textHeading);
    root.style.setProperty("--color-text-primary", c.textPrimary);
    root.style.setProperty("--color-text-muted", c.textMuted);

    // Accent (2) - primary + auto-derived secondary
    root.style.setProperty("--color-accent-primary", c.accentPrimary);
    const accentSecondary = adjustBrightness(c.accentPrimary, isLight ? 15 : -20);
    root.style.setProperty("--color-accent-secondary", accentSecondary);

    // Background (4) - primary, secondary + auto-derived tertiary, elevated
    root.style.setProperty("--color-bg-primary", c.bgPrimary);
    root.style.setProperty("--color-bg-secondary", c.bgSecondary);
    const bgTertiary = adjustBrightness(c.bgSecondary, isLight ? -3 : 8);
    root.style.setProperty("--color-bg-tertiary", bgTertiary);
    const bgElevated = isLight ? "#FFFFFF" : adjustBrightness(c.bgSecondary, 15);
    root.style.setProperty("--color-bg-elevated", bgElevated);

    // Border (1)
    root.style.setProperty("--color-border", c.border);

    // Status (4)
    root.style.setProperty("--color-success", c.success);
    root.style.setProperty("--color-error", c.error);
    root.style.setProperty("--color-info", c.info);
    root.style.setProperty("--color-warning", c.warning);

    // Animated background
    const animRgb = hexToRgb(c.animatedBgColor);
    const animColor = animRgb ? `rgba(${animRgb.r}, ${animRgb.g}, ${animRgb.b}, 0.7)` : c.animatedBgColor;
    root.style.setProperty("--color-animated-bg", animColor);

    // ----------------------------------------------------------
    // TAILWIND/SHADCN COMPATIBILITY
    // Map core variables to Tailwind semantic names
    // ----------------------------------------------------------

    // Primary = accent (for buttons, links)
    root.style.setProperty("--color-primary", c.accentPrimary);
    root.style.setProperty("--color-primary-foreground", isLightColor(c.accentPrimary) ? "#1a1a1a" : "#ffffff");

    // Secondary = bg-secondary (for secondary buttons)
    root.style.setProperty("--color-secondary", c.bgSecondary);
    root.style.setProperty("--color-secondary-foreground", c.textPrimary);
    root.style.setProperty("--color-secondary-border", c.border);

    // Foreground/Background (Tailwind defaults)
    root.style.setProperty("--color-foreground", c.textPrimary);
    root.style.setProperty("--color-background", c.bgPrimary);

    // Muted = tertiary bg (for subtle backgrounds)
    root.style.setProperty("--color-muted", bgTertiary);
    root.style.setProperty("--color-muted-foreground", c.textMuted);

    // Accent = secondary bg (for hover states)
    root.style.setProperty("--color-accent", c.bgSecondary);
    root.style.setProperty("--color-accent-foreground", c.textPrimary);

    // Ring = accent (for focus states)
    root.style.setProperty("--color-ring", c.accentPrimary);

    // Destructive = error
    root.style.setProperty("--color-destructive", c.error);

    // ----------------------------------------------------------
    // GLASS EFFECT VARIABLES
    // Semi-transparent backgrounds for modal/popup overlays
    // ----------------------------------------------------------
    const bgRgb = hexToRgb(c.bgPrimary);
    const borderRgb = hexToRgb(c.border);
    if (bgRgb) {
      // Glass background with 95% opacity (high opacity prevents backdrop bleed-through)
      root.style.setProperty("--color-glass-bg", `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.95)`);
    }
    if (borderRgb) {
      // Glass border with 60% opacity
      root.style.setProperty("--color-glass-border", `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, 0.6)`);
    }
    // Backdrop overlay - darker for light themes, lighter for dark themes
    root.style.setProperty("--color-glass-backdrop", isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.6)");
  };

  // ============================================================
  // APPLY TYPOGRAPHY TO CSS
  // Simplified: 3 font variables
  // ============================================================
  const applyTypographyToCSS = (t: Typography) => {
    const root = document.documentElement;

    // 3 canonical font variables
    root.style.setProperty("--font-heading", t.primaryFont);
    root.style.setProperty("--font-body", t.secondaryFont);
    root.style.setProperty("--font-mono", '"JetBrains Mono", "Fira Code", monospace');
  };

  // ============================================================
  // CONTEXT METHODS
  // ============================================================

  const updateColors = (newColors: Partial<ThemeColors>) => {
    const updated = { ...colors, ...newColors };
    setColors(updated);
    applyColorsToCSS(updated);
    localStorage.setItem("themeColors", JSON.stringify(updated));
  };

  const updateTypography = (newTypography: Partial<Typography>) => {
    const updated = { ...typography, ...newTypography };
    setTypography(updated);
    applyTypographyToCSS(updated);
    localStorage.setItem("themeTypography", JSON.stringify(updated));
  };

  const updateAnimatedBackground = (newSettings: Partial<AnimatedBackgroundSettings>) => {
    const updated = { ...animatedBackground, ...newSettings };
    setAnimatedBackground(updated);
    localStorage.setItem("themeAnimatedBackground", JSON.stringify(updated));
  };

  const resetToDefaults = () => {
    setColors(defaultColors);
    setTypography(defaultTypography);
    setAnimatedBackground(defaultAnimatedBackground);
    applyColorsToCSS(defaultColors);
    applyTypographyToCSS(defaultTypography);
    localStorage.removeItem("themeColors");
    localStorage.removeItem("themeTypography");
    localStorage.removeItem("themeAnimatedBackground");
  };

  const saveCustomTheme = (name: string, description: string): string => {
    const themeId = `custom-${Date.now()}`;
    const theme: SavedTheme = {
      id: themeId,
      name,
      description,
      isSystem: false,
      colors,
      typography,
      animatedBackground,
      createdAt: new Date().toISOString(),
    };
    const customThemes = getCustomThemes();
    customThemes.push(theme);
    localStorage.setItem("customThemes", JSON.stringify(customThemes));
    return themeId;
  };

  const loadTheme = (themeId: string) => {
    const customThemes = getCustomThemes();
    const theme = customThemes.find((t) => t.id === themeId);
    if (theme) {
      setColors(theme.colors);
      setTypography(theme.typography);
      setAnimatedBackground(theme.animatedBackground);
      applyColorsToCSS(theme.colors);
      applyTypographyToCSS(theme.typography);
      localStorage.setItem("themeColors", JSON.stringify(theme.colors));
      localStorage.setItem("themeTypography", JSON.stringify(theme.typography));
      localStorage.setItem("themeAnimatedBackground", JSON.stringify(theme.animatedBackground));
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    const customThemes = getCustomThemes();
    const filtered = customThemes.filter((t) => t.id !== themeId);
    localStorage.setItem("customThemes", JSON.stringify(filtered));
  };

  const getCustomThemes = (): SavedTheme[] => {
    try {
      const saved = localStorage.getItem("customThemes");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse custom themes:", e);
    }
    return [];
  };

  if (!mounted) return null;

  return (
    <ThemeContext.Provider
      value={{
        colors,
        typography,
        animatedBackground,
        updateColors,
        updateTypography,
        updateAnimatedBackground,
        resetToDefaults,
        saveCustomTheme,
        loadTheme,
        deleteCustomTheme,
        getCustomThemes,
        isEditMode,
        setEditMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export type { ThemeColors, Typography, AnimatedBackgroundSettings, SavedTheme };
