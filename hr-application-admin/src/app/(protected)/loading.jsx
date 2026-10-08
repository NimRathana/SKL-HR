'use client'

import { Box, CircularProgress, Stack } from "@mui/material";
import { useSettings } from "@core/hooks/useSettings";

const Loading = () => {
  const { settings } = useSettings();

  return (
    <Box
      sx={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "auto",
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <Box
          sx={{
            position: "relative",
            width: 40,
            height: 40,
          }}
        >
          {/* Background circle */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={40}
            thickness={4}
            sx={{
              color: () => settings.mode === "light" ? "var(--mui-palette-grey-300)" : "var(--mui-palette-background-paper)",
            }}
          />

          {/* Animated circle */}
          <CircularProgress
            variant="indeterminate"
            disableShrink
            size={40}
            thickness={4}
            sx={{
              animationDuration: "550ms",
              position: "absolute",
              left: 0,
              top: 0,

              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default Loading;
