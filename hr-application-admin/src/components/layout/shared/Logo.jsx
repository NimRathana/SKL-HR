'use client'

// Third-party Imports
import styled from '@emotion/styled'

// Component Imports
import MaterioLogo from '@core/svg/Logo'

// Config Imports
import themeConfig from '@configs/themeConfig'

const LogoText = styled.span`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.15px;
  text-transform: uppercase;
  margin-inline-start: ${({ $isCollapsed }) => ($isCollapsed ? 0 : '10px')};
  max-width: ${({ $isCollapsed }) => ($isCollapsed ? 0 : '180px')};
  overflow: hidden;
  opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
  transform: ${({ $isCollapsed, theme }) => `translateX(${$isCollapsed ? (theme.direction === 'rtl' ? '8px' : '-8px') : '0'})`};
  white-space: nowrap;
  transition: max-width 160ms cubic-bezier(0.2, 0.8, 0.2, 1), margin 160ms ease-in-out, opacity 120ms ease-in-out, transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
`

const Logo = ({ color, isCollapsed = false }) => {
  return (
    <div className='flex items-center min-bs-[24px]'>
      <MaterioLogo style={{ color: color ?? 'var(--mui-palette-primary-main)' }} className='text-[22px]' />
      <LogoText color={color} $isCollapsed={isCollapsed}>{themeConfig.templateName}</LogoText>
    </div>
  )
}

export default Logo
