// Third-party Imports
import styled from '@emotion/styled'

// Util Imports
import { verticalNavClasses } from '../utils/menuClasses'

const StyledNavHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: ${props => (props.isCollapsed ? 'center' : 'space-between')};
  transition: all 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
`

const NavHeader = ({ children, isCollapsed = false }) => {
  return <StyledNavHeader className={verticalNavClasses.header} isCollapsed={isCollapsed}>
    {children}
  </StyledNavHeader>
}

export default NavHeader
