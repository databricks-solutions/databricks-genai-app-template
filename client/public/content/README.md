# Content Files Documentation

This directory contains editable content files for the About page and Customer Stories carousel.

## About Page Content

**File:** `/public/content/about.json`

Edit this file to change:
- Hero title and description
- Section titles, taglines, and content
- Bullet point highlights
- Call-to-action text

## Customer Stories Carousel

**File:** `/public/content/customer-stories.json`

Edit this file to add or modify customer testimonials. Each story includes:
- `company`: Company name
- `logo`: Path to company logo (see below)
- `quote`: Customer testimonial text
- `author`: Name of the person quoted
- `role`: Their job title
- `industry`: Industry sector

### Adding Company Logos

Place company logos in: `/public/logos/`

**Naming convention for customer logos:**
- `customer-[company-name].svg` (e.g., `customer-techcorp.svg`)
- Use SVG format for best quality
- Recommended dimensions: 200x80px or similar aspect ratio
- Use transparent backgrounds

**Current logo references in customer-stories.json:**
1. `/logos/customer-techcorp.svg`
2. `/logos/customer-financefirst.svg`
3. `/logos/customer-healthtech.svg`
4. `/logos/customer-retailmax.svg`
5. `/logos/customer-manufacturing.svg`

### Example Logo Directory Structure

```
/public
  /logos
    customer-techcorp.svg
    customer-financefirst.svg
    customer-healthtech.svg
    customer-retailmax.svg
    customer-manufacturing.svg
    databricks-symbol-color.svg (existing)
```

### Adding Section Images

Place section images in: `/public/images/about/`

**Current image references in about.json:**
1. `genai-architecture.png` - Visual explaining GenAI architecture
2. `agentic-workflow.png` - Diagram of agentic AI workflow
3. `databricks-platform.png` - Databricks platform overview
4. `tools-integration.png` - Tools ecosystem diagram
5. `use-cases.png` - Real-world applications showcase

**Recommended image specifications:**
- Format: PNG or JPG
- Aspect ratio: 4:3
- Dimensions: 1200x900px or higher
- File size: Under 500KB for optimal loading

## Editing Tips

1. **JSON syntax**: Ensure proper JSON formatting (quotes, commas, brackets)
2. **Text length**: Keep quotes under 200 characters for best display
3. **Testing**: After editing, refresh the browser to see changes
4. **Backup**: Keep a copy of original content before major edits

## Carousel Settings

The customer stories carousel:
- Auto-rotates every 5 seconds
- Can be navigated with arrow buttons
- Has dot indicators for manual selection
- Pauses on hover (future enhancement)
- Responsive on all screen sizes
