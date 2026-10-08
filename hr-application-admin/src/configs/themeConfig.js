/*
 * If you change the following items in the config object, you will not see any effect in the local development server
 * as these are stored in the cookie (cookie has the highest priority over the themeConfig):
 * 1. mode
 *
 * To see the effect of the above items, you can click on the reset button from the Customizer
 * which is on the top-right corner of the customizer besides the close button.
 * This will reset the cookie to the values provided in the config object below.
 *
 * Another way is to clear the cookie from the browser's Application/Storage tab and then reload the page.
 */
import primaryColorConfig from "@configs/primaryColorConfig";
const themeConfig = {
  templateName: 'SKL HR', // Template name, can be used in the Logo and other places
  settingsCookieName: 'cookie', // Name of the cookie which will store the user settings
  mode: 'system', // 'light', 'dark'
  layoutPadding: 24, // Common padding for header, content, footer layout components (in px)
  compactContentWidth: 1440, // in px
  disableRipple: false, // true, false
  backgroundDark: '#28243D',
  backgroundDarkBorder: '#312D4B',
  backgroundLight: '#F4F5FA',
  backgroundLightBorder: '#FFFFFF',
  homePageUrl: '/dashboards',
  skin: 'default',
  semiDark: false,
  layout: 'horizontal', // vertical, horizontal
  navbar: {
    type: 'fixed',
    contentWidth: 'compact',
    floating: true, // Navbar overlays content slightly (like a floating card) and may have increased border-radius for a more modern look
    detached: true, 
    blur: true
  },
  contentWidth: 'compact',
  footer: {
    type: 'static',
    contentWidth: 'compact',
    detached: true
  },
  toastPosition: 'top-right',
  direction: 'ltr',
  primaryColor: primaryColorConfig[0].main,
}

export default themeConfig
