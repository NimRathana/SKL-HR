import styled from '@emotion/styled'
import { menuClasses } from '../../utils/menuClasses'

const StyledHorizontalMenu = styled.nav`
  display: flex;
  align-items: center;
  width: 100%;
  overflow-x: visible;
  overflow-y: visible;

  & > ul {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    white-space: normal;
  }

  &.${menuClasses.root} {
    ${({ rootStyles }) => rootStyles}
  }
`

export default StyledHorizontalMenu