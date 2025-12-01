# SpatialNetworkBackground Component

A Three.js-powered animated particle network background that simulates traveling through a data constellation in space.

## Features

- 60 animated particles (nodes) with glowing effects
- Dynamic connections between nearby particles (edges)
- Smooth camera movement creating depth and motion
- Fully customizable colors via props
- Performance optimized with reduced motion support
- Theme-ready for easy color customization

## Basic Usage

```tsx
import { SpatialNetworkBackground } from '@/components/background/SpatialNetworkBackground'

<SpatialNetworkBackground
  particleCount={60}
  connectionDistance={60}
  primaryColor="#1B3139"
  secondaryColor="#1B3139"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `particleCount` | `number` | `60` | Number of particles in the network |
| `connectionDistance` | `number` | `60` | Maximum distance for particle connections |
| `primaryColor` | `string` | `"#1B3139"` | Main color for nodes and edges |
| `secondaryColor` | `string` | `"#1B3139"` | Secondary color (reserved for future use) |

## Theme Integration Example

### With Theme Context

```tsx
import { useThemeContext } from '@/contexts/ThemeContext'

function MainContent() {
  const { theme } = useThemeContext()

  return (
    <main>
      <SpatialNetworkBackground
        primaryColor={theme.colors.primary}
        secondaryColor={theme.colors.secondary}
      />
      {/* Your content */}
    </main>
  )
}
```

### With Dark Mode

```tsx
function MainContent() {
  const isDark = useDarkMode()

  return (
    <main className={isDark ? 'dark' : ''}>
      <SpatialNetworkBackground
        primaryColor={isDark ? '#60A5FA' : '#1B3139'}
        secondaryColor={isDark ? '#3B82F6' : '#1B3139'}
      />
    </main>
  )
}
```

## Color Customization

The component accepts any valid CSS hex color:

```tsx
// Databricks Navy Theme (Default)
<SpatialNetworkBackground
  primaryColor="#1B3139"
  secondaryColor="#1B3139"
/>

// Green Theme
<SpatialNetworkBackground
  primaryColor="#10B981"
  secondaryColor="#059669"
/>

// Purple Theme
<SpatialNetworkBackground
  primaryColor="#8B5CF6"
  secondaryColor="#7C3AED"
/>
```

## Performance Notes

- Automatically respects `prefers-reduced-motion` setting
- Pixel ratio capped at 2 for optimal performance
- Renders at 60fps on modern hardware
- Mobile-friendly with appropriate particle counts

## Technical Details

- Built with Three.js
- Custom GLSL shaders for particles and lines
- Additive blending for neon glow effects
- Dynamic color uniforms for theme switching
- Proper cleanup on unmount
