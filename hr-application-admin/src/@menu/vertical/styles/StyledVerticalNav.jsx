// Third-party Imports
import styled from '@emotion/styled'

// Util Imports
import { verticalNavClasses } from '../../utils/menuClasses'

const StyledVerticalNav = styled.aside`
  position: sticky;
  inset-block-start: 0;
  block-size: 100dvh;
  z-index: 9;

  /* Transition */
  transition-property: inline-size, min-inline-size, margin-inline-start, inset-inline-start, box-shadow;
  transition-duration: ${({ transitionDuration }) => `${transitionDuration}ms`};
  transition-timing-function: ease-in-out;

  /* Width & Min Width & Margin */
  inline-size: ${({ width }) => `${width}px`};
  min-inline-size: ${({ width }) => `${width}px`};

  ${({ collapsedOverlay, hoverExpanded }) =>
    collapsedOverlay && `
      position: fixed;
      inset-block-start: 0;
      inset-inline-start: 0;
      z-index: 1200;
      ${hoverExpanded ? 'box-shadow: var(--mui-customShadows-lg);' : ''}
      transition-duration: 160ms;
      transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
    `}

  /* Toggled */
  &.${verticalNavClasses.breakpointReached} {
    position: fixed;
    block-size: 100%;
    inset-block-start: 0;
    inset-inline-start: ${({ width }) => `-${width}px`};
    z-index: 100;
    margin: 0;
    &.${verticalNavClasses.toggled} {
      inset-inline-start: 0;
    }
  }

  ${({ width, isBreakpointReached }) =>
    !isBreakpointReached &&
    `
    &.${verticalNavClasses.toggled} {
      margin-inline-start: -${width}px;
    }
  `}

  /* User Styles */
  ${({ customStyles }) => customStyles}
`

export default StyledVerticalNav
