'use client'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

const NavToggle = () => {
  // Hooks
  const { isBreakpointReached, toggleVerticalNav } = useHorizontalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  return (
    <>
      {/* <i className='ri-menu-line text-xl cursor-pointer' onClick={handleClick} /> */}
      {/* Comment following code and uncomment above code in order to toggle menu on desktop screens as well */}
      {isBreakpointReached && <i className='ri-menu-line text-xl cursor-pointer' onClick={handleClick} />}
    </>
  )
}

export default NavToggle
