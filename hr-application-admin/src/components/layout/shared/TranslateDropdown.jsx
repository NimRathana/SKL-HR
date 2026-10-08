'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// MUI Imports
import {
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fade,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icon Imports
import LanguageOutlinedIcon from '@mui/icons-material/Language';

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

const TranslateDropdown = () => {
  const anchorRef = useRef(null);
  const { i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const supportedLanguages = [
    { code: 'en', label: 'English', icon: '🇺🇸' },
    { code: 'fr', label: 'Français', icon: '🇫🇷' },
    { code: 'km', label: 'ខ្មែរ', icon: '🇰🇭' },
  ];

  const currentLanguage = i18n.language || 'en';

  const handleMenuOpen = () => setMenuOpen(true);
  const handleMenuClose = () => setMenuOpen(false);
  const handleLanguageSelect = (lang) => {
    i18n.changeLanguage(lang);
    handleMenuClose();
  };

  return (
    <>
      <Tooltip
        title={supportedLanguages.find(l => l.code === currentLanguage)?.label || 'Language'}
        arrow
        TransitionComponent={Fade}
      >
        <IconButton
          ref={anchorRef}
          onClick={handleMenuOpen}
          size="large"
          sx={{
            color: 'text.primary',
            transition: 'transform 0.3s ease-in-out',
            '&:hover': { transform: 'rotate(15deg)' },
          }}
          aria-label="Select language"
        >
          <LanguageOutlinedIcon />
        </IconButton>
      </Tooltip>

      <StyledMenu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={handleMenuClose}
        TransitionComponent={Fade}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {supportedLanguages.map((lang) => (
          <StyledMenuItem
            key={lang.code}
            selected={currentLanguage === lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
          >
            <ListItemText
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
              sx={{ ml: 1 }}
            >
              {lang.label}
            </ListItemText>
          </StyledMenuItem>
        ))}
      </StyledMenu>
    </>
  );
};

export default TranslateDropdown;