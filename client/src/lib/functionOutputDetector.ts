/**
 * Detect and parse function call outputs to generate visualizations.
 * Extracts structured data from tool outputs (especially Genie) that may not be formatted as markdown tables.
 */

import { Visualization, Agent, ChartData } from "./types";

interface TableData {
  headers: string[];
  rows: string[][];
}

/**
 * Detect visualizations from function call outputs.
 * Checks if any function calls returned structured data that can be visualized.
 */
export function detectVisualizationsFromFunctionCalls(
  functionCalls: Array<{ name: string; arguments?: any; output?: any }> | undefined,
  agent: Agent | undefined,
): Visualization[] {
  if (!functionCalls || !agent) {
    return [];
  }

  const visualizations: Visualization[] = [];

  for (const fc of functionCalls) {
    if (!fc.output) continue;

    // Check if this is a data-retrieval tool (Genie, KA, etc.)
    const isDataTool = isDataRetrievalTool(fc.name, agent);

    // Try to extract structured data from output
    const tableData = extractStructuredData(fc.output);

    if (tableData && isPlottableData(tableData)) {
      // Determine chart type based on data
      const chartType = inferChartType(tableData.headers, tableData.rows);

      const viz = createVisualizationFromTableData(
        tableData,
        chartType,
        isDataTool,
      );

      if (viz) {
        visualizations.push(viz);
      }
    }
  }

  return visualizations;
}

/**
 * Check if a function call is from a data retrieval tool (Genie, KA, etc.)
 */
function isDataRetrievalTool(functionName: string, agent: Agent): boolean {
  // Check if function name matches any Genie or KA tools
  const dataToolTypes = ["genie-space", "genie", "ka"];

  return agent.tools.some((tool) => {
    // Check by tool type
    if (dataToolTypes.includes(tool.type || "")) {
      return true;
    }

    // Check by name pattern
    const toolIdentifiers = [
      tool.genie_space_id,
      tool.display_name,
      tool.ka_display_name,
    ].filter(Boolean);

    return toolIdentifiers.some(
      (id) => id && functionName.toLowerCase().includes(id.toLowerCase()),
    );
  });
}

/**
 * Extract structured data from various output formats.
 * Handles: arrays of objects, CSV strings, Databricks-specific formats, etc.
 */
function extractStructuredData(output: any): TableData | null {
  // Pattern 1: Array of objects (most common for Genie)
  // Example: [{store: "A", sales: 100}, {store: "B", sales: 200}]
  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];

    if (typeof firstItem === "object" && firstItem !== null) {
      const headers = Object.keys(firstItem);
      if (headers.length === 0) return null;

      const rows = output.map((obj) =>
        headers.map((h) => {
          const val = obj[h];
          return val === null || val === undefined ? "" : String(val);
        }),
      );

      return { headers, rows };
    }
  }

  // Pattern 2: Object with "result" array
  // Example: {result: [{...}, {...}]}
  if (output.result && Array.isArray(output.result)) {
    return extractStructuredData(output.result);
  }

  // Pattern 3: Object with "data" containing columns and rows
  // Example: {data: {columns: ["A", "B"], rows: [[1, 2], [3, 4]]}}
  if (output.data?.columns && output.data?.rows) {
    return {
      headers: output.data.columns.map(String),
      rows: output.data.rows.map((row: any[]) => row.map(String)),
    };
  }

  // Pattern 4: Databricks SQL result format
  // Example: {columns: [...], data: [...]}
  if (output.columns && output.data) {
    const headers = Array.isArray(output.columns)
      ? output.columns.map((col: any) =>
          typeof col === "object" ? col.name || String(col) : String(col),
        )
      : [];

    const rows = Array.isArray(output.data)
      ? output.data.map((row: any) =>
          Array.isArray(row) ? row.map(String) : [String(row)],
        )
      : [];

    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }

  // Pattern 5: CSV string
  // Example: "store,sales\nA,100\nB,200"
  if (typeof output === "string" && output.includes(",") && output.includes("\n")) {
    const lines = output.trim().split("\n");
    if (lines.length < 2) return null;

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));

    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }

  // Pattern 6: Object with "rows" or "data_array"
  if (output.rows || output.data_array) {
    const dataArray = output.rows || output.data_array;
    if (Array.isArray(dataArray) && dataArray.length > 0) {
      return extractStructuredData(dataArray);
    }
  }

  return null;
}

/**
 * Check if table data contains plottable numeric values.
 * Similar to isPlottable in tableDetector.ts but works with extracted data.
 */
function isPlottableData(table: TableData): boolean {
  // Need at least 2 columns and 2 rows
  if (table.headers.length < 2 || table.rows.length < 2) {
    return false;
  }

  // Check each column for numeric data (skip first column which is usually labels)
  for (let colIdx = 1; colIdx < table.headers.length; colIdx++) {
    let numericCount = 0;

    for (const row of table.rows) {
      if (row.length > colIdx) {
        const value = row[colIdx].replace(/[,$%]/g, "").trim();
        if (!isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
          numericCount++;
        }
      }
    }

    // If at least 70% of values in this column are numeric, it's plottable
    if (numericCount / table.rows.length >= 0.7) {
      return true;
    }
  }

  return false;
}

/**
 * Infer the best chart type based on headers and data.
 * Similar logic to tableDetector.ts.
 */
function inferChartType(
  headers: string[],
  rows: string[][],
): "line" | "bar" {
  if (headers.length < 2 || rows.length === 0) {
    return "bar";
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

  // Check if first value looks like a date/month
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

  return isTimeSeries || looksLikeDate ? "line" : "bar";
}

/**
 * Create a visualization from extracted table data.
 */
function createVisualizationFromTableData(
  table: TableData,
  chartType: "line" | "bar",
  isFromDataTool: boolean,
): Visualization | null {
  const { headers, rows } = table;

  // Use first column as x-axis labels
  const labels = rows.map((row) => row[0] || "");

  // Find first numeric column for y-axis (usually column 1)
  let yColumn = 1;
  for (let colIdx = 1; colIdx < headers.length; colIdx++) {
    let numericCount = 0;

    for (const row of rows) {
      if (row.length > colIdx) {
        const value = row[colIdx].replace(/[,$%]/g, "").trim();
        if (!isNaN(parseFloat(value)) && isFinite(parseFloat(value))) {
          numericCount++;
        }
      }
    }

    // If this column is at least 70% numeric, use it
    if (numericCount / rows.length >= 0.7) {
      yColumn = colIdx;
      break;
    }
  }

  // Extract numeric data
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
        ...(chartType === "line" ? { tension: 0.3 } : {}),
      },
    ],
  };

  return {
    type: chartType,
    data: chartData,
  };
}
