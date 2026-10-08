'use client'

import React from 'react'
import StyledHorizontalNavHeader from './styles/StyledHorizontalNavHeader'
import { verticalNavClasses } from '../utils/menuClasses'

const NavHeader = ({ children }) => {
  return <StyledHorizontalNavHeader className={verticalNavClasses.header}>{children}</StyledHorizontalNavHeader>
}

export default NavHeader
