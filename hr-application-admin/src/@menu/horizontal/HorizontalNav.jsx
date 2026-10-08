'use client'

// React Imports
import { useEffect } from 'react'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useMediaQuery from '../hooks/useMediaQuery'
import useHorizontalNav from '../hooks/useHorizontalNav'

// Util Imports
import { horizontalNavClasses } from '../utils/menuClasses'

// Styled Component Imports
import StyledHorizontalNav from './styles/StyledHorizontalNav'

// Default Config Imports
import { defaultBreakpoints, verticalNavToggleDuration } from '../defaultConfigs'

const HorizontalNav = props => {
  const {
    breakpoint = 'lg',
    customBreakpoint,
    transitionDuration = verticalNavToggleDuration, // Keep default for consistency
    breakpoints,
    className,
    customStyles,
    children,
    ...rest
  } = props

  const mergedBreakpoints = { ...defaultBreakpoints, ...breakpoints }

  const {
    updateIsBreakpointReached,
    isBreakpointReached,
    toggleVerticalNav,
    updateTransitionDuration   // Assuming the hook supports this (add if missing)
  } = useHorizontalNav()

  const breakpointReached = useMediaQuery(
    customBreakpoint ?? (breakpoint ? mergedBreakpoints[breakpoint] : breakpoint)
  )

  // UseEffect – update state (including transitionDuration)
  useEffect(() => {
    updateIsBreakpointReached(breakpointReached)
    updateTransitionDuration?.(transitionDuration) // Pass duration to context

    if (!breakpointReached) {
      toggleVerticalNav(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpointReached, transitionDuration, updateIsBreakpointReached, updateTransitionDuration, toggleVerticalNav])

  return (
    <StyledHorizontalNav
      customStyles={customStyles}
      transitionDuration={transitionDuration} 
      className={classnames(
        horizontalNavClasses.root,
        { [horizontalNavClasses.breakpointReached]: isBreakpointReached },
        className
      )}
      {...rest}
    >
      {children}
    </StyledHorizontalNav>
  )
}

export default HorizontalNav