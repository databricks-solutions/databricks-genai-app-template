/**
 * Detect and parse markdown tables from text to generate visualizations.
 * Ported from server/services/agents/table_parser.py
 */

import { Visualization, TableData, ChartData } from "./types";

/**
 * Strip markdown formatting from text.
 * Removes: **bold**, *italic*, `code`, [links](url), etc.
 */
function stripMarkdown(text: string): string {
  if (!text) return text;

  return text
    // Remove bold/italic: **text** or __text__ or *text* or _text_
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code: `code`
    .replace(/`(.+?)`/g, "$1")
    // Remove links: [text](url) -> text
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    // Remove strikethrough: ~~text~~
    .replace(/~~(.+?)~~/g, "$1")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    .trim();
}

interface TableMatch {
  headers: string[];
  rows: string[][];
  chartType: "line" | "bar";
  xColumn: number;
  yColumn: number;
}

/**
 * Extract all markdown tables from text and generate visualizations.
 * Returns array of Visualization objects compatible with ChartRenderer.
 */
export function detectAndGenerateVisualizations(
  text: string,
): Visualization[] {
  const tables = extractAllTables(text);
  if (tables.length === 0) return [];

  const visualizations: Visualization[] = [];

  for (const table of tables) {
    // Only create visualizations for tables with plottable data
    if (!isPlottable(table)) {
      continue;
    }

    // Create chart visualization
    const chartViz = createChartVisualization(table);
    if (chartViz) {
      visualizations.push(chartViz);
    }
  }

  return visualizations;
}

/**
 * Extract all markdown tables from text.
 */
function extractAllTables(text: string): TableMatch[] {
  const tables: TableMatch[] = [];

  // Regex to match markdown tables
  // Matches: | header | header |
  //          |--------|--------|
  //          | data   | data   |
  const tablePattern = /\|(.+)\|[\s\n]*\|(?:[\-\s:]+\|)+[\s\n]+((?:\|.+\|[\s\n]*)+)/gm;

  let match: RegExpExecArray | null;
  while ((match = tablePattern.exec(text)) !== null) {
    const headerLine = match[1];
    const rowsText = match[2];

    // Extract headers and strip markdown formatting
    const headers = headerLine
      .split("|")
      .map((h) => stripMarkdown(h.trim()))
      .filter((h) => h.length > 0);

    // Extract rows and strip markdown formatting from all cells
    const rows: string[][] = [];
    for (const line of rowsText.trim().split("\n")) {
      if (line.trim()) {
        const cells = line
          .split("|")
          .map((c) => stripMarkdown(c.trim()))
          .filter((c) => c.length > 0);
        if (cells.length > 0) {
          rows.push(cells);
        }
      }
    }

    if (headers.length >= 2 && rows.length > 0) {
      const { chartType, xColumn, yColumn } = inferChartConfig(headers, rows);
      tables.push({ headers, rows, chartType, xColumn, yColumn });
    }
  }

  return tables;
}

/**
 * Infer the best chart type and configuration based on headers and data.
 */
function inferChartConfig(
  headers: string[],
  rows: string[][],
): { chartType: "line" | "bar"; xColumn: number; yColumn: number } {
  if (headers.length < 2 || rows.length === 0) {
    return { chartType: "bar", xColumn: 0, yColumn: 1 };
  }

  // Check if first column contains time-related words
  const firstHeader = headers[0].toLowerCase();
  const timeKeywords = [
    "month",
    "year",
    "date",
    "time",
    "quarter",
    "week",
    "day",
  ];
  const isTimeSeries = timeKeywords.some((keyword) =>
    firstHeader.includes(keyword),
  );

  // Check if first row's first column looks like a date/month
  const firstValue = rows[0]?.[0]?.toLowerCase() || "";
  const monthKeywords = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const looksLikeDate = monthKeywords.some((keyword) =>
    firstValue.includes(keyword),
  );

  // Determine chart type
  const chartType = isTimeSeries || looksLikeDate ? "line" : "bar";

  // Find first numeric column (usually second column)
  let yColumn = 1;
  for (const row of rows) {
    if (row.length > 1) {
      try {
        // Try to parse as number
        const value = row[1].replace(/,/g, "");
        parseFloat(value);
        yColumn = 1;
        break;
      } catch {
        // Try next column
        if (row.length > 2) {
          yColumn = 2;
        }
        break;
      }
    }
  }

  return { chartType, xColumn: 0, yColumn };
}

/**
 * Check if a table contains plottable numeric data.
 */
function isPlottable(table: TableMatch): boolean {
  // Need at least 2 columns and 2 rows to be worth plotting
  if (table.headers.length < 2 || table.rows.length < 2) {
    return false;
  }

  // Check if y-column contains numeric data
  let numericCount = 0;
  for (const row of table.rows) {
    if (row.length > table.yColumn) {
      const value = row[table.yColumn].replace(/,/g, "").trim();
      // Check if it's a number (allow for % signs, currency symbols, etc.)
      const numericValue = value.replace(/[$%,]/g, "");
      if (!isNaN(parseFloat(numericValue)) && isFinite(parseFloat(numericValue))) {
        numericCount++;
      }
    }
  }

  // At least 70% of rows should have numeric data in y-column
  return numericCount / table.rows.length >= 0.7;
}

/**
 * Create a chart visualization from a table.
 */
function createChartVisualization(table: TableMatch): Visualization | null {
  const { headers, rows, chartType, xColumn, yColumn } = table;

  // Extract labels (x-axis values)
  const labels = rows.map((row) => row[xColumn] || "");

  // Extract data (y-axis values)
  const dataPoints: number[] = [];
  for (const row of rows) {
    if (row.length > yColumn) {
      const value = row[yColumn].replace(/[,$%]/g, "").trim();
      const numValue = parseFloat(value);
      dataPoints.push(isNaN(numValue) ? 0 : numValue);
    } else {
      dataPoints.push(0);
    }
  }

  // Build ChartData
  const chartData: ChartData = {
    labels,
    datasets: [
      {
        label: headers[yColumn] || "Value",
        data: dataPoints,
        // Colors will be applied by ChartRenderer from theme
        ...(chartType === "line" ? { tension: 0.3 } : {}),
      },
    ],
  };

  return {
    type: chartType,
    data: chartData,
  };
}
