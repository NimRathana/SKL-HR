import styled from '@emotion/styled'
import { menuClasses } from '../../utils/menuClasses'

const StyledHorizontalMenuItem = styled.li`
  display: inline-block;
  position: relative;
  margin-block-start: 0;

  > a, > button {
    display: inline-flex;
    align-items: center;
    padding-block: ${({ level = 0 }) => level > 0 ? '8px' : '5px'};
    padding-inline-start: ${({ level = 0 }) => level > 0 ? '14px' : '20px'};
    padding-inline-end: ${({ level = 0 }) => level > 0 ? '14px' : '20px'};
    border-radius: 50px;
    text-decoration: none;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  &:hover > a,
  &:hover > button {
    background-color: var(--mui-palette-action-hover);
  }

  &.${menuClasses.active} > a,
  &.${menuClasses.active} > button {
    background-color: #7C4DFF;
  }

  ${({ menuItemStyles }) => menuItemStyles}
  ${({ rootStyles }) => rootStyles}
`

export default StyledHorizontalMenuItem