'use client'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from "@core/hooks/useSettings";

const NavToggle = () => {
  // Hooks
  const { toggleVerticalNav, isBreakpointReached } = useVerticalNav()
  const { settings, updateSettings } = useSettings();

  const handleClick = () => {
    if (isBreakpointReached) {
      toggleVerticalNav()
    } else {
      updateSettings({
        layout: settings.layout === 'collapsed' ? 'vertical' : 'collapsed'
      })
    }
  }

  return (
    <>
      {/* Comment following code and uncomment above code in order to toggle menu on desktop screens as well */}
      {/* {isBreakpointReached && <i className='ri-menu-line text-xl cursor-pointer' onClick={handleClick} />} */}
      <i className='ri-menu-line text-xl cursor-pointer' onClick={handleClick} />
    </>
  )
}

export default NavToggle
