
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import { Visualization } from "@/lib/types";
import { useThemeContext } from "@/contexts/ThemeContext";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

interface ChartRendererProps {
  visualization: Visualization;
}

export function ChartRenderer({ visualization }: ChartRendererProps) {
  const { type, data, options: customOptions } = visualization;
  const { colors, typography } = useThemeContext();

  // Use theme colors directly from context
  const textColor = colors.textPrimary;
  const bgColor = colors.bgElevated || colors.bgSecondary;
  const borderColor = colors.border;

  // Default options with theme support
  const defaultOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: true,
    backgroundColor: "transparent",
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: textColor,
          font: {
            family: typography.fontFamily,
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: bgColor,
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: borderColor,
        borderWidth: 1,
      },
    },
    scales:
      type !== "pie"
        ? {
            x: {
              grid: {
                color: borderColor,
                display: true,
                drawBorder: false,
              },
              ticks: {
                color: textColor,
              },
            },
            y: {
              grid: {
                color: borderColor,
                display: true,
                drawBorder: false,
              },
              ticks: {
                color: textColor,
              },
            },
          }
        : undefined,
  };

  const options = { ...defaultOptions, ...customOptions };

  // Chart colors based on theme
  const chartColors = [
    colors.accentPrimary,
    colors.success,
    colors.info,
    colors.warning,
  ];

  // Enhance data with theme colors if not provided
  const enhancedData =
    type === "table"
      ? data
      : {
          ...data,
          datasets:
            "datasets" in data
              ? data.datasets?.map((dataset, index) => {
                  const color = chartColors[index % chartColors.length];
                  return {
                    ...dataset,
                    borderColor: dataset.borderColor || color,
                    backgroundColor:
                      dataset.backgroundColor ||
                      (type === "line" ? `${color}20` : color),
                  };
                }) || []
              : [],
        };

  const renderChart = () => {
    switch (type) {
      case "line":
        return <Line data={enhancedData as any} options={options} />;
      case "bar":
        return <Bar data={enhancedData as any} options={options} />;
      case "pie":
        return <Pie data={enhancedData as any} options={options} />;
      case "table":
        return <TableRenderer data={data as any} />;
      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  return <div className="w-full">{renderChart()}</div>;
}

interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

function TableRenderer({ data }: { data: TableData }) {
  return (
    <div className="overflow-x-auto rounded-lg">
      <table className="min-w-full divide-y divide-[var(--color-border)]">
        <thead className="bg-[var(--color-bg-tertiary)]">
          <tr>
            {data.headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-xs font-bold text-[var(--color-text-heading)] uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-[var(--color-bg-elevated)] transition-all duration-200"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-[var(--color-text-primary)]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
