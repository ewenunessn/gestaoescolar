import React from "react";
import { Box, Typography } from "@mui/material";

type NutriLogLogoProps = {
  compact?: boolean;
};

export const NutriLogLogo: React.FC<NutriLogLogoProps> = () => (
  <Box
    aria-label="NutriLog"
    sx={{
      display: "inline-flex",
      alignItems: "center",
      minWidth: 0,
    }}
  >
    <Typography
      component="span"
      sx={{
        display: "block",
        fontSize: "1.04rem",
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: 0,
        color: "text.primary",
        whiteSpace: "nowrap",
      }}
    >
      NutriLog
    </Typography>
  </Box>
);
