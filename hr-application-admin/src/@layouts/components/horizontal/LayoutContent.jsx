'use client'

import classnames from 'classnames'
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'
import StyledMain from '@layouts/styles/shared/StyledMain'
import { useSettings } from '@core/hooks/useSettings'

const LayoutContent = ({ children }) => {
  const { settings } = useSettings()
  const isContentCompact = settings.contentWidth === 'compact'

  return (
    <StyledMain
      isContentCompact={isContentCompact}
      className={classnames(
        horizontalLayoutClasses.content, 
        horizontalLayoutClasses.contentCompact, 
        'flex-auto is-full'
      )}
      sx={{
        // Give enough top breathing room now that our layout has a horizontal navigation header
        pt: 6, 
        pb: 6,
        px: { xs: 4, md: 6 }
      }}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent