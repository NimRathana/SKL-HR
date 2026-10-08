"use client";

// React Imports
import { useEffect, useRef } from "react";

// Third-party Imports
import classnames from "classnames";
import styled from "@emotion/styled";

// Component Imports
import LayoutContent from "./components/horizontal/LayoutContent";
import { useSettings } from "@core/hooks/useSettings";
import themeConfig from "@configs/themeConfig";
import StyledHeader from '@layouts/styles/horizontal/StyledHeader'

// Util Imports
import { horizontalLayoutClasses } from "./utils/layoutClasses";

const HorizontalLayout = (props) => {
  const { navbar, footer, navigation, children, overrideStyles } = props;
  const { settings } = useSettings();
  const headerRef = useRef(null)
  // Navbar config
  const navbarConfig = themeConfig.navbar || {}
  const isFixed = navbarConfig.type === 'fixed'
  const isFloating = navbarConfig.floating
  const hasBlur = navbarConfig.blur
  const isContentCompact = settings.contentWidth === "compact";
  // Scroll detection for blur/shadow
  useEffect(() => {
    const handleScroll = () => {
      headerRef.current?.classList.toggle('is-scrolled', window.scrollY > 10)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const StyledCompactWrapper = styled.div`
    width: 100%;
    margin-inline: auto;
    ${({ isContentCompact }) =>
      isContentCompact &&
      `
        max-inline-size: ${themeConfig.compactContentWidth}px;
    `}
  `;

  return (
    <div className={classnames(horizontalLayoutClasses.root, "flex flex-col flex-auto min-w-0 min-h-0")}>
      <StyledHeader
        overrideStyles={overrideStyles}
        isContentCompact={isContentCompact}
        isFloating={isFloating}
        skin={settings.skin || 'default'}
        isBlur={hasBlur}
        isFixed={isFixed}
        isHorizontal={settings.layout == 'horizontal'}
        style={{
          position: isFixed ? 'sticky' : 'relative',
          top: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
          zIndex: 'var(--header-z-index)',
          background: "rgb(var(--mui-palette-background-paperChannel) / 0.85)",
          boxShadow: settings.skin === "bordered" ? "none" : "var(--mui-customShadows-xs)"
        }}
        ref={headerRef}
      >
        {navbar || null}

        <StyledCompactWrapper isContentCompact={isContentCompact}>
          {navigation}
        </StyledCompactWrapper>
      </StyledHeader>
      
      {/* Main */}
      <LayoutContent>{children}</LayoutContent>

      {/* Footer */}
      {footer}
    </div>
  );
};

export default HorizontalLayout;
