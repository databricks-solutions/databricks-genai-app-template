"use client";

import React, { useState } from "react";
import {
  X,
  Palette,
  Sparkles,
  Upload,
  Check,
  Layers,
  Trash2,
  Save,
} from "lucide-react";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { PREDEFINED_THEMES } from "@/lib/themes";

// Dev-only logger
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

interface EditModePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditModePanel({ isOpen, onClose }: EditModePanelProps) {
  const {
    colors,
    typography,
    animatedBackground,
    updateColors,
    updateTypography,
    updateAnimatedBackground,
    resetToDefaults,
    saveCustomTheme,
    getCustomThemes,
    deleteCustomTheme,
    loadTheme,
  } = useThemeContext();

  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<
    "predefined" | "customize" | "import"
  >("predefined");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [customThemes, setCustomThemes] = useState(getCustomThemes());

  // Deep equality check for objects
  const isDeepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (
      typeof obj1 !== "object" ||
      typeof obj2 !== "object" ||
      obj1 == null ||
      obj2 == null
    ) {
      return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
        if (!isDeepEqual(obj1[key], obj2[key])) return false;
      } else if (obj1[key] !== obj2[key]) {
        return false;
      }
    }

    return true;
  };

  // Detect which predefined theme is currently active (if any)
  React.useEffect(() => {
    if (!isOpen) return;

    // Refresh custom themes list
    const customThemesList = getCustomThemes();
    setCustomThemes(customThemesList);

    devLog("🎨 Theme detection - Current state:", {
      colors,
      typography,
      animatedBackground,
    });

    // Check if current settings match any predefined theme
    const matchingTheme = PREDEFINED_THEMES.find((theme) => {
      const colorsMatch = isDeepEqual(theme.colors, colors);
      const typographyMatch = isDeepEqual(theme.typography, typography);
      const animatedBgMatch = isDeepEqual(
        theme.animatedBackground,
        animatedBackground,
      );

      devLog(`🎨 Checking theme "${theme.name}":`, {
        colorsMatch,
        typographyMatch,
        animatedBgMatch,
      });

      return colorsMatch && typographyMatch && animatedBgMatch;
    });

    if (matchingTheme) {
      devLog(`✅ Found matching predefined theme: ${matchingTheme.name}`);
      setSelectedTheme(matchingTheme.id);
    } else {
      // Check if it matches a custom theme
      const matchingCustom = customThemesList.find((theme) => {
        return (
          isDeepEqual(theme.colors, colors) &&
          isDeepEqual(theme.typography, typography) &&
          isDeepEqual(theme.animatedBackground, animatedBackground)
        );
      });
      if (matchingCustom) {
        devLog(`✅ Found matching custom theme: ${matchingCustom.name}`);
        setSelectedTheme(matchingCustom.id);
      } else {
        devLog("❌ No matching theme found - settings have been customized");
        setSelectedTheme(null);
      }
    }
  }, [isOpen, colors, typography, animatedBackground]);

  const fontOptions = [
    {
      value:
        '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      label: "Montserrat",
    },
    {
      value:
        '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      label: "DM Sans",
    },
    {
      value:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      label: "Inter",
    },
    {
      value:
        '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      label: "Roboto",
    },
    {
      value:
        '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      label: "Open Sans",
    },
    { value: '"JetBrains Mono", monospace', label: "JetBrains Mono" },
  ];

  const applyTheme = (themeId: string) => {
    const theme = PREDEFINED_THEMES.find((t) => t.id === themeId);
    if (theme) {
      updateColors(theme.colors);
      updateTypography(theme.typography);
      updateAnimatedBackground(theme.animatedBackground);
      setSelectedTheme(themeId);
    }
  };

  const handleSaveTheme = () => {
    if (themeName.trim()) {
      const themeId = saveCustomTheme(
        themeName.trim(),
        themeDescription.trim() || "Custom theme",
      );
      setCustomThemes(getCustomThemes());
      setThemeName("");
      setThemeDescription("");
      // Show success feedback
      alert("Theme saved successfully!");
    }
  };

  const handleDeleteTheme = (themeId: string) => {
    if (confirm("Are you sure you want to delete this theme?")) {
      deleteCustomTheme(themeId);
      setCustomThemes(getCustomThemes());
    }
  };

  const handleLoadCustomTheme = (themeId: string) => {
    loadTheme(themeId);
    setSelectedTheme(themeId);
  };

  const handleGenerateTheme = async () => {
    // Coming soon feature - not yet implemented
    devLog("Generate theme feature coming soon");
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    // Find and set the default theme
    const defaultTheme = PREDEFINED_THEMES.find((t) => t.isDefault);
    if (defaultTheme) {
      setSelectedTheme(defaultTheme.id);
    }
    // Clear any custom theme inputs
    setThemeName("");
    setThemeDescription("");
  };

  if (!isOpen) return null;

  return (
    <div
      className={`
        fixed right-0 top-[var(--header-height)] h-[calc(100vh-var(--header-height))] 
        w-[400px] bg-[var(--color-background)] border-l border-[var(--color-border)]
        shadow-xl z-20 transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "translate-x-full"}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Customize Theme
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab("predefined")}
            className={`flex-1 p-3 text-sm font-medium transition-colors ${
              activeTab === "predefined"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Layers className="h-4 w-4 mx-auto mb-1" />
            Predefined
          </button>
          <button
            onClick={() => setActiveTab("customize")}
            className={`flex-1 p-3 text-sm font-medium transition-colors ${
              activeTab === "customize"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Sparkles className="h-4 w-4 mx-auto mb-1" />
            Customize
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 p-3 text-sm font-medium transition-colors ${
              activeTab === "import"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Upload className="h-4 w-4 mx-auto mb-1" />
            Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Predefined Themes Tab */}
          {activeTab === "predefined" && (
            <div className="space-y-6">
              {/* System Themes */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                  System Themes
                </h3>
                <div className="space-y-3">
                  {PREDEFINED_THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => applyTheme(theme.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${
                          selectedTheme === theme.id
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-muted)]"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[var(--color-foreground)] mb-1">
                            {theme.name}
                          </h4>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {theme.description}
                          </p>
                        </div>
                        {selectedTheme === theme.id && (
                          <Check className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0" />
                        )}
                      </div>

                      {/* Color Preview */}
                      <div className="flex gap-2 mt-3">
                        <div
                          className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                          style={{
                            backgroundColor: theme.colors.accentPrimary,
                          }}
                          title="Primary Accent"
                        />
                        <div
                          className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                          style={{ backgroundColor: theme.colors.bgPrimary }}
                          title="Background Primary"
                        />
                        <div
                          className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                          style={{ backgroundColor: theme.colors.textHeading }}
                          title="Text Heading"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Themes */}
              {customThemes.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                    Custom Themes
                  </h3>
                  <div className="space-y-3">
                    {customThemes.map((theme) => (
                      <div
                        key={theme.id}
                        className={`
                          p-4 rounded-lg border-2 transition-all duration-200
                          ${
                            selectedTheme === theme.id
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-muted)]"
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleLoadCustomTheme(theme.id)}
                          >
                            <h4 className="font-semibold text-[var(--color-foreground)] mb-1">
                              {theme.name}
                            </h4>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {theme.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedTheme === theme.id && (
                              <Check className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTheme(theme.id);
                              }}
                              className="p-1 rounded hover:bg-[var(--color-error-hover)] text-[var(--color-error)] transition-colors"
                              title="Delete theme"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Color Preview */}
                        <div
                          className="flex gap-2 mt-3 cursor-pointer"
                          onClick={() => handleLoadCustomTheme(theme.id)}
                        >
                          <div
                            className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                            style={{
                              backgroundColor: theme.colors.accentPrimary,
                            }}
                            title="Primary Accent"
                          />
                          <div
                            className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                            style={{ backgroundColor: theme.colors.bgPrimary }}
                            title="Background Primary"
                          />
                          <div
                            className="w-8 h-8 rounded-md border border-[var(--color-border)]"
                            style={{
                              backgroundColor: theme.colors.textHeading,
                            }}
                            title="Text Heading"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customize Tab */}
          {activeTab === "customize" && (
            <div className="space-y-6">
              {/* Header with explanation */}
              <div className="bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm rounded-2xl p-4 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-foreground)] font-medium">
                  Simplified Theme Customization
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  Edit core colors below. All other colors (hover states, icons,
                  charts, chat bubbles) are automatically derived for perfect
                  consistency.
                </p>
              </div>

              {/* Text Colors Section */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Text Colors
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  WCAG compliant readable text
                </p>
                <div className="space-y-4">
                  <ColorPicker
                    label="Heading Text"
                    description="Headers, titles - highest contrast"
                    value={colors.textHeading}
                    onChange={(color) => updateColors({ textHeading: color })}
                  />
                  <ColorPicker
                    label="Primary Text"
                    description="Main body text, paragraphs"
                    value={colors.textPrimary}
                    onChange={(color) => updateColors({ textPrimary: color })}
                  />
                  <ColorPicker
                    label="Muted Text"
                    description="Secondary text, captions, timestamps, inactive icons"
                    value={colors.textMuted}
                    onChange={(color) => updateColors({ textMuted: color })}
                  />
                </div>
              </div>

              {/* Brand/Accent Color Section - SINGLE COLOR */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Brand Accent Color
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  Your primary brand color → auto-derives buttons, links, hover
                  states, icons, charts, scrollbar, chat bubbles
                </p>
                <div className="space-y-4">
                  <ColorPicker
                    label="Primary Brand Accent"
                    description="Single color that defines your brand identity"
                    value={colors.accentPrimary}
                    onChange={(color) => updateColors({ accentPrimary: color })}
                  />
                </div>
              </div>

              {/* Animated Background Color Section - SEPARATE FROM BRAND */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Animated Network Background
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  Independent color for animated particles (can be different
                  from your brand color)
                </p>
                <div className="space-y-4">
                  <ColorPicker
                    label="Particle Color"
                    description="Color of the animated network particles and connections"
                    value={colors.animatedBgColor}
                    onChange={(color) =>
                      updateColors({ animatedBgColor: color })
                    }
                  />
                </div>
              </div>

              {/* Background Colors Section - TWO COLORS */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Background Colors
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  Two-tier system → auto-derives input fields, cards, and
                  elevated elements
                </p>
                <div className="space-y-4">
                  <ColorPicker
                    label="Primary Background"
                    description="Main application background"
                    value={colors.bgPrimary}
                    onChange={(color) => updateColors({ bgPrimary: color })}
                  />
                  <ColorPicker
                    label="Secondary Background"
                    description="Sidebar, panels → auto-derives input fields and cards"
                    value={colors.bgSecondary}
                    onChange={(color) => updateColors({ bgSecondary: color })}
                  />
                </div>
              </div>

              {/* UI Elements Section */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  UI Elements
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  Border color (scrollbar and backdrop are auto-derived)
                </p>
                <div className="space-y-4">
                  <ColorPicker
                    label="Border"
                    description="Borders, dividers, separators"
                    value={colors.border}
                    onChange={(color) => updateColors({ border: color })}
                  />
                </div>
              </div>

              {/* Typography Section */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                  Typography
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Primary Font (Headers & Titles)
                    </label>
                    <select
                      value={typography.primaryFont}
                      onChange={(e) =>
                        updateTypography({ primaryFont: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-accent-primary)]/60 focus:shadow-lg transition-all duration-300 text-[var(--color-foreground)]"
                    >
                      {fontOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Secondary Font (Body Text)
                    </label>
                    <select
                      value={typography.secondaryFont}
                      onChange={(e) =>
                        updateTypography({ secondaryFont: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-accent-primary)]/60 focus:shadow-lg transition-all duration-300 text-[var(--color-foreground)]"
                    >
                      {fontOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Animated Background Settings */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                  Animated Background
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)] mb-3">
                  Particle animation settings - expanded ranges for maximum
                  control
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Particle Count (20 - 100)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="20"
                        max="100"
                        step="5"
                        value={animatedBackground.particleCount}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            particleCount: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.particleCount}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Connection Distance (30 - 100)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="30"
                        max="100"
                        step="5"
                        value={animatedBackground.connectionDistance}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            connectionDistance: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.connectionDistance}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Particle Opacity (0.0 - 1.0)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={animatedBackground.particleOpacity}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            particleOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.particleOpacity.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Line Opacity (0.0 - 1.0)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={animatedBackground.lineOpacity}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            lineOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.lineOpacity.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Particle Size (0.5 - 8.0)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={animatedBackground.particleSize}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            particleSize: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.particleSize.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Line Width (0.1 - 5.0)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={animatedBackground.lineWidth}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            lineWidth: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.lineWidth.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Animation Speed (0.1x - 3.0x)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={animatedBackground.animationSpeed}
                        onChange={(e) =>
                          updateAnimatedBackground({
                            animationSpeed: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-[var(--color-muted-foreground)] w-12">
                        {animatedBackground.animationSpeed.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Theme Section */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3 flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Custom Theme
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Theme Name
                    </label>
                    <input
                      type="text"
                      value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      placeholder="My Custom Theme"
                      className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-accent-primary)]/60 focus:shadow-lg transition-all duration-300 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={themeDescription}
                      onChange={(e) => setThemeDescription(e.target.value)}
                      placeholder="A beautiful custom theme"
                      className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-accent-primary)]/60 focus:shadow-lg transition-all duration-300 text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
                    />
                  </div>
                  <Button
                    onClick={handleSaveTheme}
                    disabled={!themeName.trim()}
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Theme
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl p-4 mb-4">
                <p className="text-sm text-[var(--color-muted-foreground)] text-center">
                  🚧 Coming Soon
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] text-center mt-1">
                  Import themes from websites and style guides
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none transition-all duration-300 opacity-50 cursor-not-allowed text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Style Description
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the style you want (e.g., 'Modern and minimalist with blue accents')"
                  disabled
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl resize-none outline-none transition-all duration-300 opacity-50 cursor-not-allowed text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleGenerateTheme}
                disabled
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] opacity-50 cursor-not-allowed"
              >
                Generate Theme (Coming Soon)
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            onClick={handleResetToDefaults}
            className="flex-1"
          >
            Reset to Default
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ColorPickerProps {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({
  label,
  description,
  value,
  onChange,
}: ColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
        {label}
      </label>
      {description && (
        <p className="text-xs text-[var(--color-muted-foreground)] mb-2">
          {description}
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-12 rounded-xl border-2 border-[var(--color-border)] cursor-pointer transition-all duration-200 hover:shadow-md"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-accent-primary)]/60 focus:shadow-lg transition-all duration-300 font-mono text-sm text-[var(--color-foreground)]"
        />
      </div>
    </div>
  );
}
