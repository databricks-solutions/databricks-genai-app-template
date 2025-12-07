"use client";

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
  // Theme customization
  colors: ThemeColors;
  typography: Typography;
  animatedBackground: AnimatedBackgroundSettings;

  // Update functions
  updateColors: (colors: Partial<ThemeColors>) => void;
  updateTypography: (typography: Partial<Typography>) => void;
  updateAnimatedBackground: (
    settings: Partial<AnimatedBackgroundSettings>,
  ) => void;
  resetToDefaults: () => void;

  // Theme management
  saveCustomTheme: (name: string, description: string) => string; // Returns theme ID
  loadTheme: (themeId: string) => void;
  deleteCustomTheme: (themeId: string) => void;
  getCustomThemes: () => SavedTheme[];

  // Edit mode
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
}

// Helper functions for color manipulation
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle both #RGB and #RRGGBB formats
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
  return (
    "#" +
    ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
      .toString(16)
      .slice(1)
  );
}

function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // For lightening (percent > 0), move toward white
  // For darkening (percent < 0), move toward black
  const adjust = (color: number) => {
    if (percent > 0) {
      // Lighten: move toward 255
      return color + (255 - color) * (percent / 100);
    } else {
      // Darken: move toward 0
      return color + color * (percent / 100);
    }
  };

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

// Get the default theme from centralized themes file
const DEFAULT_THEME = getDefaultTheme();
const defaultColors: ThemeColors = DEFAULT_THEME.colors;
const defaultTypography: Typography = DEFAULT_THEME.typography;
const defaultAnimatedBackground: AnimatedBackgroundSettings =
  DEFAULT_THEME.animatedBackground;

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
  const [animatedBackground, setAnimatedBackground] =
    useState<AnimatedBackgroundSettings>(defaultAnimatedBackground);
  const [isEditMode, setEditMode] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Always apply defaults first to ensure CSS variables are set
    applyColorsToCSS(defaultColors);
    applyTypographyToCSS(defaultTypography);

    // Load saved theme preferences from localStorage
    const savedColors = localStorage.getItem("themeColors");
    const savedTypography = localStorage.getItem("themeTypography");
    const savedAnimatedBg = localStorage.getItem("themeAnimatedBackground");

    if (savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        // Merge with defaults to ensure all required properties exist
        const mergedColors = { ...defaultColors, ...parsedColors };
        setColors(mergedColors);
        applyColorsToCSS(mergedColors);
      } catch (e) {
        console.error("Failed to parse saved colors:", e);
        // If parsing fails, ensure defaults are applied
        applyColorsToCSS(defaultColors);
      }
    }

    if (savedTypography) {
      try {
        const parsedTypography = JSON.parse(savedTypography);
        setTypography(parsedTypography);
        applyTypographyToCSS(parsedTypography);
      } catch (e) {
        console.error("Failed to parse saved typography:", e);
        // If parsing fails, ensure defaults are applied
        applyTypographyToCSS(defaultTypography);
      }
    }

    if (savedAnimatedBg) {
      try {
        const parsedAnimatedBg = JSON.parse(savedAnimatedBg);
        setAnimatedBackground(parsedAnimatedBg);
      } catch (e) {
        console.error("Failed to parse saved animated background settings:", e);
        // If parsing fails, ensure defaults are applied
        setAnimatedBackground(defaultAnimatedBackground);
      }
    }
  }, []);

  const applyColorsToCSS = (newColors: ThemeColors) => {
    const root = document.documentElement;

    // === CORE COLORS (user-editable) ===

    // TEXT COLORS - Semantic mapping for readability
    root.style.setProperty("--color-text-heading", newColors.textHeading);
    root.style.setProperty("--color-primary-navy", newColors.textHeading); // Legacy
    root.style.setProperty("--db-primary", newColors.textHeading);
    root.style.setProperty("--color-foreground", newColors.textHeading);

    root.style.setProperty("--color-text-primary", newColors.textPrimary);

    root.style.setProperty("--color-text-muted", newColors.textMuted);
    root.style.setProperty("--color-muted-text", newColors.textMuted); // Legacy
    root.style.setProperty("--color-muted-foreground", newColors.textMuted);

    // BRAND/ACCENT PRIMARY - Single source of truth
    root.style.setProperty("--color-accent-primary", newColors.accentPrimary);
    root.style.setProperty("--color-primary", newColors.accentPrimary);
    root.style.setProperty("--color-accent", newColors.accentPrimary);
    root.style.setProperty("--db-accent", newColors.accentPrimary);
    root.style.setProperty("--color-ring", newColors.accentPrimary);

    // BACKGROUNDS - Two-tier system
    root.style.setProperty("--color-bg-primary", newColors.bgPrimary);
    root.style.setProperty("--color-background-1", newColors.bgPrimary); // Legacy
    root.style.setProperty("--db-background", newColors.bgPrimary);
    root.style.setProperty("--color-background", newColors.bgPrimary);

    root.style.setProperty("--color-bg-secondary", newColors.bgSecondary);
    root.style.setProperty("--color-background-2", newColors.bgSecondary); // Legacy
    root.style.setProperty("--db-secondary", newColors.bgSecondary);
    root.style.setProperty("--color-secondary", newColors.bgSecondary);

    // UI BORDER
    root.style.setProperty("--color-border", newColors.border);
    root.style.setProperty("--color-border-gray", newColors.border); // Legacy

    // === AUTO-DERIVED COLORS (for consistency) ===

    // Detect if theme is light or dark based on background
    const isLightTheme = isLightColor(newColors.bgPrimary);

    // ACCENT SECONDARY - Auto-derive lighter/darker shade for hover states
    const accentSecondary = adjustBrightness(
      newColors.accentPrimary,
      isLightTheme ? 10 : -15,
    );
    root.style.setProperty("--color-accent-secondary", accentSecondary);

    // ANIMATED BACKGROUND PARTICLES - Use separate color for particles
    const animRgb = hexToRgb(newColors.animatedBgColor);
    const accentParticles = animRgb
      ? `rgba(${animRgb.r}, ${animRgb.g}, ${animRgb.b}, 0.7)`
      : newColors.animatedBgColor;
    root.style.setProperty("--color-accent-particles", accentParticles);
    root.style.setProperty("--color-animated-bg", accentParticles);

    // BACKGROUND TERTIARY - Auto-derive blend for input fields/cards
    const bgTertiary = isLightTheme
      ? adjustBrightness(newColors.bgSecondary, 3) // Slightly lighter for light themes
      : adjustBrightness(newColors.bgSecondary, 8); // Lighter for dark themes
    root.style.setProperty("--color-bg-tertiary", bgTertiary);
    root.style.setProperty("--color-background-3", bgTertiary); // Legacy
    root.style.setProperty("--color-input", bgTertiary);
    root.style.setProperty("--color-muted", bgTertiary);

    // BACKGROUND ELEVATED - Auto-derive for dropdowns/hover states
    const bgElevated = isLightTheme
      ? "#FFFFFF" // Pure white for light themes
      : adjustBrightness(newColors.bgSecondary, 12); // Lighter shade for dark themes
    root.style.setProperty("--color-bg-elevated", bgElevated);
    root.style.setProperty("--color-white", bgElevated); // Legacy

    // CHAT COLORS - Auto-derive from brand and backgrounds
    root.style.setProperty("--color-chat-user-bg", newColors.accentPrimary); // User = brand
    root.style.setProperty("--color-chat-user", newColors.accentPrimary); // Legacy
    root.style.setProperty("--color-chat-navy", newColors.accentPrimary);

    root.style.setProperty("--color-chat-assistant-bg", bgTertiary); // AI = tertiary bg

    // Chat text = white for dark bubbles, dark for light bubbles
    const chatText = isLightColor(newColors.accentPrimary)
      ? "#1B3139"
      : "#FFFFFF";
    root.style.setProperty("--color-chat-text", chatText);

    // ICON COLORS - Auto-derive from brand and text
    root.style.setProperty("--color-icon-active", newColors.accentPrimary); // Active = brand
    root.style.setProperty("--color-icon-inactive", newColors.textMuted); // Inactive = muted text
    root.style.setProperty("--color-icon-hover", accentSecondary); // Hover = accent secondary

    // CHART COLORS - Auto-derive from brand and status
    root.style.setProperty("--color-chart-primary", newColors.accentPrimary);
    root.style.setProperty("--color-chart-secondary", accentSecondary);
    root.style.setProperty("--color-chart-accent", newColors.success); // Use success green

    // SCROLLBAR - Auto-derive from brand with opacity variants
    root.style.setProperty("--color-scrollbar", newColors.accentPrimary);
    const scrollRgb = hexToRgb(newColors.accentPrimary);
    if (scrollRgb) {
      root.style.setProperty(
        "--color-scrollbar-track",
        `rgba(${scrollRgb.r}, ${scrollRgb.g}, ${scrollRgb.b}, 0.05)`,
      );
      root.style.setProperty(
        "--color-scrollbar-thumb",
        `rgba(${scrollRgb.r}, ${scrollRgb.g}, ${scrollRgb.b}, 0.2)`,
      );
      root.style.setProperty(
        "--color-scrollbar-thumb-hover",
        `rgba(${scrollRgb.r}, ${scrollRgb.g}, ${scrollRgb.b}, 0.3)`,
      );
    }

    // BACKDROP - Fixed semi-transparent black
    root.style.setProperty("--color-backdrop", "rgba(0, 0, 0, 0.5)");

    // === STATUS COLORS (semantic, not editable in UI) ===
    root.style.setProperty("--color-success", newColors.success);
    root.style.setProperty("--color-success-hover", newColors.successHover);

    root.style.setProperty("--color-error", newColors.error);
    root.style.setProperty("--color-destructive", newColors.error); // Legacy
    root.style.setProperty("--color-error-hover", newColors.errorHover);

    root.style.setProperty("--color-info", newColors.info);
    root.style.setProperty("--color-info-hover", newColors.infoHover);

    root.style.setProperty("--color-warning", newColors.warning);
    root.style.setProperty("--color-warning-hover", newColors.warningHover);
  };

  const applyTypographyToCSS = (newTypography: Typography) => {
    const root = document.documentElement;

    // PRIMARY FONT = Headings/Titles (h1, h2, h3, etc.)
    root.style.setProperty("--font-primary", newTypography.primaryFont);
    root.style.setProperty("--db-font-accent", newTypography.primaryFont); // For h1, headings
    root.style.setProperty("--font-heading", newTypography.primaryFont);

    // SECONDARY FONT = Body text, paragraphs, content
    root.style.setProperty("--font-secondary", newTypography.secondaryFont);
    root.style.setProperty("--db-font-primary", newTypography.secondaryFont); // For body text
    root.style.setProperty("--font-sans", newTypography.secondaryFont);
    root.style.setProperty("--font-family", newTypography.secondaryFont); // Backward compatibility - body text
  };

  const updateColors = (newColors: Partial<ThemeColors>) => {
    const updatedColors = { ...colors, ...newColors };
    setColors(updatedColors);
    applyColorsToCSS(updatedColors);
    localStorage.setItem("themeColors", JSON.stringify(updatedColors));
  };

  const updateTypography = (newTypography: Partial<Typography>) => {
    const updatedTypography = { ...typography, ...newTypography };
    setTypography(updatedTypography);
    applyTypographyToCSS(updatedTypography);
    localStorage.setItem("themeTypography", JSON.stringify(updatedTypography));
  };

  const updateAnimatedBackground = (
    newSettings: Partial<AnimatedBackgroundSettings>,
  ) => {
    const updatedSettings = { ...animatedBackground, ...newSettings };
    setAnimatedBackground(updatedSettings);
    localStorage.setItem(
      "themeAnimatedBackground",
      JSON.stringify(updatedSettings),
    );
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

      // Save current settings
      localStorage.setItem("themeColors", JSON.stringify(theme.colors));
      localStorage.setItem("themeTypography", JSON.stringify(theme.typography));
      localStorage.setItem(
        "themeAnimatedBackground",
        JSON.stringify(theme.animatedBackground),
      );
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    const customThemes = getCustomThemes();
    const filteredThemes = customThemes.filter((t) => t.id !== themeId);
    localStorage.setItem("customThemes", JSON.stringify(filteredThemes));
  };

  const getCustomThemes = (): SavedTheme[] => {
    try {
      const saved = localStorage.getItem("customThemes");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse custom themes:", e);
    }
    return [];
  };

  if (!mounted) {
    return null;
  }

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

// Export types for use in other components
export type { ThemeColors, Typography, AnimatedBackgroundSettings, SavedTheme };
