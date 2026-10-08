'use client'

import React from 'react'
import classnames from 'classnames'
import StyledHorizontalMenuSection from './styles/StyledHorizontalMenuSection'
import { menuClasses } from '../utils/menuClasses'

const MenuSection = ({ children, label, className, rootStyles, ...rest }) => {
  return (
    <div className={classnames(menuClasses.menuSectionRoot, className)}>
      <StyledHorizontalMenuSection rootStyles={rootStyles} className={menuClasses.menuSection} {...rest}>
        {label && <div className={menuClasses.menuSectionLabel}>{label}</div>}
        <div className={menuClasses.menuSectionContent}>{children}</div>
      </StyledHorizontalMenuSection>
    </div>
  )
}

export default MenuSection
