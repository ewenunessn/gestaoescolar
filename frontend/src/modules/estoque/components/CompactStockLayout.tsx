import React from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Typography,
  type ButtonProps,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import StatusIndicator from "../../../components/StatusIndicator";

type Tone = "default" | "success" | "info" | "warning" | "error";

const toneColors: Record<Tone, string> = {
  default: "#64748b",
  success: "#639922",
  info: "#185FA5",
  warning: "#BA7517",
  error: "#E24B4A",
};

const categoryTokens: Record<string, { backgroundColor: string; color: string }> = {
  alimentos: { backgroundColor: "#EAF3DE", color: "#3B6D11" },
  alimento: { backgroundColor: "#EAF3DE", color: "#3B6D11" },
  graos: { backgroundColor: "#EAF3DE", color: "#3B6D11" },
  higiene: { backgroundColor: "#E6F1FB", color: "#185FA5" },
  limpeza: { backgroundColor: "#FAEEDA", color: "#854F0B" },
};

const appendSx = (sx?: SxProps<Theme>) =>
  Array.isArray(sx) ? sx : sx ? [sx] : [];

export interface CompactMetric {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
}

export function CompactMetricsStrip({ metrics }: { metrics: CompactMetric[] }) {
  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: "10px",
        border: "0.5px solid",
        borderColor: "divider",
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: `repeat(${metrics.length}, minmax(0, 1fr))`,
          },
          bgcolor: "background.paper",
        }}
      >
        {metrics.map((metric, index) => {
          const tone = metric.tone ?? "default";

          return (
            <Box
              key={metric.label}
              sx={{
                flex: 1,
                px: { xs: 2, md: 2.5 },
                py: "14px",
                borderLeft:
                  index === 0 ? 0 : "0.5px solid",
                borderLeftColor: "divider",
                borderTop: {
                  xs: index > 1 ? "0.5px solid" : 0,
                  md: 0,
                },
                borderTopColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  mb: "3px",
                  textTransform: "uppercase",
                  display: "block",
                }}
              >
                {metric.label}
              </Typography>
              <Typography
                sx={{
                  color: tone === "default" || tone === "success" || tone === "info" ? "text.primary" : toneColors[tone],
                  fontSize: 22,
                  fontWeight: 500,
                  lineHeight: 1.1,
                }}
              >
                {metric.value}
              </Typography>
              {metric.helper ? (
                <Typography variant="caption" color="text.secondary">
                  {metric.helper}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}

export function CategoryPill({ label }: { label: string }) {
  const token =
    categoryTokens[label.trim().toLowerCase()] ??
    { backgroundColor: "rgba(0,0,0,0.05)", color: "#4b5563" };

  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 21,
        borderRadius: 20,
        bgcolor: token.backgroundColor,
        color: token.color,
        fontSize: 11,
        fontWeight: 500,
        ".MuiChip-label": { px: 1 },
      }}
    />
  );
}

export function DotStatus({
  label,
  tone = "default",
}: {
  label: string;
  tone?: Tone;
}) {
  const statusByTone: Record<Tone, string> = {
    default: "default",
    success: "success",
    info: "info",
    warning: "warning",
    error: "error",
  };

  return <StatusIndicator status={statusByTone[tone]} text={label} size="small" />;
}

export function CompactActionButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      size="small"
      variant="outlined"
      {...props}
      sx={[
        {
          minHeight: 30,
          borderRadius: "6px",
          px: "13px",
          py: "6px",
          textTransform: "none",
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          "&.Mui-disabled": {
            opacity: 0.4,
            cursor: "not-allowed",
          },
        },
        ...appendSx(sx),
      ]}
    />
  );
}
