'use client'

// React Imports
import { createContext, useCallback, useMemo, useState } from 'react'

const VerticalNavContext = createContext({})

export const VerticalNavProvider = ({ children }) => {
  // States
  const [verticalNavState, setVerticalNavState] = useState()

  // Hooks
  const updateVerticalNavState = useCallback(values => {
    setVerticalNavState(prevState => ({
      ...prevState,
      ...values
    }))
  }, [])

  const toggleVerticalNav = useCallback(value => {
    setVerticalNavState(prevState => ({
      ...prevState,
      isToggled: value !== undefined ? Boolean(value) : !Boolean(prevState?.isToggled),
    }))
  }, [])

  const toggleCollapse = useCallback((value) => {
    setVerticalNavState(prev => ({
      ...prev,
      isCollapsed: value !== undefined ? Boolean(value) : !Boolean(prev?.isCollapsed)
    }))
  }, [])

  const verticalNavProviderValue = useMemo(
    () => ({
      ...verticalNavState,
      updateVerticalNavState,
      toggleVerticalNav,
      toggleCollapse
    }),
    [verticalNavState, updateVerticalNavState, toggleVerticalNav, toggleCollapse]
  )

  return <VerticalNavContext.Provider value={verticalNavProviderValue}>{children}</VerticalNavContext.Provider>
}

export default VerticalNavContext
