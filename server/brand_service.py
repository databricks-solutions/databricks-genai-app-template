"""Brand.dev API Integration Service
Fetches brand information and transforms it into application style configuration.
"""

import os
from typing import Any, Dict

import requests
from fastapi import HTTPException


class BrandService:
  """Service for interacting with brand.dev API and transforming brand data."""

  def __init__(self):
    self.api_key = os.getenv('BRAND_DEV_API_KEY', 'brand__G4bnmCKBAXtoGvYMJ8arUS')
    self.base_url = 'https://api.brand.dev/v1'

  def fetch_brand(self, brand_name: str) -> Dict[str, Any]:
    """Fetch brand information from brand.dev API.

    Args:
        brand_name: Name of the brand (e.g., "Tesla", "Apple", "Nike")

    Returns:
        Brand data from brand.dev API

    Raises:
        HTTPException: If API call fails
    """
    url = f'{self.base_url}/brand/retrieve'
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {self.api_key}'}
    params = {'name': brand_name}

    try:
      response = requests.get(url, headers=headers, params=params, timeout=10)
      response.raise_for_status()
      data = response.json()

      if data.get('status') != 'ok':
        raise HTTPException(
          status_code=400, detail=f'Brand.dev API returned status: {data.get("status")}'
        )

      return data
    except requests.exceptions.RequestException as e:
      raise HTTPException(status_code=500, detail=f'Failed to fetch brand data: {str(e)}')

  def extract_brand_config(self, brand_data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform brand.dev response into application brand configuration.

    Args:
        brand_data: Response from brand.dev API

    Returns:
        Brand configuration for the application
    """
    brand = brand_data.get('brand', {})

    # Extract colors
    colors = brand.get('colors', [])
    primary_color = colors[0]['hex'] if len(colors) > 0 else '#000000'
    secondary_color = colors[1]['hex'] if len(colors) > 1 else '#ffffff'
    accent_color = colors[2]['hex'] if len(colors) > 2 else '#3b82f6'

    # Extract logo URL (prefer light mode logo or first logo)
    logos = brand.get('logos', [])
    logo_url = self._select_best_logo(logos)

    # Calculate complementary colors
    foreground = self._get_contrasting_color(primary_color)
    muted = self._lighten_color(primary_color, 0.95)
    muted_foreground = self._lighten_color(primary_color, 0.4)
    border = self._lighten_color(primary_color, 0.9)

    return {
      'brand': {
        'name': brand.get('title', 'Brand'),
        'logoUrl': logo_url,
        'colors': {
          'primary': primary_color,
          'secondary': secondary_color,
          'accent': accent_color,
          'background': '#ffffff',
          'foreground': foreground,
          'muted': muted,
          'mutedForeground': muted_foreground,
          'border': border,
          'input': border,
          'ring': accent_color,
          'destructive': '#ef4444',
          'destructiveForeground': '#ffffff',
        },
      }
    }

  def _select_best_logo(self, logos: list) -> str:
    """Select the best logo from available options.
    Preference: light mode logo > has_opaque_background > first available
    """
    if not logos:
      return 'https://your-logo-url.com/logo.svg'

    # Try to find light mode logo first
    for logo in logos:
      if logo.get('mode') == 'light' and logo.get('type') in ['logo', 'icon']:
        return logo.get('url', '')

    # Fall back to first logo with opaque background
    for logo in logos:
      if logo.get('mode') == 'has_opaque_background':
        return logo.get('url', '')

    # Fall back to first logo
    return logos[0].get('url', 'https://your-logo-url.com/logo.svg')

  def _get_contrasting_color(self, hex_color: str) -> str:
    """Get contrasting color (black or white) for given hex color."""
    # Remove # if present
    hex_color = hex_color.lstrip('#')

    # Convert to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Calculate luminance
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    # Return black for light colors, white for dark colors
    return '#000000' if luminance > 0.5 else '#ffffff'

  def _lighten_color(self, hex_color: str, factor: float) -> str:
    """Lighten a hex color by a given factor (0-1).
    Factor closer to 1 means lighter color.
    """
    # Remove # if present
    hex_color = hex_color.lstrip('#')

    # Convert to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)

    # Lighten each channel
    r = int(r + (255 - r) * factor)
    g = int(g + (255 - g) * factor)
    b = int(b + (255 - b) * factor)

    # Ensure values are in valid range
    r = min(255, max(0, r))
    g = min(255, max(0, g))
    b = min(255, max(0, b))

    # Convert back to hex
    return f'#{r:02x}{g:02x}{b:02x}'

  def get_brand_config(self, brand_name: str) -> Dict[str, Any]:
    """Main method to fetch brand data and return application configuration.

    Args:
        brand_name: Name of the brand

    Returns:
        Brand configuration ready for application use
    """
    brand_data = self.fetch_brand(brand_name)
    return self.extract_brand_config(brand_data)


# Singleton instance
brand_service = BrandService()
