"use client";

import { createContext, useCallback, useMemo, useState } from "react";

const HorizontalNavContext = createContext({});

export const HorizontalNavProvider = ({ children }) => {
  const [horizontalNavState, setHorizontalNavState] = useState({
    isBreakpointReached: false,
    isToggled: false,
    activeMenu: null,
    isDropdownOpen: false,
  });

  const updateHorizontalNavState = useCallback((values) => {
    setHorizontalNavState((prev) => ({
      ...prev,
      ...values,
    }));
  }, []);

  const updateIsBreakpointReached = useCallback((value) => {
    setHorizontalNavState((prev) => ({
      ...prev,
      isBreakpointReached: Boolean(value),
    }));
  }, []);

  const toggleVerticalNav = useCallback((value) => {
    setHorizontalNavState((prev) => {
      return {
        ...prev,
        isToggled: value !== undefined ? Boolean(value) : !Boolean(prev.isToggled),
      };
    });
  }, []);

  const setActiveMenu = useCallback((menu) => {
    setHorizontalNavState((prev) => ({
      ...prev,
      activeMenu: menu,
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...horizontalNavState,
      updateHorizontalNavState,
      updateIsBreakpointReached,
      toggleVerticalNav,
      setActiveMenu,
    }),
    [
      horizontalNavState,
      updateHorizontalNavState,
      updateIsBreakpointReached,
      toggleVerticalNav,
      setActiveMenu,
    ],
  );

  return (
    <HorizontalNavContext.Provider value={value}>
      {children}
    </HorizontalNavContext.Provider>
  );
};

export default HorizontalNavContext;
