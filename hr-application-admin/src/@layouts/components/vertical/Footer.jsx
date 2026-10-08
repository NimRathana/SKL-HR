'use client'

import classnames from 'classnames'
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import StyledFooter from '@layouts/styles/vertical/StyledFooter'
import { useSettings } from '@core/hooks/useSettings'

const Footer = props => {
  const { children, overrideStyles } = props
  const { settings } = useSettings()
  const isContentCompact = settings.contentWidth === 'compact'

  return (
    <StyledFooter
      overrideStyles={overrideStyles}
      isContentCompact={isContentCompact}
      className={classnames(
        verticalLayoutClasses.footer,
        verticalLayoutClasses.footerContentCompact,
        verticalLayoutClasses.footerStatic,
        verticalLayoutClasses.footerDetached,
        'is-full'
      )}
    >
      <div className={verticalLayoutClasses.footerContentWrapper}>{children}</div>
    </StyledFooter>
  )
}

export default Footer
