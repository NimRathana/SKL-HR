// React Imports
import { useContext } from 'react'

// Context Imports
import { HorizontalMenuContext } from '../horizontal/Menu'

const useHorizontalMenu = () => {
  const context = useContext(HorizontalMenuContext)

  if (context === undefined) {
    throw new Error('HorizontalMenu Component is required!')
  }

  return context
}

export default useHorizontalMenu
