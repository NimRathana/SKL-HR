"use client";

import { useRef, useState } from "react";

// MUI Imports
import {
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fade,
} from "@mui/material";
import { styled, alpha } from "@mui/material/styles";

// Icon Imports
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import MonitorOutlinedIcon from "@mui/icons-material/MonitorOutlined";

// Custom Hook
import { useSettings } from "@core/hooks/useSettings";

const StyledMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    marginTop: theme.spacing(1),
    minWidth: 160,
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  margin: "4px 8px",
  borderRadius: "var(--mui-shape-borderRadius)",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    color: theme.palette.primary.main,
    "& .MuiListItemIcon-root": {
      color: theme.palette.primary.main,
    },
  },
  "&.Mui-selected": {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    fontWeight: 600,
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.18),
    },
  },
}));

const ModeDropdown = () => {
  const anchorRef = useRef(null);
  const { settings, updateSettings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentMode = settings.mode || "light";

  const handleMenuOpen = () => setMenuOpen(true);
  const handleMenuClose = () => setMenuOpen(false);

  const handleModeSelect = (mode) => {
    updateSettings({ mode });
    handleMenuClose();
  };

  // Define icons for dynamic rendering
  const modeIcons = {
    light: <LightModeOutlinedIcon />,
    dark: <DarkModeOutlinedIcon />,
    system: <MonitorOutlinedIcon />,
  };

  return (
    <>
      <Tooltip title={`${settings.mode || 'light'}`} arrow TransitionComponent={Fade} PopperProps={{ className: 'capitalize' }}>
        <IconButton
          ref={anchorRef}
          onClick={handleMenuOpen}
          size="large"
          sx={{
            color: "text.primary",
            transition: "transform 0.3s ease-in-out",
            "&:hover": { transform: "rotate(15deg)" },
          }}
          aria-label="Select theme mode"
        >
          {modeIcons[currentMode]}
        </IconButton>
      </Tooltip>

      <StyledMenu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={handleMenuClose}
        TransitionComponent={Fade}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <StyledMenuItem
          selected={currentMode === "light"}
          onClick={() => handleModeSelect("light")}
        >
          <ListItemIcon>
            <LightModeOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            sx={{ ml: 2 }}
          >
            Light
          </ListItemText>
        </StyledMenuItem>

        <StyledMenuItem
          selected={currentMode === "dark"}
          onClick={() => handleModeSelect("dark")}
        >
          <ListItemIcon>
            <DarkModeOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            sx={{ ml: 2 }}
          >
            Dark
          </ListItemText>
        </StyledMenuItem>

        <StyledMenuItem
          selected={currentMode === "system"}
          onClick={() => handleModeSelect("system")}
        >
          <ListItemIcon>
            <MonitorOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            sx={{ ml: 2 }}
          >
            System
          </ListItemText>
        </StyledMenuItem>
      </StyledMenu>
    </>
  );
};

export default ModeDropdown;
