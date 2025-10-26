# Brand Customization with Brand.dev

This document explains how to use the brand customization feature to dynamically style your application using brand information from [brand.dev](https://brand.dev).

## Overview

The application supports dynamic brand styling by:

1. Loading brand configuration from a `brand_config.json` file
2. Fetching brand data from brand.dev API
3. Automatically applying colors and logos to the UI

## Quick Start

### Option 1: Use API to Generate Brand Config

Call the backend API to fetch brand styling for any company:

```bash
curl -X POST "http://localhost:8000/api/brand_config" \
  -H "Content-Type: application/json" \
  -d '{"brand_name": "Tesla"}'
```

Save the response to `client/build/brand_config.json` or `client/public/brand_config.json`.

### Option 2: Manual Configuration

Create a `brand_config.json` file:

```json
{
  "brand": {
    "name": "Your Brand",
    "logoUrl": "https://your-logo-url.com/logo.svg",
    "colors": {
      "primary": "#000000",
      "secondary": "#ffffff",
      "accent": "#3b82f6",
      "background": "#ffffff",
      "foreground": "#000000",
      "muted": "#f1f5f9",
      "mutedForeground": "#64748b",
      "border": "#e2e8f0",
      "input": "#e2e8f0",
      "ring": "#3b82f6",
      "destructive": "#ef4444",
      "destructiveForeground": "#ffffff"
    }
  }
}
```

Place it in:

- Development: `client/public/brand_config.json`
- Production: `client/build/brand_config.json`

## Brand.dev API Integration

### Setup

1. Get your API key from [brand.dev](https://brand.dev)
2. Add it to your `.env.local`:

```bash
BRAND_DEV_API_KEY=your_api_key_here
```

### Backend Endpoint

**POST** `/api/brand_config`

Request:

```json
{
  "brand_name": "Tesla"
}
```

Response:

```json
{
  "brand": {
    "name": "Tesla",
    "logoUrl": "https://media.brand.dev/...",
    "colors": {
      "primary": "#040404",
      "secondary": "#e31c35",
      "accent": "#df889c",
      ...
    }
  }
}
```

### Transformation Logic

The backend service (`server/brand_service.py`) automatically:

- Extracts primary, secondary, and accent colors from brand palette
- Selects the most appropriate logo (prefers light mode)
- Generates complementary colors (muted, borders, etc.)
- Calculates contrasting foreground colors
- Returns a complete theme configuration

## Frontend Integration

The frontend automatically:

1. Fetches `/brand_config.json` on load
2. Converts hex colors to HSL format for Tailwind
3. Updates CSS custom properties
4. Stores logo URL and brand name in session storage

### Using Brand Logo in Components

```typescript
import { getBrandLogoUrl, getBrandName } from "@/lib/brandConfig";

const logoUrl = getBrandLogoUrl();
const brandName = getBrandName();

// Use in your component
<img src={logoUrl || "/default-logo.png"} alt={brandName} />;
```

## Hot Style Swapping

To change the brand styling without rebuilding:

1. Generate new brand config:

```bash
curl -X POST "http://localhost:8000/api/brand_config" \
  -H "Content-Type: application/json" \
  -d '{"brand_name": "Apple"}' > client/build/brand_config.json
```

2. Reload the application in the browser

The new styles will be applied immediately!

## Example Brands

Try these popular brands:

- Tesla
- Apple
- Nike
- Spotify
- Netflix
- Google
- Microsoft
- Amazon

## Architecture

```
┌─────────────────┐
│  brand.dev API  │
└────────┬────────┘
         │
         ├─ Fetch brand data
         │
┌────────▼────────┐
│ brand_service.py│
│  - fetch_brand  │
│  - extract      │
│  - transform    │
└────────┬────────┘
         │
         ├─ Generate brand_config.json
         │
┌────────▼────────┐
│  Frontend App   │
│  - Load config  │
│  - Apply styles │
│  - Use logo     │
└─────────────────┘
```

## Files

- `server/brand_service.py` - Brand.dev API integration and transformation
- `client/src/lib/brandConfig.ts` - Frontend brand configuration utilities
- `client/src/App.tsx` - Loads and applies brand config on mount
- `client/public/brand_config.json.template` - Template for manual configuration
- `client/build/brand_config.json.template` - Template for production builds

## Troubleshooting

### Brand config not loading

- Check browser console for fetch errors
- Verify `brand_config.json` exists in correct location
- Check file has valid JSON syntax

### Colors not applying

- Clear browser cache
- Verify CSS custom properties are being set
- Check browser developer tools > Elements > :root styles

### Logo not showing

- Check `logoUrl` in `brand_config.json`
- Verify URL is accessible (check CORS)
- Check sessionStorage for 'brandLogoUrl' key

## Future Enhancements

Planned features:

- Settings UI to change brand from frontend
- Save brand preferences per user
- Multiple brand profiles
- Dark mode support
- Animation theme variants
