'use client'

import classnames from 'classnames'
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import StyledMain from '@layouts/styles/shared/StyledMain'
import { useSettings } from '@core/hooks/useSettings'

const LayoutContent = ({ children }) => {
  const { settings } = useSettings()
  const isContentCompact = settings.contentWidth === 'compact'

  return (
    <StyledMain
      isContentCompact={isContentCompact}
      className={classnames(verticalLayoutClasses.content, verticalLayoutClasses.contentCompact, 'flex-auto is-full')}
    >
      {children}
    </StyledMain>
  )
}

export default LayoutContent
