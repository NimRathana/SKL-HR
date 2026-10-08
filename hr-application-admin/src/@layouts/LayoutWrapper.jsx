'use client'

import LayoutCustomizerButton from '@components/layout/shared/LayoutCustomizerButton'
import useHorizontalNav from '@menu/hooks/useHorizontalNav'
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'

const LayoutWrapper = ({ verticalLayout, horizontalLayout }) => {
  const { settings } = useSettings()
  const verticalNav = useVerticalNav()
  const horizontalNav = useHorizontalNav()
  const isHorizontalLayout = settings.layout === 'horizontal'
  const activeLayout = isHorizontalLayout ? horizontalLayout : verticalLayout
  const isBreakpointReached = isHorizontalLayout ? horizontalNav.isBreakpointReached : verticalNav.isBreakpointReached

  return (
    <div className='flex flex-col flex-auto'>
      {activeLayout}
      <LayoutCustomizerButton isVisible={!isBreakpointReached} />
    </div>
  )
}

export default LayoutWrapper